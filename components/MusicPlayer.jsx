'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';

const PlayerContext = createContext(null);
const BLOCK_KEY = 'blockProfileMusic';

// YouTube player states
const PLAYING = 1;
const BUFFERING = 3;
const ENDED = 0;

// Read straight from storage: on a fresh page load, child effects run before the
// provider's state has picked up the saved preference.
export function isMusicBlocked() {
  return typeof localStorage !== 'undefined' && localStorage.getItem(BLOCK_KEY) === '1';
}

export function usePlayer() {
  return useContext(PlayerContext);
}

let apiPromise;
function loadYouTubeApi() {
  apiPromise ??= new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
  return apiPromise;
}

// One YouTube player for the whole site. It lives in the root layout, so it keeps playing while
// the visitor navigates with <Link>. On a profile page it sits inside that profile's song box;
// everywhere else it shrinks to a mini player in the corner (YouTube requires the video to stay visible).
export function MusicProvider({ children }) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const readyRef = useRef(null);
  const [track, setTrack] = useState(null); // { videoId, title, owner }
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [needsUnmute, setNeedsUnmute] = useState(false);
  const [slot, setSlot] = useState(null); // { el, videoId } registered by a profile page
  const [box, setBox] = useState(null);

  // Created on first use. A profile page's effect can ask to play before this provider's own
  // effects have run (children's effects run first), so this can't live in a useEffect alone.
  const ensurePlayer = useCallback(() => {
    readyRef.current ??= loadYouTubeApi().then(
      (YT) =>
        new Promise((resolve) => {
          const target = document.createElement('div');
          hostRef.current.appendChild(target);
          playerRef.current = new YT.Player(target, {
            width: '100%',
            height: '100%',
            playerVars: { playsinline: 1, rel: 0, origin: window.location.origin },
            events: {
              onReady: () => resolve(playerRef.current),
              // The browser refused to play sound (no click on the site yet): play muted instead
              // and turn the sound on at the visitor's first click anywhere on the page.
              onAutoplayBlocked: (e) => {
                e.target.mute();
                e.target.playVideo();
                setNeedsUnmute(true);
              },
              onStateChange: (e) => {
                setPlaying(e.data === PLAYING || e.data === BUFFERING);
                // Loop the song like a classic profile
                if (e.data === ENDED) {
                  e.target.seekTo(0);
                  e.target.playVideo();
                }
              },
            },
          });
        })
    );
    return readyRef.current;
  }, []);

  useEffect(() => {
    setBlocked(isMusicBlocked());
    ensurePlayer();
  }, [ensurePlayer]);

  // Call from a click when possible: browsers allow sound once the visitor has clicked on the site.
  const play = useCallback(
    async (t) => {
      if (!t?.videoId) return;
      setTrack(t);
      const player = await ensurePlayer();
      player.unMute();
      setNeedsUnmute(false);
      if (player.getVideoData?.()?.video_id === t.videoId) player.playVideo();
      else player.loadVideoById(t.videoId);
    },
    [ensurePlayer]
  );

  const pause = useCallback(() => playerRef.current?.pauseVideo?.(), []);
  const resume = useCallback(() => {
    playerRef.current?.unMute?.();
    playerRef.current?.playVideo?.();
    setNeedsUnmute(false);
  }, []);

  const stop = useCallback(() => {
    playerRef.current?.stopVideo?.();
    setTrack(null);
    setNeedsUnmute(false);
  }, []);

  const setBlockedPref = useCallback(
    (value) => {
      setBlocked(value);
      localStorage.setItem(BLOCK_KEY, value ? '1' : '0');
      if (value) stop();
    },
    [stop]
  );

  // Turn the sound on at the visitor's first click or key press
  useEffect(() => {
    if (!needsUnmute) return;
    const unmute = () => {
      playerRef.current?.unMute?.();
      playerRef.current?.playVideo?.();
      setNeedsUnmute(false);
    };
    document.addEventListener('pointerdown', unmute, { once: true });
    document.addEventListener('keydown', unmute, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unmute);
      document.removeEventListener('keydown', unmute);
    };
  }, [needsUnmute]);

  // Where the video is drawn: inside the profile's song box, or the corner mini player
  const inSlot = !!(track && slot && slot.videoId === track.videoId);
  useLayoutEffect(() => {
    if (!inSlot) return setBox(null);
    const measure = () => {
      const r = slot.el.getBoundingClientRect();
      setBox({ top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(slot.el);
    ro.observe(document.body);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [inSlot, slot]);

  const containerStyle = !track
    ? { position: 'fixed', left: -10000, top: 0, width: 356, height: 200 }
    : inSlot && box
      ? { position: 'absolute', ...box }
      : { position: 'fixed', right: 16, bottom: 60, width: 356, height: 200 };

  const value = { track, playing, blocked, needsUnmute, play, pause, resume, stop, setBlocked: setBlockedPref, setSlot };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <div ref={hostRef} className={`yt-player ${track && !inSlot ? 'mini' : ''}`} style={containerStyle} />
      <PlayerBar />
    </PlayerContext.Provider>
  );
}

function PlayerBar() {
  const { track, playing, blocked, needsUnmute, pause, resume, stop, setBlocked } = usePlayer();
  return (
    <div className="player-bar">
      {track ? (
        <>
          <button onClick={() => (playing && !needsUnmute ? pause() : resume())} aria-label={playing ? 'Pause' : 'Play'}>
            {playing && !needsUnmute ? '⏸' : '▶'}
          </button>
          <button onClick={stop} aria-label="Stop">
            ⏹
          </button>
          <span className="player-title">
            🎵 {track.title || 'YouTube video'} <span className="muted">— from {track.owner}&apos;s profile</span>
          </span>
          {needsUnmute && <span className="unmute-hint">🔇 Click anywhere to turn the sound on</span>}
        </>
      ) : (
        <span className="muted">No music playing</span>
      )}
      <label className="player-block">
        <input type="checkbox" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} /> Mute all profile
        music
      </label>
    </div>
  );
}
