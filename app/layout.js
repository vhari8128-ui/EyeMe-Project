import Link from 'next/link';
import './globals.css';
import { MusicProvider } from '@/components/MusicPlayer';
import ProfileLink from '@/components/ProfileLink';
import { getCurrentUser } from '@/lib/auth';
import { fileUrl } from '@/lib/db';
import { logout } from './actions';

export const metadata = {
  title: 'EyeMe — a place for friends',
  description: 'Make your page your own.',
};

export default async function RootLayout({ children }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <MusicProvider>
          <header className="topbar">
            <Link href="/" className="logo">
              EyeMe<span>.</span>
            </Link>
            <span className="tagline">a place for friends</span>
            <nav>
              <Link href="/">Home</Link>
              {user ? (
                <>
                  <ProfileLink
                    username={user.username}
                    youtubeId={user.youtube_id}
                    songTitle={user.song_title}
                    autoplay={!!user.autoplay_song}
                  >
                    My Profile
                  </ProfileLink>
                  <Link href="/edit">Edit Profile</Link>
                  <form action={logout}>
                    <button className="linklike">Log out</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login">Log in</Link>
                  <Link href="/signup">Sign up</Link>
                </>
              )}
            </nav>
          </header>
          <main className="container">{children}</main>
        </MusicProvider>
      </body>
    </html>
  );
}
