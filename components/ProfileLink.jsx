'use client';

import Link from 'next/link';
import { usePlayer } from './MusicPlayer';

// A link to someone's profile. If they turned on "play my song when people visit",
// the song starts during this click — the click is what lets the browser play sound.
export default function ProfileLink({ username, youtubeId, songTitle, autoplay, className, children }) {
  const player = usePlayer();

  function onClick() {
    if (autoplay && youtubeId && !player.blocked) {
      player.play({ videoId: youtubeId, title: songTitle, owner: username });
    }
  }

  return (
    <Link href={`/u/${encodeURIComponent(username)}`} onClick={onClick} className={className}>
      {children}
    </Link>
  );
}
