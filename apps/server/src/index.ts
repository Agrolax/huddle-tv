import {createServer} from 'node:http';
import {WebSocketServer} from 'ws';
import {createAI} from './ai/index.js';
import {Hub} from './hub.js';
import {lanAddress} from './net.js';
import {createPosterLookup} from './posters/tmdb.js';
import {DEFAULT_PLACE, pollWeather} from './weather.js';

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '0.0.0.0';
const LAN = process.env.HUDDLE_LAN_IP ?? lanAddress() ?? 'localhost';
const COMPANION_URL = process.env.COMPANION_URL ?? `http://${LAN}:5173/`;

const ai = createAI();
const posters = createPosterLookup();

const hub = new Hub({
  companionUrl: COMPANION_URL,
  ai,
  ...(posters ? {posters} : {}),
  log: (msg, extra) => console.log(`[hub] ${msg}`, extra ?? ''),
});

const http = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, {'content-type': 'application/json', 'access-control-allow-origin': '*'});
    res.end(JSON.stringify({ok: true, connections: hub.connectionCount}));
    return;
  }
  res.writeHead(404);
  res.end();
});

// Open-Meteo needs no key. Override the place with HUDDLE_PLACE / HUDDLE_LAT / HUDDLE_LON.
const place = {
  name: process.env.HUDDLE_PLACE ?? DEFAULT_PLACE.name,
  latitude: Number(process.env.HUDDLE_LAT ?? DEFAULT_PLACE.latitude),
  longitude: Number(process.env.HUDDLE_LON ?? DEFAULT_PLACE.longitude),
};
if (process.env.HUDDLE_WEATHER !== 'off') {
  pollWeather(place, w => hub.setWeather(w), {log: msg => console.warn(`[weather] ${msg}`)});
}

const wss = new WebSocketServer({server: http, path: '/ws', maxPayload: 64 * 1024});

wss.on('connection', socket => {
  const {onMessage, onClose} = hub.connect(socket);
  socket.on('message', (data, isBinary) => onMessage(isBinary ? '' : data.toString()));
  socket.on('close', onClose);
  socket.on('error', err => console.warn('[ws] socket error', err.message));
});

process.on('uncaughtException', err => console.error('[server] uncaught', err));

http.listen(PORT, HOST, () => {
  console.log(`Huddle server listening on ${HOST}:${PORT}`);
  console.log(`  TV / phones connect to   ws://${LAN}:${PORT}/ws`);
  console.log(`  QR codes point phones to ${COMPANION_URL}`);
  console.log(`  AI: ${ai.source === 'bedrock' ? `Bedrock (${process.env.AWS_REGION ?? 'us-east-1'})` : 'mock (set HUDDLE_AI=bedrock for Amazon Nova)'}`);
  console.log(`  Posters: ${posters ? 'TMDB' : 'off (set TMDB_API_KEY for movie art)'}`);
});
