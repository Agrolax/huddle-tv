import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import type {IncomingMessage, ServerResponse} from 'node:http';
import {BedrockRuntimeClient, InvokeModelCommand} from '@aws-sdk/client-bedrock-runtime';
import type {TonightPick} from '@huddle/shared';

/** Paints one 1280×720 PNG from a text prompt. */
export interface Painter {
  paint(prompt: string, seed: number, signal?: AbortSignal): Promise<Buffer>;
}

export const DEFAULT_ART_MODEL = 'amazon.nova-canvas-v1:0';

/** Amazon Nova Canvas through Bedrock InvokeModel (TEXT_IMAGE). */
export class NovaCanvas implements Painter {
  private readonly client: Pick<BedrockRuntimeClient, 'send'>;
  constructor(private readonly opts: {region: string; model?: string; client?: Pick<BedrockRuntimeClient, 'send'>}) {
    this.client = opts.client ?? new BedrockRuntimeClient({region: opts.region});
  }

  async paint(prompt: string, seed: number, signal?: AbortSignal): Promise<Buffer> {
    const res = await this.client.send(
      new InvokeModelCommand({
        modelId: this.opts.model ?? DEFAULT_ART_MODEL,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          taskType: 'TEXT_IMAGE',
          textToImageParams: {text: prompt, negativeText: NEGATIVE},
          imageGenerationConfig: {numberOfImages: 1, width: 1280, height: 720, quality: 'standard', cfgScale: 6.5, seed},
        }),
      }),
      {abortSignal: signal},
    );
    const body = JSON.parse(new TextDecoder().decode(res.body)) as {images?: string[]; error?: string};
    const image = body.images?.[0];
    if (!image) throw new Error(`Nova Canvas returned no image${body.error ? `: ${body.error}` : ''}`);
    return Buffer.from(image, 'base64');
  }
}

const NEGATIVE = 'text, letters, words, logo, watermark, signature, people, faces, hands, photo, gradient';

/** The scene the Tonight model wrote, in one flat illustration style; never the poster, the title or actors. */
export function artPrompt(pick: Pick<TonightPick, 'title' | 'scene' | 'why'>): string {
  const scene = pick.scene?.trim() || `a cozy setting that fits a family movie night watching ${pick.title}`;
  return `Flat 2D illustration, bold simple shapes, limited warm palette, wide cinematic landscape. ${scene}. No text, no people.`.slice(0, 1000);
}

/** File name for a pick's art: the same pick always maps to the same file. */
export function artKey(pick: Pick<TonightPick, 'title' | 'year'>): string {
  return createHash('sha1').update(`${pick.title.toLowerCase()}|${pick.year ?? ''}`).digest('hex').slice(0, 16);
}

const KEY_PATH = /^\/art\/([0-9a-f]{16})\.png$/;

/**
 * Tonight backdrops on disk, served at `/art/<key>.png`. Each pick is painted
 * once; later requests for the same title reuse the file.
 */
export class ArtStore {
  private readonly inFlight = new Map<string, Promise<string | undefined>>();

  constructor(
    private readonly dir: string,
    private readonly painter: Painter,
    private readonly log: (msg: string, extra?: unknown) => void = () => {},
    private readonly timeoutMs = 30_000,
  ) {}

  /** `/art/<key>.png` once the file exists, or undefined if painting failed. */
  ensure(pick: TonightPick): Promise<string | undefined> {
    const key = artKey(pick);
    const path = `/art/${key}.png`;
    const file = join(this.dir, `${key}.png`);
    if (existsSync(file)) return Promise.resolve(path);
    const running = this.inFlight.get(key);
    if (running) return running;
    const job = (async () => {
      try {
        const png = await this.painter.paint(artPrompt(pick), parseInt(key.slice(0, 6), 16) % 858_993_459, AbortSignal.timeout(this.timeoutMs));
        await mkdir(this.dir, {recursive: true});
        await writeFile(file, png);
        return path;
      } catch (e) {
        this.log(`art for "${pick.title}" failed`, e instanceof Error ? e.message : String(e));
        return undefined;
      } finally {
        this.inFlight.delete(key);
      }
    })();
    this.inFlight.set(key, job);
    return job;
  }

  /** Answers `GET /art/<key>.png`. Returns false for any other request. */
  async serve(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const m = req.method === 'GET' ? KEY_PATH.exec(req.url ?? '') : null;
    if (!m) return false;
    try {
      const png = await readFile(join(this.dir, `${m[1]}.png`));
      res.writeHead(200, {'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable', 'access-control-allow-origin': '*'});
      res.end(png);
    } catch {
      res.writeHead(404);
      res.end();
    }
    return true;
  }
}
