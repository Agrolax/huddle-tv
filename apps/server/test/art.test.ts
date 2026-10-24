import {after, before, describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ArtStore, NovaCanvas, Painter, artKey, artPrompt} from '../src/art.js';
import {parsePicksJson} from '../src/ai/types.js';
import {TestServer, claimTv, startServer} from './helpers.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

class FakePainter implements Painter {
  prompts: string[] = [];
  fail = new Set<string>();
  async paint(prompt: string): Promise<Buffer> {
    this.prompts.push(prompt);
    if ([...this.fail].some(t => prompt.includes(t))) throw new Error('blocked');
    return PNG;
  }
}

describe('Tonight art', () => {
  let dir: string;
  before(async () => {
    dir = await mkdtemp(join(tmpdir(), 'huddle-art-'));
  });
  after(async () => {
    await rm(dir, {recursive: true, force: true});
  });

  it('paints the scene the model wrote, never the title, and asks Nova Canvas for 1280×720', async () => {
    assert.match(artPrompt({title: 'Paddington 2', why: 'x', scene: 'a snowy London street at dusk'}), /^Flat 2D illustration.*a snowy London street at dusk\. No text, no people\.$/);
    const sent: any[] = [];
    const canvas = new NovaCanvas({
      region: 'us-east-1',
      client: {send: async (cmd: any) => (sent.push(cmd.input), {body: new TextEncoder().encode(JSON.stringify({images: [PNG.toString('base64')]}))}) as any},
    });
    assert.deepEqual(await canvas.paint('a lake', 7), PNG);
    assert.equal(sent[0].modelId, 'amazon.nova-canvas-v1:0');
    const body = JSON.parse(sent[0].body);
    assert.equal(body.taskType, 'TEXT_IMAGE');
    assert.deepEqual([body.imageGenerationConfig.width, body.imageGenerationConfig.height, body.imageGenerationConfig.seed], [1280, 720, 7]);
  });

  it('reads the scene from the Tonight JSON', () => {
    const [pick] = parsePicksJson('{"picks":[{"title":"Up","year":2009,"why":"Fun for all","scene":"balloons over green hills"}]}');
    assert.equal(pick!.scene, 'balloons over green hills');
  });

  it('paints each pick once, serves the file, and gives up quietly on a failure', async () => {
    const painter = new FakePainter();
    const store = new ArtStore(dir, painter);
    const up = {title: 'Up', year: 2009, why: 'x'};
    const [a, b] = await Promise.all([store.ensure(up), store.ensure(up)]);
    assert.equal(a, `/art/${artKey(up)}.png`);
    assert.equal(b, a);
    assert.equal(await store.ensure(up), a);
    assert.equal(painter.prompts.length, 1);

    painter.fail.add('Coco');
    assert.equal(await store.ensure({title: 'Coco', why: 'x'}), undefined);

    const http = createServer(async (req, res) => {
      if (!(await store.serve(req, res))) res.writeHead(418).end();
    });
    await new Promise<void>(r => http.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
    const ok = await fetch(base + a);
    assert.equal(ok.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await ok.arrayBuffer()), PNG);
    assert.equal((await fetch(`${base}/art/0000000000000000.png`)).status, 404);
    assert.equal((await fetch(`${base}/art/../secrets.png`)).status, 418);
    await new Promise<void>(r => http.close(() => r()));
  });

  describe('over the wire', () => {
    let server: TestServer;
    let painter: FakePainter;
    before(async () => {
      painter = new FakePainter();
      server = await startServer({art: new ArtStore(join(dir, 'wire'), painter)});
    });
    after(() => server.close());

    it('sends picks first, then again with a backdrop for each one that painted', async () => {
      const {tv} = await claimTv(server.url, 'art-1');
      tv.send('tonight:request', {mood: 'cozy'});
      const first = (await tv.nextOf('tonight:picks')).payload;
      assert.ok(first.picks.every((p: {image?: string}) => !p.image));
      let latest = first;
      while (latest.picks.some((p: {image?: string}) => !p.image)) latest = (await tv.nextOf('tonight:picks')).payload;
      assert.equal(latest.at, first.at);
      assert.ok(latest.picks.every((p: {image: string}) => /^\/art\/[0-9a-f]{16}\.png$/.test(p.image)));
      assert.deepEqual(server.hub.household('art-1')!.tonight!.picks.map(p => p.image), latest.picks.map((p: {image: string}) => p.image));
      tv.close();
    });
  });
});
