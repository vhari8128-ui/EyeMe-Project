import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { UPLOAD_DIR } from '@/lib/db';

const TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

// Serves uploaded profile pictures. Supports Range requests.
export async function GET(request, { params }) {
  const { name } = await params;
  const match = /^[a-f0-9]{32}\.(png|jpg|gif|webp)$/.exec(name);
  if (!match) return new Response('Not found', { status: 404 });

  const filePath = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name);
  let stat;
  try {
    stat = await fs.promises.stat(filePath);
  } catch {
    return new Response('Not found', { status: 404 });
  }

  const headers = {
    'Content-Type': TYPES[match[1]],
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '');
  if (range && (range[1] || range[2])) {
    let start, end;
    if (range[1]) {
      start = Number(range[1]);
      end = range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
    } else {
      // "bytes=-500" means the last 500 bytes
      start = Math.max(stat.size - Number(range[2]), 0);
      end = stat.size - 1;
    }
    if (start > end || start >= stat.size) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } });
    }
    const stream = Readable.toWeb(fs.createReadStream(filePath, { start, end }));
    return new Response(stream, {
      status: 206,
      headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': String(end - start + 1) },
    });
  }

  const stream = Readable.toWeb(fs.createReadStream(filePath));
  return new Response(stream, { headers: { ...headers, 'Content-Length': String(stat.size) } });
}
