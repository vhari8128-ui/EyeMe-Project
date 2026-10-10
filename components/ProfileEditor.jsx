'use client';

import { startTransition, useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { saveProfile } from '@/app/actions';
import { THEMES } from '@/lib/themes';
import { parseYouTubeId, youTubeThumbnail } from '@/lib/youtube';
import ProfileFrame from './ProfileFrame';
import { usePlayer } from './MusicPlayer';

export default function ProfileEditor({ user }) {
  const router = useRouter();
  const player = usePlayer();
  const [state, formAction, saving] = useActionState(saveProfile, null);

  const [displayName, setDisplayName] = useState(user.displayName);
  const [mood, setMood] = useState(user.mood);
  const [html, setHtml] = useState(user.html);
  const [css, setCss] = useState(user.css);
  const [autoplay, setAutoplay] = useState(user.autoplay);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [youtubeUrl, setYoutubeUrl] = useState(user.youtubeId ? `https://www.youtube.com/watch?v=${user.youtubeId}` : '');
  const [uploadMsg, setUploadMsg] = useState('');

  const videoId = parseYouTubeId(youtubeUrl);
  // The title comes from YouTube when the profile is saved
  const savedId = state?.ok ? state.youtubeId : user.youtubeId;
  const savedTitle = state?.ok ? state.songTitle : user.songTitle;
  const videoTitle = videoId && videoId === savedId ? savedTitle : '';

  async function uploadAvatar(file) {
    if (!file) return;
    setUploadMsg('Uploading picture...');
    const body = new FormData();
    body.append('kind', 'avatar');
    body.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setUploadMsg(data.error ?? 'Upload failed');
    setAvatarUrl(data.url);
    setUploadMsg('Picture uploaded!');
    router.refresh();
  }

  async function removeAvatar() {
    await fetch('/api/upload?kind=avatar', { method: 'DELETE' });
    setAvatarUrl(null);
    router.refresh();
  }

  // Submit manually: a plain form action makes React reset the form afterwards,
  // which unchecks controlled checkboxes in the DOM while state still says "on".
  function onSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <div className="editor">
      <form onSubmit={onSubmit} className="editor-controls">
        <div className="box">
          <h2 className="box-title">Basic info</h2>
          <div className="box-body">
            <label>
              Display name
              <input name="display_name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} />
            </label>
            <label>
              Mood
              <input name="mood" value={mood} onChange={(e) => setMood(e.target.value)} maxLength={60} placeholder="e.g. listening to music 🎧" />
            </label>
            <div className="upload-row">
              <span>Profile pic</span>
              <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(e) => uploadAvatar(e.target.files[0])} />
              {avatarUrl && (
                <button type="button" className="linklike small" onClick={removeAvatar}>
                  remove
                </button>
              )}
            </div>
            {uploadMsg && <p className="small">{uploadMsg}</p>}
          </div>
        </div>

        <div className="box">
          <h2 className="box-title">Profile song 🎵</h2>
          <div className="box-body">
            <label>
              YouTube link
              <input
                name="youtube_url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </label>
            {videoId ? (
              <>
                <div className="song-pick">
                  <img src={youTubeThumbnail(videoId)} alt="" />
                  <div>
                    <div>{videoTitle || <span className="muted">Title will be filled in when you save</span>}</div>
                    <button type="button" className="linklike small" onClick={() => setYoutubeUrl('')}>
                      remove song
                    </button>
                  </div>
                </div>
                <label className="checkbox">
                  <input type="checkbox" name="autoplay_song" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} />
                  Play my song automatically when people visit my page
                </label>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => player.play({ videoId, title: videoTitle, owner: user.username })}
                >
                  ▶ Test it
                </button>
              </>
            ) : youtubeUrl ? (
              <p className="error small">That doesn&apos;t look like a YouTube link.</p>
            ) : (
              <p className="muted small">Paste a link to any YouTube video. It plays on your profile and keeps playing while visitors browse.</p>
            )}
          </div>
        </div>

        <div className="box">
          <h2 className="box-title">Customize your page</h2>
          <div className="box-body">
            <div className="themes">
              <span>Start from a theme:</span>
              {THEMES.map((t) => (
                <button type="button" key={t.name} className="btn btn-secondary small" onClick={() => setCss(t.css)}>
                  {t.name}
                </button>
              ))}
            </div>
            <label>
              Your HTML (goes in the &quot;about&quot; section)
              <textarea name="custom_html" value={html} onChange={(e) => setHtml(e.target.value)} rows={10} spellCheck={false} className="code" />
            </label>
            <label>
              Your CSS (styles your whole page)
              <textarea name="custom_css" value={css} onChange={(e) => setCss(e.target.value)} rows={12} spellCheck={false} className="code" />
            </label>
            <details className="small">
              <summary>Styling tips</summary>
              <p>
                Style these classes: <code>body</code>, <code>.profile</code>, <code>.profile-header</code>,{' '}
                <code>.avatar</code>, <code>.display-name</code>, <code>.username</code>, <code>.mood</code>,{' '}
                <code>.about</code>. Images and fonts can be loaded from https URLs. Scripts are not allowed.
              </p>
            </details>
          </div>
        </div>

        <div className="save-bar">
          <button className="btn big" disabled={saving}>
            {saving ? 'Saving...' : 'Save profile'}
          </button>
          {state?.error && !saving && <span className="error">{state.error}</span>}
          {state?.ok && !saving && (
            <span>
              Saved! <Link href={`/u/${user.username}`}>View your page →</Link>
            </span>
          )}
        </div>
      </form>

      <div className="editor-preview">
        <div className="preview-label">Live preview</div>
        <ProfileFrame displayName={displayName} username={user.username} mood={mood} avatarUrl={avatarUrl} html={html} css={css} />
      </div>
    </div>
  );
}
