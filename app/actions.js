'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import db from '@/lib/db';
import { createSession, destroySession, getCurrentUser, hashPassword, verifyPassword } from '@/lib/auth';
import { cleanProfileCss, cleanProfileHtml } from '@/lib/sanitize';
import { DEFAULT_HTML, THEMES } from '@/lib/themes';
import { parseYouTubeId } from '@/lib/youtube';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

// ---------- auth ----------

export async function signup(_prev, formData) {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const displayName = String(formData.get('display_name') ?? '').trim() || username;

  if (!USERNAME_RE.test(username)) return { error: 'Username must be 3-20 letters, numbers, or underscores.' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) return { error: 'That username is taken.' };

  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO users (username, password_hash, display_name, custom_html, custom_css)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(username, hashPassword(password), displayName.slice(0, 50), DEFAULT_HTML, THEMES[0].css);

  await createSession(Number(lastInsertRowid));
  redirect('/edit');
}

export async function login(_prev, formData) {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const user = db.prepare('SELECT id, password_hash FROM users WHERE username = ?').get(username);
  if (!user || !verifyPassword(password, user.password_hash)) return { error: 'Wrong username or password.' };
  await createSession(user.id);
  redirect('/');
}

export async function logout() {
  await destroySession();
  redirect('/');
}

// ---------- profile ----------

// Checks the video exists and that its owner allows playing it on other sites, and gets its title.
async function lookUpYouTubeVideo(videoId) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`;
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  } catch {
    return { title: '' }; // YouTube unreachable: save anyway, the player will still try
  }
  if (res.status === 401 || res.status === 403) {
    return { error: "That video's owner doesn't allow it to be played on other websites. Try a different upload of the song." };
  }
  if (!res.ok) return { error: "Couldn't find that YouTube video. Is it private or deleted?" };
  const data = await res.json();
  return { title: String(data.title ?? '').slice(0, 100) };
}

export async function saveProfile(_prev, formData) {
  const user = await requireUser();

  const youtubeInput = String(formData.get('youtube_url') ?? '').trim();
  let youtubeId = null;
  let songTitle = '';
  if (youtubeInput) {
    youtubeId = parseYouTubeId(youtubeInput);
    if (!youtubeId) return { error: "That doesn't look like a YouTube link." };
    if (youtubeId === user.youtube_id && user.song_title) {
      songTitle = user.song_title;
    } else {
      const video = await lookUpYouTubeVideo(youtubeId);
      if (video.error) return { error: video.error };
      songTitle = video.title;
    }
  }

  db.prepare(
    `UPDATE users SET display_name = ?, mood = ?, custom_html = ?, custom_css = ?, youtube_id = ?, song_title = ?, autoplay_song = ?
     WHERE id = ?`
  ).run(
    String(formData.get('display_name') ?? '').trim().slice(0, 50) || user.username,
    String(formData.get('mood') ?? '').trim().slice(0, 60),
    cleanProfileHtml(String(formData.get('custom_html') ?? '')),
    cleanProfileCss(String(formData.get('custom_css') ?? '')),
    youtubeId,
    songTitle,
    formData.get('autoplay_song') === 'on' ? 1 : 0,
    user.id
  );
  revalidatePath('/', 'layout');
  return { ok: true, savedAt: Date.now(), youtubeId, songTitle };
}

// ---------- friends ----------

export async function sendFriendRequest(formData) {
  const user = await requireUser();
  const targetId = Number(formData.get('user_id'));
  if (!targetId || targetId === user.id) return;
  const reverse = db
    .prepare('SELECT status FROM friends WHERE requester_id = ? AND addressee_id = ?')
    .get(targetId, user.id);
  if (reverse) {
    // They already asked us — adding them back accepts it
    db.prepare(`UPDATE friends SET status = 'accepted' WHERE requester_id = ? AND addressee_id = ?`).run(targetId, user.id);
  } else {
    db.prepare('INSERT OR IGNORE INTO friends (requester_id, addressee_id) VALUES (?, ?)').run(user.id, targetId);
  }
  revalidatePath('/', 'layout');
}

export async function acceptFriendRequest(formData) {
  const user = await requireUser();
  db.prepare(`UPDATE friends SET status = 'accepted' WHERE requester_id = ? AND addressee_id = ?`).run(
    Number(formData.get('user_id')),
    user.id
  );
  revalidatePath('/', 'layout');
}

export async function removeFriend(formData) {
  const user = await requireUser();
  const otherId = Number(formData.get('user_id'));
  db.prepare(
    `DELETE FROM friends WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`
  ).run(user.id, otherId, otherId, user.id);
  revalidatePath('/', 'layout');
}

// ---------- comments ----------

export async function postComment(formData) {
  const user = await requireUser();
  const profileId = Number(formData.get('profile_id'));
  const body = String(formData.get('body') ?? '').trim().slice(0, 1000);
  if (!body || !profileId) return;

  // Simple rate limit: 5 comments per minute
  const recent = db
    .prepare(`SELECT COUNT(*) AS n FROM comments WHERE author_id = ? AND created_at > datetime('now', '-1 minute')`)
    .get(user.id);
  if (recent.n >= 5) return;

  db.prepare('INSERT INTO comments (profile_id, author_id, body) VALUES (?, ?, ?)').run(profileId, user.id, body);
  revalidatePath('/', 'layout');
}

export async function deleteComment(formData) {
  const user = await requireUser();
  // The profile owner or the comment's author can delete it
  db.prepare('DELETE FROM comments WHERE id = ? AND (profile_id = ? OR author_id = ?)').run(
    Number(formData.get('comment_id')),
    user.id,
    user.id
  );
  revalidatePath('/', 'layout');
}
