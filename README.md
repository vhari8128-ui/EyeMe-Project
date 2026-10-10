# EyeMe — a MySpace-style social site

Users get a fully customizable profile (their own HTML + CSS), a YouTube profile song that can
auto-play when someone clicks through to their page, a Top 8, friend requests, and comments.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000, sign up, and you'll land in the profile editor.
Everything (database + uploads) is stored in the `data/` folder, created automatically.

## How the key features work

### Custom profiles (safely)
- Users write HTML and CSS in **Edit Profile**, with a live preview and starter themes (`lib/themes.js`).
- The HTML is sanitized on save (`lib/sanitize.js`): scripts, event handlers and `javascript:` links are removed.
- Profiles render inside a **sandboxed iframe** with a strict Content-Security-Policy (`lib/profileDocument.js`,
  `components/ProfileFrame.jsx`). Even if something slipped past the sanitizer, it couldn't run code
  or touch the main site's login cookies. **Never add `allow-same-origin` to that iframe's sandbox.**

### Profile music (YouTube)
- Users paste a YouTube link in **Edit Profile** and tick "Play my song automatically when people visit my page".
  On save, the server checks the video exists and allows embedding, and fetches its title (`app/actions.js`).
- One site-wide YouTube player (`components/MusicPlayer.jsx`) lives in the root layout, so the song keeps
  playing while visitors browse. On a profile it sits in the "Profile Song" box (`components/ProfileSong.jsx`);
  on other pages it shrinks to a mini player in the corner. (YouTube's terms require the video to stay visible.)
- Browsers block sound until the visitor clicks something. Every link to a profile is a `ProfileLink`
  (`components/ProfileLink.jsx`) that starts the song during the click, so it plays with sound.
  If someone opens a profile directly, the song starts muted and the sound turns on at their first click.
- Visitors can tick "Mute all profile music" in the bottom bar.

## Project layout

```
app/
  page.js               home: friend requests, cool new people
  u/[username]/page.js  public profile: song, custom page, Top 8, comments
  edit/                 profile editor
  login/, signup/
  actions.js            server actions (auth, save profile, friends, comments)
  api/upload/           profile picture uploads (file type checked by content, not name)
  api/files/[name]/     serves uploaded pictures
components/             MusicPlayer, ProfileSong, ProfileLink, ProfileFrame, ProfileEditor, ...
lib/                    db (SQLite via node:sqlite), auth, sanitize, themes, youtube
```

## Going live

`index.html` in this repo is the landing page published by GitHub Pages
(https://vhari8128-ui.github.io/EyeMe-Project/). Its buttons link to the live app, whose address is
set in `EYEME_URL` near the bottom of `index.html`.

The app itself needs a server with a persistent disk (GitHub Pages can only host static files).
`render.yaml` sets it up on [Render](https://render.com):

1. Click **[Deploy to Render](https://render.com/deploy?repo=https://github.com/vhari8128-ui/EyeMe-Project)**
   and sign in with GitHub.
2. Approve the plan. A persistent disk needs a paid instance; Render's free plan can't keep the database.
3. When it's live, check the service URL. If it isn't `https://eyeme.onrender.com`, update `EYEME_URL`
   in `index.html`.

Every push to `main` redeploys. The database and pictures live on the disk at `/var/data` (`DATA_DIR`).

Before opening it to the public: add moderation (report button, admin tools) and email verification.
