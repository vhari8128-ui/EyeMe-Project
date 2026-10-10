'use client';

import { useEffect, useRef } from 'react';
import { isMusicBlocked, usePlayer } from './MusicPlayer';
import { youTubeThumbnail } from '@/lib/youtube';

// The "Profile Song" box. The site-wide YouTube player positions itself over this box while
// this profile's song is playing; otherwise it shows the video thumbnail with a play button.
export default function ProfileSong({ videoId, title, owner, autoplay }) {
  const player = usePlayer();
  const slotRef = useRef(null);
  const isThisSong = player.track?.videoId === videoId;
  const track = { videoId, title, owner };

  useEffect(() => {
    player.setSlot({ el: slotRef.current, videoId });
    return () => player.setSlot(null);
  }, [videoId]);

  useEffect(() => {
    if (!autoplay || player.blocked || isMusicBlocked()) return;
    if (player.track?.videoId === videoId) return; // already started by the ProfileLink click
    player.play(track);
    // Only on arrival at this profile, not on every player state change
  }, [videoId, autoplay, player.blocked]);

  return (
    <div className="box profile-song">
      <h2 className="box-title">🎵 {owner}&apos;s Profile Song</h2>
      <div className="box-body">
        <div className="song-slot" ref={slotRef}>
          {!isThisSong && (
            <button className="song-poster" onClick={() => player.play(track)} aria-label={`Play ${title}`}>
              <img src={youTubeThumbnail(videoId)} alt="" />
              <span className="poster-play">▶</span>
            </button>
          )}
        </div>
        <div className="song-title">{title || 'YouTube video'}</div>
      </div>
    </div>
  );
}
