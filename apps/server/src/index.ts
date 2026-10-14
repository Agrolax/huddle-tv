import {createServer} from 'node:http';
import {WebSocketServer, WebSocket} from 'ws';
import {
  ClientInfo,
  DEFAULT_TOPICS,
  HouseholdSnapshot,
  ServerMessage,
  Topic,
  canSend,
  envelope,
  isClientMessageType,
  parseEnvelope,
  shouldDeliver,
} from '@huddle/shared';
import {demoHousehold} from './household.js';

const PORT = Number(process.env.PORT ?? 8787);

interface Connection {
  socket: WebSocket;
  householdId: string;
  client: ClientInfo;
  topics: Topic[];
}

const households = new Map<string, HouseholdSnapshot>();
const connections = new Set<Connection>();

function household(id: string): HouseholdSnapshot {
  let hh = households.get(id);
  if (!hh) {
    hh = demoHousehold(id);
    households.set(id, hh);
  }
  return hh;
}

function send(conn: Connection, type: ServerMessage['type'], payload: ServerMessage['payload']) {
  if (conn.socket.readyState !== WebSocket.OPEN) return;
  conn.socket.send(JSON.stringify(envelope<ServerMessage>(type, payload)));
}

function broadcast(householdId: string, type: ServerMessage['type'], payload: ServerMessage['payload']) {
  for (const conn of connections) {
    if (conn.householdId === householdId && shouldDeliver(type, conn.topics)) send(conn, type, payload);
  }
}

const http = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, {'content-type': 'application/json'});
    res.end(JSON.stringify({ok: true, clients: connections.size}));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({server: http, path: '/ws'});

wss.on('connection', socket => {
  let conn: Connection | null = null;

  socket.on('message', data => {
    const env = parseEnvelope(data.toString());
    if (!env || !isClientMessageType(env.type)) return;

    if (!conn) {
      if (env.type !== 'hello') return;
      const hello = env.payload as {householdId: string; client: ClientInfo; topics?: Topic[]};
      const hh = household(hello.householdId);
      conn = {
        socket,
        householdId: hh.householdId,
        client: hello.client,
        topics: hello.topics?.length ? hello.topics : [...DEFAULT_TOPICS[hello.client.role]],
      };
      connections.add(conn);
      hh.clients = [...hh.clients.filter(c => c.clientId !== hello.client.clientId), hello.client];
      send(conn, 'welcome', {snapshot: hh, you: hello.client});
      broadcast(hh.householdId, 'client:joined', hello.client);
      return;
    }

    if (!canSend(conn.client.role, env.type)) {
      send(conn, 'error', {code: 'forbidden', message: `${conn.client.role} cannot send ${env.type}`});
      return;
    }

    const hh = household(conn.householdId);
    switch (env.type) {
      case 'subscribe':
        conn.topics = (env.payload as {topics: Topic[]}).topics;
        break;
      case 'profile:switch': {
        hh.activeProfileIds = (env.payload as {profileIds: string[]}).profileIds;
        broadcast(hh.householdId, 'profile:changed', {profileIds: hh.activeProfileIds});
        break;
      }
      case 'message:send': {
        const message = {
          id: env.id,
          text: String((env.payload as {text: unknown}).text).slice(0, 280),
          fromProfileId: conn.client.profileId,
          fromClient: conn.client.role,
          at: new Date().toISOString(),
        };
        hh.messages = [message, ...hh.messages].slice(0, 50);
        broadcast(hh.householdId, 'message:new', message);
        break;
      }
      case 'ping':
        send(conn, 'pong', {});
        break;
      default:
        // Chat, Tonight, Sketch it and smart-home handlers land in later steps.
        send(conn, 'error', {code: 'not-implemented', message: `${env.type} is not implemented yet`});
    }
  });

  socket.on('close', () => {
    if (!conn) return;
    connections.delete(conn);
    const hh = household(conn.householdId);
    hh.clients = hh.clients.filter(c => c.clientId !== conn!.client.clientId);
    broadcast(hh.householdId, 'client:left', {clientId: conn.client.clientId});
  });
});

http.listen(PORT, () => {
  console.log(`Huddle server on http://localhost:${PORT} (ws: /ws)`);
});
