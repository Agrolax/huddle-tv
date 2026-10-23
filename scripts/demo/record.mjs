#!/usr/bin/env node
// One-command demo recording for the Huddle Home submission video.
//
//   node scripts/demo/record.mjs            record the VVD and assemble .tmp/demo/out/huddle-home-demo.mp4
//   node scripts/demo/record.mjs --dry      walk the same script, save a screenshot per beat, no recording
//   HUDDLE_AI=bedrock node scripts/demo/record.mjs   live Amazon Nova (needs `aws login` first)
//
// What it drives: the TV app on the Vega Virtual Device (remote presses through inputd-cli), and
// scripted phones that speak the real household protocol. macOS only (screencapture, Vision, AppKit).
// Before you run it: `source ~/vega/env`, VVD running, `npm run build:tv && npm run tv:install`.
import {execFile, spawn, execFileSync} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, createWriteStream} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Phone, CAT_BEAR, sleep} from './phones.mjs';

const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, '.tmp/demo');
const DRY = process.argv.includes('--dry');
const AI = process.env.HUDDLE_AI ?? 'mock';
// Server local time decides "Ends by". The VVD clock is UTC and cannot be changed (FL-13), so run the
// server a few hours east of UTC: late enough that the 8:30 bedtime is inside the 6 hour planning window.
const SERVER_TZ = process.env.DEMO_TZ ?? 'Etc/GMT-4';
// screencapture only writes the file when its own timer ends (SIGINT discards it), so give it room and trim later.
const REC_SECONDS = 200;
const HOLD = DRY ? 0.35 : 1; // scale every hold in dry runs

const env = {...process.env, PATH: `${process.env.HOME}/vega/bin:${process.env.PATH}`};
const serial = 'emulator-5554';
const sh = (cmd, opts = {}) => run('bash', ['-lc', `source ~/vega/env >/dev/null 2>&1; ${cmd}`], {cwd: ROOT, env, ...opts});

mkdirSync(join(OUT, 'dry'), {recursive: true});
mkdirSync(join(OUT, 'out'), {recursive: true});

// --- remote ------------------------------------------------------------------

let shotN = 0;
async function press(...keys) {
  const cmd = keys.map(k => `inputd-cli button_press ${k}; sleep 0.45`).join('; ');
  await sh(`vega exec vda -s ${serial} shell "${cmd}"`);
}
async function shot(label) {
  if (!DRY) return;
  const file = join(OUT, 'dry', `${String(++shotN).padStart(2, '0')}-${label}.png`);
  await sh(`SETTLE=0.5 scripts/vvd-capture.sh ${file}`);
}
async function windowId() {
  const swift = `import CoreGraphics
let l = CGWindowListCopyWindowInfo([.optionAll], kCGNullWindowID) as! [[String: Any]]
for w in l where (w[kCGWindowName as String] as? String) == "Vega Virtual Device" { print(w[kCGWindowNumber as String] as! Int); break }`;
  const {stdout} = await run('swift', ['-e', swift]);
  return stdout.trim();
}

// --- captions ----------------------------------------------------------------

const captions = []; // {start, end, text}  seconds from the start of the recording
let t0 = Date.now();
const now = () => (Date.now() - t0) / 1000;
async function beat(text, minSeconds, fn) {
  const start = now();
  if (text) console.log(`[${start.toFixed(1)}s] ${text}`);
  await fn?.();
  const left = start + minSeconds * HOLD - now();
  if (left > 0) await sleep(left * 1000);
  if (text) captions.push({start, end: now(), text});
}

// --- run ---------------------------------------------------------------------

async function startServer() {
  await sh(`pkill -f 'tsx.*src/index.ts'; pkill -f 'npm run dev:server'; true`);
  await sleep(800);
  const log = createWriteStream(join(OUT, 'server.log'));
  const p = spawn('npm', ['run', 'dev:server'], {cwd: ROOT, env: {...env, TZ: SERVER_TZ, HUDDLE_AI: AI, AWS_REGION: process.env.AWS_REGION ?? 'us-east-1'}, stdio: ['ignore', 'pipe', 'pipe']});
  p.stdout.pipe(log);
  p.stderr.pipe(log);
  p.unref();
  for (let i = 0; i < 40; i++) {
    if (existsSync(join(OUT, 'server.log')) && readFileSync(join(OUT, 'server.log'), 'utf8').includes('listening')) return;
    await sleep(250);
  }
  throw new Error('server did not start; see .tmp/demo/server.log');
}

async function launchTv() {
  await sh(`cd apps/tv && vega device terminate-app --dir . ; sleep 2; vega device launch-app --dir .`);
  for (let i = 0; i < 60; i++) {
    if (/tv .* joined/.test(readFileSync(join(OUT, 'server.log'), 'utf8'))) return;
    await sleep(500);
  }
  throw new Error('the TV app never joined the server. Rebuild with `npm run build:tv && npm run tv:install` (the server URL is baked in at build time)');
}

