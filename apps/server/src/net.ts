import {networkInterfaces} from 'node:os';

/**
 * The Mac's LAN IPv4 address (what phones and the Vega Virtual Device use to
 * reach this server). Prefers Wi-Fi/Ethernet (en*), skips loopback, link-local
 * and virtual adapters.
 */
export function lanAddress(): string | undefined {
  const candidates: Array<{name: string; address: string}> = [];
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family !== 'IPv4' || a.internal || a.address.startsWith('169.254.')) continue;
      if (/^(utun|bridge|vmnet|vboxnet|docker|llw|awdl)/.test(name)) continue;
      candidates.push({name, address: a.address});
    }
  }
  candidates.sort((x, y) => Number(!x.name.startsWith('en')) - Number(!y.name.startsWith('en')) || x.name.localeCompare(y.name));
  return candidates[0]?.address;
}
