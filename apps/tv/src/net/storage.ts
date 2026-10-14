/**
 * Tiny key/value store for the TV token. Uses Vega's AsyncStorage port when the
 * native module is there; falls back to memory so the app still runs (it then
 * can't reclaim its household after a restart until the server restarts).
 */
type Backend = {getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void>};

const memory = new Map<string, string>();
const memoryBackend: Backend = {
  getItem: async k => memory.get(k) ?? null,
  setItem: async (k, v) => {
    memory.set(k, v);
  },
};

let backend: Backend | null = null;

function resolveBackend(): Backend {
  if (backend) return backend;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@amazon-devices/react-native-async-storage__async-storage');
    backend = (mod.default ?? mod) as Backend;
  } catch {
    backend = memoryBackend;
  }
  return backend;
}

export async function getItem(key: string): Promise<string | null> {
  try {
    return await resolveBackend().getItem(key);
  } catch {
    return memoryBackend.getItem(key);
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    await resolveBackend().setItem(key, value);
  } catch {
    await memoryBackend.setItem(key, value);
  }
}