async function readPairCode() {
  const file = join(OUT, 'qr.png');
  await sh(`SETTLE=0.4 scripts/vvd-capture.sh ${file}`);
  const {stdout} = await sh(`${join(OUT, 'qr')} ${file}`);
  const m = stdout.match(/[?&]c=([A-Z0-9]+)/);
  if (!m) throw new Error('no QR code on screen: is the Connect phone sheet open?');
  return m[1];
}

/** Tomorrow at `hour` o'clock in the server's timezone (Etc/GMT-N zones only; anything else uses this machine's). */
function tomorrowAt(hour) {
  const m = SERVER_TZ.match(/^Etc\/GMT([+-])(\d+)$/);
  const offsetH = m ? -Number(m[1] + m[2]) : null; // Etc/GMT-4 is UTC+4
  if (offsetH === null) {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, hour).toISOString();
  }
  const local = new Date(Date.now() + offsetH * 3_600_000); // read with the UTC getters
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1, hour - offsetH)).toISOString();
}

function serverUrl() {
  const cfg = readFileSync(join(ROOT, 'apps/tv/src/config.generated.ts'), 'utf8');
  return cfg.match(/SERVER_URL = "([^"]+)"/)[1];
}

async function main() {
  // tools
  await run('swiftc', ['-O', join(ROOT, 'scripts/demo/card.swift'), '-o', join(OUT, 'card')]);
  await run('swiftc', ['-O', join(ROOT, 'scripts/demo/qr.swift'), '-o', join(OUT, 'qr')]);

  await startServer();
  await launchTv();
  await sleep(2500);
  const wsUrl = serverUrl();
  const winId = await windowId();
  if (!winId) throw new Error('Vega Virtual Device window not found. Start it: vega virtual-device start');

  // The four phones in the story. Ammu is not on the couch; she joins from the kitchen.
  let phones = {};
  const joinAll = async code => {
    phones.ammu = await Phone.join(wsUrl, code, 'ammu', "Ammu's phone");
    phones.nanu = await Phone.join(wsUrl, code, 'nanu', "Nanu's phone");
    phones.rafi = await Phone.join(wsUrl, code, 'rafi', "Rafi's phone");
  };

  // recording
  let rec = null;
  const recFile = join(OUT, 'vvd.mov');
  if (!DRY) {
    rmSync(recFile, {force: true});
    rec = spawn('screencapture', ['-x', '-v', '-V', String(REC_SECONDS), '-l', winId, recFile], {stdio: 'ignore'});
    await sleep(1200);
  }
  t0 = Date.now() - (DRY ? 0 : 400); // screencapture's first frame lands a moment after the process starts

  // 1. Who's here
  await shot('whos-here');
  await beat("Who's on the couch? Rafi and Nanu pick themselves with the remote.", 6, async () => {
    await sleep(1500);
    await press('KEY_RIGHT', 'KEY_LEFT');
  });
  await press('KEY_DOWN', 'KEY_ENTER');
  await sleep(1200);

  // 2. Home, live
  await shot('home');
  await beat('Live weather, family calendar and home devices. Every tile takes the D-pad.', 9, async () => {
    await press('KEY_RIGHT', 'KEY_RIGHT');
    await press('KEY_DOWN', 'KEY_LEFT');
    await press('KEY_LEFT');
  });

  // 3. Phone joins by QR
  await shot('tonight-tile');
  await press('KEY_UP', 'KEY_UP', 'KEY_ENTER');
  await sleep(2200);
  await shot('connect');
  let code = null;
  await beat('Any phone joins with a QR code. No app to install.', 6, async () => {
    code = await readPairCode();
    await joinAll(code);
  });
  await shot('connected');
  await press('KEY_BACK');
  await beat("Ammu, in the kitchen, sends a message. The TV shows it.", 6, async () => {
    phones.ammu.send('message:send', {text: 'Pizza night at 7!', fromProfileId: 'ammu'});
  });
  await shot('toast');
  await beat('She adds swim class to the family calendar...', 5, async () => {
    phones.ammu.send('calendar:add', {title: 'Swim class', start: tomorrowAt(12), profileIds: ['rafi']});
    await press('KEY_DOWN', 'KEY_RIGHT');
  });
  await shot('calendar-added');
  await beat('...and turns the lamp off. The TV updates live.', 5, async () => {
    phones.ammu.send('smart-home:set', {deviceId: 'living-lamp', on: false});
    await press('KEY_RIGHT', 'KEY_DOWN');
  });
  await shot('lamp-off');

  // 4. Tonight and the secret vote
  await press('KEY_LEFT', 'KEY_LEFT', 'KEY_ENTER');
  await beat(AI === 'bedrock' ? "Amazon Bedrock picks for who's here. It's Rafi's bedtime: nothing runs long." : "Picks for who's here. It's Rafi's bedtime, so nothing runs long.", 7, async () => {
    await sleep(2000);
  });
  await shot('tonight-sheet');
  await press('KEY_DOWN', 'KEY_ENTER');
  await sleep(1200);
  await shot('vote-open');
  await beat('Everyone votes in secret on their phone. The TV shows who voted, never how.', 7, async () => {
    const v = await phones.ammu.untilVote(x => x.phase === 'voting');
    const ballots = {ammu: [0, 1], nanu: [0, 2], rafi: [0, 1]};
    await sleep(1400);
    for (const [who, yes] of Object.entries(ballots)) {
      phones[who].send('tonight:vote', {voteId: v.voteId, yes});
      await sleep(1700);
    }
  });
  await shot('vote-progress');
  await beat('Only the pick everyone accepted comes up.', 5, async () => {
    const v = phones.ammu.vote;
    if (v?.phase === 'voting') phones.ammu.send('tonight:vote-next', {voteId: v.voteId});
    await sleep(800);
  });
  await shot('vote-result');
  await press('KEY_BACK');
  await sleep(800);

  // 5. Household quiz
  await press('KEY_RIGHT', 'KEY_ENTER');
  await sleep(1200);
  await shot('game-menu');
  await press('KEY_ENTER');
  await beat('Game night is about your family. The quiz asks about your own week.', 8, async () => {
    await phones.ammu.untilGame(g => g.phase === 'question');
    await sleep(1800);
    const g = phones.ammu.game;
    const picks = {ammu: 1, nanu: 0, rafi: 2};
    for (const [who, choice] of Object.entries(picks)) {
      phones[who].send('game:answer', {gameId: g.gameId, round: g.round, choice});
      await sleep(900);
    }
  });
  await shot('quiz-question');
  await beat('Phones tap A to D. Points go up with speed.', 5, async () => {
    phones.ammu.send('game:next', {gameId: phones.ammu.game.gameId});
  });
  await shot('quiz-reveal');
  // fast-forward the other rounds, answering quickly
  await beat('Five questions, all from your own calendar, messages and home.', 8, async () => {
    for (let r = 2; r <= phones.ammu.game.rounds; r++) {
      phones.ammu.send('game:next', {gameId: phones.ammu.game.gameId});
      await phones.ammu.untilGame(g => g.phase === 'question' && g.round === r);
      const g = phones.ammu.game;
      phones.rafi.send('game:answer', {gameId: g.gameId, round: r, choice: r % 4});
      phones.nanu.send('game:answer', {gameId: g.gameId, round: r, choice: (r + 1) % 4});
      phones.ammu.send('game:answer', {gameId: g.gameId, round: r, choice: (r + 2) % 4});
      await sleep(500);
      phones.ammu.send('game:next', {gameId: g.gameId});
      await sleep(600);
    }
  });
  await beat('A family league carries across nights.', 4, async () => {
    phones.ammu.send('game:next', {gameId: phones.ammu.game.gameId});
    await sleep(800);
  });
  await shot('quiz-final');

  // 6. Sketch the pick
  await press('KEY_BACK');
  await sleep(600);
  await press('KEY_ENTER');
  await sleep(900);
  await shot('game-menu-2');
  await press('KEY_RIGHT', 'KEY_RIGHT');
  await shot('game-menu-sketch-focus');
  await press('KEY_ENTER');
  await beat('Or draw the movie. One phone is the pen, the others guess.', 12, async () => {
    const g = await phones.ammu.untilGame(x => x.kind === 'sketch' && x.phase === 'question');
    const drawer = Object.values(phones).find(p => p.profileId === g.drawerId);
    const guessers = Object.values(phones).filter(p => p !== drawer);
    await sleep(800);
    const title = (await drawer.waitFor(f => f.type === 'sketch:prompt', 5000).catch(() => null))?.payload.prompt ?? drawer.prompt?.prompt;
    for (let i = 0; i < CAT_BEAR.length; i++) {
      await drawer.drawStroke(g.gameId, g.round, `s${i}`, CAT_BEAR[i].color, CAT_BEAR[i].pts);
    }
    await sleep(500);
    guessers[0].send('sketch:guess', {gameId: g.gameId, round: g.round, text: 'a dog'});
    await sleep(1200);
    guessers[1].send('sketch:guess', {gameId: g.gameId, round: g.round, text: title ?? 'Paddington 2'});
    await sleep(900);
  });
  await shot('sketch');
  await beat('The game ends on the decision: the last movie drawn is tonight\'s pick.', 6, async () => {
    const g = phones.ammu.game;
    phones.ammu.send('game:end', {gameId: g.gameId});
    await sleep(600);
    await press('KEY_BACK');
  });
  await shot('home-pick');

  // end of live footage
  await sleep(500);
  const liveSeconds = now();
  if (rec) {
    console.log(`Waiting for screencapture to finish its ${REC_SECONDS}s window...`);
    await new Promise(resolve => rec.on('exit', resolve));
  }
  Object.values(phones).forEach(p => p.close());
  writeFileSync(join(OUT, 'captions.json'), JSON.stringify({liveSeconds, captions}, null, 2));
  console.log(`\nLive footage ${liveSeconds.toFixed(1)}s, ${captions.length} captions.`);
  if (!DRY) console.log('Next: node scripts/demo/assemble.mjs');
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
