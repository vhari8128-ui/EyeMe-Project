import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// Hosts with a persistent disk set DATA_DIR to where that disk is mounted
export const DATA_DIR = process.env.DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), 'data');
export const UPLOAD_DIR = path.join(/*turbopackIgnore: true*/ DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Reuse one connection across hot reloads in dev
const db = globalThis.__db ?? new DatabaseSync(path.join(/*turbopackIgnore: true*/ DATA_DIR, 'myspace.db'), { timeout: 5000 });
globalThis.__db = db;

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    display_name  TEXT NOT NULL,
    mood          TEXT DEFAULT '',
    avatar_file   TEXT,
    custom_html   TEXT DEFAULT '',
    custom_css    TEXT DEFAULT '',
    youtube_id    TEXT,
    song_title    TEXT DEFAULT '',
    autoplay_song INTEGER DEFAULT 0,
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  -- One row per request; status becomes 'accepted' when the other user agrees
  CREATE TABLE IF NOT EXISTS friends (
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'pending',
    created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (requester_id, addressee_id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Older databases stored uploaded song files; songs are now YouTube videos
const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userColumns.includes('youtube_id')) db.exec('ALTER TABLE users ADD COLUMN youtube_id TEXT');

export default db;

export function fileUrl(name) {
  return name ? `/api/files/${name}` : null;
}

export function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export function getTopFriends(userId, limit = 8) {
  return db
    .prepare(
      `SELECT u.id, u.username, u.display_name, u.avatar_file, u.youtube_id, u.song_title, u.autoplay_song
       FROM friends f
       JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
       WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'
       ORDER BY f.created_at
       LIMIT ?`
    )
    .all(userId, userId, userId, limit);
}

export function getFriendStatus(viewerId, profileId) {
  const row = db
    .prepare(
      `SELECT requester_id, status FROM friends
       WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`
    )
    .get(viewerId, profileId, profileId, viewerId);
  if (!row) return 'none';
  if (row.status === 'accepted') return 'friends';
  return row.requester_id === viewerId ? 'sent' : 'received';
}

export function getPendingRequests(userId) {
  return db
    .prepare(
      `SELECT u.id, u.username, u.display_name, u.avatar_file, u.youtube_id, u.song_title, u.autoplay_song
       FROM friends f JOIN users u ON u.id = f.requester_id
       WHERE f.addressee_id = ? AND f.status = 'pending'`
    )
    .all(userId);
}

export function getComments(profileId) {
  return db
    .prepare(
      `SELECT c.id, c.body, c.created_at, c.author_id, u.username, u.display_name, u.avatar_file,
              u.youtube_id, u.song_title, u.autoplay_song
       FROM comments c JOIN users u ON u.id = c.author_id
       WHERE c.profile_id = ? ORDER BY c.id DESC LIMIT 50`
    )
    .all(profileId);
}
