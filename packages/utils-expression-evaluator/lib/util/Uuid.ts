const HEX: string[] = Array.from({ length: 256 }, (_, byte) => (byte + 0x100).toString(16).slice(1));

// Random bytes for 16 UUIDs, so getRandomValues is called once per 16 UUIDs.
const pool = new Uint8Array(256);
let poolOffset = pool.length;

/**
 * Create a UUID (version 4) from random bytes, for when crypto.randomUUID is not available.
 * This is the case in browsers on pages that are not served over HTTPS.
 */
export function uuidv4FromRandomValues(): string {
  if (poolOffset === pool.length) {
    crypto.getRandomValues(pool);
    poolOffset = 0;
  }
  const i = poolOffset;
  poolOffset += 16;
  // Set the version (4) and variant (RFC 9562) bits.
  pool[i + 6] = (pool[i + 6] & 0x0F) | 0x40;
  pool[i + 8] = (pool[i + 8] & 0x3F) | 0x80;
  return `${HEX[pool[i]]}${HEX[pool[i + 1]]}${HEX[pool[i + 2]]}${HEX[pool[i + 3]]}-${
    HEX[pool[i + 4]]}${HEX[pool[i + 5]]}-${HEX[pool[i + 6]]}${HEX[pool[i + 7]]}-${
    HEX[pool[i + 8]]}${HEX[pool[i + 9]]}-${HEX[pool[i + 10]]}${HEX[pool[i + 11]]}${
    HEX[pool[i + 12]]}${HEX[pool[i + 13]]}${HEX[pool[i + 14]]}${HEX[pool[i + 15]]}`;
}

/**
 * Create a random UUID (version 4), in lowercase.
 */
export function uuidv4(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : uuidv4FromRandomValues();
}
