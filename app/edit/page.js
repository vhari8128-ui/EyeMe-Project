import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { fileUrl } from '@/lib/db';
import ProfileEditor from '@/components/ProfileEditor';

export const metadata = { title: 'Edit Profile — EyeMe' };

export default async function EditPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <ProfileEditor
      user={{
        username: user.username,
        displayName: user.display_name,
        mood: user.mood,
        html: user.custom_html,
        css: user.custom_css,
        avatarUrl: fileUrl(user.avatar_file),
        youtubeId: user.youtube_id,
        songTitle: user.song_title,
        autoplay: !!user.autoplay_song,
      }}
    />
  );
}
