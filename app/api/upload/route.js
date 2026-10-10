import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import db, { UPLOAD_DIR, fileUrl } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const LIMITS = {
  avatar: 5 * 1024 * 1024,
};

// Detect the real file type from its first bytes — never trust the file name or browser-supplied type
function sniff(buf) {
  const hex = buf.subarray(0, 12).toString('hex');
  const ascii = buf.subarray(0, 12).toString('latin1');
  if (hex.startsWith('89504e47')) return { kind: 'avatar', ext: 'png' };
  if (hex.startsWith('ffd8ff')) return { kind: 'avatar', ext: 'jpg' };
  if (ascii.startsWith('GIF8')) return { kind: 'avatar', ext: 'gif' };
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return { kind: 'avatar', ext: 'webp' };
  return null;
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Not logged in' }, { status: 401 });

  const form = await request.formData();
  const kind = form.get('kind');
  const file = form.get('file');
  if (!(kind in LIMITS) || !(file instanceof File)) {
    return Response.json({ error: 'Bad upload' }, { status: 400 });
  }
  if (file.size > LIMITS[kind]) {
    return Response.json({ error: `File too large (max ${LIMITS[kind] / 1024 / 1024} MB)` }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type || type.kind !== kind) {
    return Response.json({ error: "That file isn't a supported type. Please upload a PNG, JPG, GIF, or WebP image." }, { status: 415 });
  }

  const name = `${crypto.randomBytes(16).toString('hex')}.${type.ext}`;
  await fs.writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), buf);

  const old = user.avatar_file;
  db.prepare('UPDATE users SET avatar_file = ? WHERE id = ?').run(name, user.id);
  if (old) await fs.rm(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, old), { force: true });

  return Response.json({ url: fileUrl(name) });
}

export async function DELETE(request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Not logged in' }, { status: 401 });
  const kind = new URL(request.url).searchParams.get('kind');
  if (!(kind in LIMITS)) return Response.json({ error: 'Bad request' }, { status: 400 });

  const old = user.avatar_file;
  db.prepare('UPDATE users SET avatar_file = NULL WHERE id = ?').run(user.id);
  if (old) await fs.rm(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, old), { force: true });
  return Response.json({ ok: true });
}
