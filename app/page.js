import Link from 'next/link';
import db, { getPendingRequests } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import UserCard from '@/components/UserCard';
import { acceptFriendRequest, removeFriend } from './actions';

export default async function Home() {
  const user = await getCurrentUser();
  const newPeople = db
    .prepare(
      `SELECT id, username, display_name, avatar_file, youtube_id, song_title, autoplay_song
       FROM users ORDER BY id DESC LIMIT 16`
    )
    .all();
  const requests = user ? getPendingRequests(user.id) : [];

  return (
    <div className="home">
      {user ? (
        <div className="box">
          <h2 className="box-title">Hello, {user.display_name}!</h2>
          <div className="box-body">
            <p>
              <Link href={`/u/${user.username}`}>View my profile</Link> · <Link href="/edit">Edit my profile</Link>
            </p>
            {requests.length > 0 && (
              <>
                <h3>Friend requests ({requests.length})</h3>
                <ul className="requests">
                  {requests.map((r) => (
                    <li key={r.id}>
                      <UserCard user={r} />
                      <form action={acceptFriendRequest}>
                        <input type="hidden" name="user_id" value={r.id} />
                        <button className="btn">Approve</button>
                      </form>
                      <form action={removeFriend}>
                        <input type="hidden" name="user_id" value={r.id} />
                        <button className="btn btn-secondary">Deny</button>
                      </form>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="hero">
          <h1>EyeMe is a place for friends.</h1>
          <p>Make your profile look however you want, pick a song for it, and meet people.</p>
          <Link href="/signup" className="btn big">
            Sign up!
          </Link>
        </div>
      )}

      <div className="box">
        <h2 className="box-title">Cool New People</h2>
        <div className="box-body">
          {newPeople.length === 0 ? (
            <p className="muted">Nobody yet — be the first!</p>
          ) : (
            <div className="user-grid">
              {newPeople.map((u) => (
                <UserCard key={u.id} user={u} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
