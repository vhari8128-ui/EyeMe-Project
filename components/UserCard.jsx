import ProfileLink from './ProfileLink';
import { fileUrl } from '@/lib/db';

// Small avatar + name tile used in Top 8, "cool new people", and friend requests
export default function UserCard({ user }) {
  const avatar = fileUrl(user.avatar_file);
  return (
    <ProfileLink
      username={user.username}
      youtubeId={user.youtube_id}
      songTitle={user.song_title}
      autoplay={!!user.autoplay_song}
      className="user-card"
    >
      {avatar ? <img src={avatar} alt="" /> : <div className="no-pic">no pic</div>}
      <span>{user.display_name}</span>
    </ProfileLink>
  );
}
