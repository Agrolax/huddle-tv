#!/usr/bin/env node
// Turns .tmp/demo/vvd.mov + captions.json (from record.mjs) into .tmp/demo/out/huddle-home-demo.mp4:
// title card, the VVD footage cropped to the TV screen with captions, a "Built on Vega" card, a closing card.
// No audio track content and no music, so there is nothing to license.
import {execFileSync} from 'node:child_process';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, '.tmp/demo');
const WORK = join(OUT, 'work');
mkdirSync(WORK, {recursive: true});
mkdirSync(join(OUT, 'out'), {recursive: true});

const BEDROCK = (process.env.HUDDLE_AI ?? 'mock') === 'bedrock';
const card = (kind, file, ...text) => execFileSync(join(OUT, 'card'), [kind, file, ...text]);
const ff = (...args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], {stdio: ['ignore', 'inherit', 'inherit']});
const sh = cmd => {
  try {
    return execFileSync('bash', ['-lc', `source ~/vega/env >/dev/null 2>&1; ${cmd}`], {cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']});
  } catch (e) {
    return e.stdout?.toString() ?? '';
  }
};

const {liveSeconds, captions} = JSON.parse(readFileSync(join(OUT, 'captions.json'), 'utf8'));

// --- 1. footage: crop the TV screen out of the VVD window, constant 30 fps ------------------------
// The recording is the whole window at 2x with a shadow margin whose size varies. The window is 1160x568 pt:
// a 56 px title bar, then 1920x1080 of TV on the left and the remote on the right. Find the window's corner.
execFileSync('swiftc', ['-O', join(ROOT, 'scripts/demo/bbox.swift'), '-o', join(OUT, 'bbox')]);
ff('-ss', '0.3', '-i', join(OUT, 'vvd.mov'), '-frames:v', '1', join(WORK, 'first.png'));
const [bx, by] = execFileSync(join(OUT, 'bbox'), [join(WORK, 'first.png')], {encoding: 'utf8'}).trim().split(' ').map(Number);
const CROP = process.env.DEMO_CROP ?? `1916:1076:${bx + 2}:${by + 58}`;
console.log(`window corner ${bx},${by}; crop ${CROP}`);
// The TV is shown at 90% on a black 1920x1080 canvas, which leaves a strip under it for the captions.
const live = join(WORK, 'live.mp4');
ff('-i', join(OUT, 'vvd.mov'), '-t', String(liveSeconds), '-vf', `crop=${CROP},scale=1728:972:flags=lanczos,pad=1920:1080:96:0:black,fps=30,format=yuv420p`, '-c:v', 'libx264', '-crf', '17', '-preset', 'fast', '-an', live);

// --- 2. captions as PNG overlays --------------------------------------------------------------------
const inputs = ['-i', live];
const chain = [];
let last = '0:v';
captions.forEach((c, i) => {
  const png = join(WORK, `cap-${i}.png`);
  card('caption', png, c.text);
  inputs.push('-i', png);
  const out = `v${i}`;
  chain.push(`[${last}][${i + 1}:v]overlay=enable='between(t,${c.start.toFixed(2)},${Math.min(c.end, liveSeconds).toFixed(2)})'[${out}]`);
  last = out;
});
const captioned = join(WORK, 'captioned.mp4');
ff(...inputs, '-filter_complex', chain.join(';'), '-map', `[${last}]`, '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-r', '30', captioned);

// --- 3. cards ---------------------------------------------------------------------------------------
const stillToClip = (png, seconds, mp4) =>
  ff('-loop', '1', '-framerate', '30', '-t', String(seconds), '-i', png, '-vf', 'format=yuv420p', '-c:v', 'libx264', '-crf', '18', '-r', '30', mp4);

card('card', join(WORK, 'intro.png'), 'Every night starts with: what should we watch?', 'The Fire TV home screen is built for one viewer.', 'Huddle Home is built for the whole family.');
stillToClip(join(WORK, 'intro.png'), 5, join(WORK, 'intro.mp4'));

const devices = sh('vega device list 2>&1').split('\n').find(l => l.includes('VirtualDevice')) ?? 'VirtualDevice : tv - aarch64 - OS';
const doctor = sh('cd apps/tv && vega project doctor 2>&1').split('\n').find(l => l.includes('critical checks passed'))?.replace(/^[^A-Za-z]+/, '').trim() ?? 'All critical checks passed.';
card(
  'card',
  join(WORK, 'vega.png'),
  'Built on Vega',
  'A React Native for Vega app (SDK 0.24), running on the Vega Virtual Device.',
  '$ vega device list',
  devices.replace(/\s*-\s*amazon-[0-9a-f]+/, '').trim(),
  '$ vega project doctor',
  doctor,
  '$ npm run build:tv',
  'apps/tv/build/aarch64-debug/tv_aarch64.vpkg',
  ...(BEDROCK
    ? ['Amazon Bedrock (Nova) writes Tonight picks, chat answers and quiz questions.', 'tv-focus-kit, our D-pad focus library, is open source (MIT).']
    : ['tv-focus-kit, our D-pad focus library, is open source (MIT).']),
);
stillToClip(join(WORK, 'vega.png'), 10, join(WORK, 'vega.mp4'));

card('card', join(WORK, 'close.png'), 'Huddle Home', 'The Fire TV home screen, rebuilt for the whole family.', 'React Native for Vega · Fire TV track', 'github.com/Agrolax/huddle-tv');
stillToClip(join(WORK, 'close.png'), 4, join(WORK, 'close.mp4'));

// --- 4. join, with a silent audio track so every player is happy ----------------------------------
const parts = ['intro', 'captioned', 'vega', 'close'].map(n => (n === 'captioned' ? captioned : join(WORK, `${n}.mp4`)));
writeFileSync(join(WORK, 'list.txt'), parts.map(p => `file '${p}'`).join('\n'));
const final = join(OUT, 'out/huddle-home-demo.mp4');
ff('-f', 'concat', '-safe', '0', '-i', join(WORK, 'list.txt'), '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', final);

const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', final], {encoding: 'utf8'}));
console.log(`${final}\n${Math.floor(dur / 60)}:${String(Math.round(dur % 60)).padStart(2, '0')} (limit 3:00)`);
if (dur >= 180) console.warn('Over 3:00. Shorten a hold in record.mjs or cut a beat.');
