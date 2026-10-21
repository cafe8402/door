// Add seekable duration metadata to our Canvas/MediaRecorder-generated guide.
// Only the bundled synthetic guide is modified; no user recordings are read.
import fs from 'node:fs/promises';
const path = new URL('../public/media/mundansok-work-guide.webm', import.meta.url);
const data = await fs.readFile(path);
function element(offset) {
  let idLength = 1, sizeLength = 1;
  while (idLength <= 4 && !(data[offset] & (0x80 >> (idLength - 1)))) idLength++;
  if (idLength > 4) throw new Error('Invalid EBML ID');
  const id = data.subarray(offset, offset + idLength).toString('hex');
  const sizeOffset = offset + idLength;
  while (sizeLength <= 8 && !(data[sizeOffset] & (0x80 >> (sizeLength - 1)))) sizeLength++;
  if (sizeLength > 8) throw new Error('Invalid EBML size');
  let size = BigInt(data[sizeOffset] & ((1 << (8 - sizeLength)) - 1));
  for (let i = 1; i < sizeLength; i++) size = (size << 8n) | BigInt(data[sizeOffset + i]);
  const unknown = size === (1n << BigInt(7 * sizeLength)) - 1n;
  const start = sizeOffset + sizeLength;
  return { id, sizeOffset, sizeLength, size, unknown, start, end: unknown ? data.length : start + Number(size) };
}
function sizeBytes(value, length) {
  if (value >= (1n << BigInt(7 * length)) - 1n) throw new Error('EBML size overflow');
  const bytes = Buffer.alloc(length);
  for (let i = length - 1; i >= 0; i--) { bytes[i] = Number(value & 255n); value >>= 8n; }
  bytes[0] |= 1 << (8 - length); return bytes;
}
const header = element(0), segment = element(header.end);
if (segment.id !== '18538067') throw new Error('No WebM segment');
let info;
for (let offset = segment.start; offset < segment.end;) {
  const item = element(offset);
  if (item.id === '114d9b74') throw new Error('Indexed file requires remuxing instead of header patching');
  if (item.id === '1549a966') { info = item; break; }
  offset = item.end;
}
if (!info || info.unknown) throw new Error('No finite WebM Info');
let scale = 1000000;
for (let offset = info.start; offset < info.end;) {
  const item = element(offset);
  if (item.id === '4489') { console.log('Duration already present'); process.exit(0); }
  if (item.id === '2ad7b1') { scale = 0; for (let i = item.start; i < item.end; i++) scale = scale * 256 + data[i]; }
  offset = item.end;
}
const duration = Buffer.alloc(11); duration[0] = 0x44; duration[1] = 0x89; duration[2] = 0x88; duration.writeDoubleBE(20 * 1e9 / scale, 3);
const output = Buffer.concat([data.subarray(0, info.sizeOffset), sizeBytes(info.size + 11n, info.sizeLength), data.subarray(info.start, info.end), duration, data.subarray(info.end)]);
if (!segment.unknown) sizeBytes(segment.size + 11n, segment.sizeLength).copy(output, segment.sizeOffset);
await fs.writeFile(path, output);
console.log('Guide video duration set to 20 seconds; bytes=' + output.length);
