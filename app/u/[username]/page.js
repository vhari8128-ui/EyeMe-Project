import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fileUrl, getComments, getFriendStatus, getTopFriends, getUserByUsername } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import ProfileFrame from '@/components/ProfileFrame';
import ProfileSong from '@/components/ProfileSong';
import UserCard from '@/components/UserCard';
import { acceptFriendRequest, deleteComment, postComment, removeFriend, sendFriendRequest } from '../../actions';

export async function generateMetadata({ params }) {
  const { username } = await params;
  const user = getUserByUsername(username);
  return { title: user ? `${user.display_name} on EyeMe` : 'Not found' };
}

export default async function ProfilePage({ params }) {
  const { username } = await params;
  const profile = getUserByUsername(username);
  if (!profile) notFound();

  const viewer = await getCurrentUser();
  const isOwner = viewer?.id === profile.id;
  const friendStatus = viewer && !isOwner ? getFriendStatus(viewer.id, profile.id) : null;
  const topFriends = getTopFriends(profile.id);
  const comments = getComments(profile.id);

  return (
    <div className="profile-page">
      <div className="profile-toolbar">
        <div className="spacer" />
        {isOwner && (
          <Link href="/edit" className="btn">
            Edit my page
          </Link>
        )}
        {friendStatus && <FriendButton status={friendStatus} profileId={profile.id} />}
      </div>

      {profile.youtube_id && (
        <ProfileSong
          videoId={profile.youtube_id}
          title={profile.song_title}
          owner={profile.username}
          autoplay={!!profile.autoplay_song}
        />
      )}

      <ProfileFrame
        displayName={profile.display_name}
        username={profile.username}
        mood={profile.mood}
        avatarUrl={fileUrl(profile.avatar_file)}
        html={profile.custom_html}
        css={profile.custom_css}
      />

      <div className="profile-columns">
        <section className="box">
          <h2 className="box-title">{profile.display_name}&apos;s Friend Space</h2>
          <div className="box-body">
            {topFriends.length === 0 ? (
              <p className="muted">No friends yet.</p>
            ) : (
              <div className="user-grid top8">
                {topFriends.map((f) => (
                  <UserCard key={f.id} user={f} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="box">
          <h2 className="box-title">
            {profile.display_name}&apos;s Friends Comments ({comments.length})
          </h2>
          <div className="box-body">
            {viewer ? (
              <form action={postComment} className="comment-form">
                <input type="hidden" name="profile_id" value={profile.id} />
                <textarea name="body" required maxLength={1000} rows={3} placeholder="Leave a comment..." />
                <button className="btn">Post comment</button>
              </form>
            ) : (
              <p>
                <Link href="/login">Log in</Link> to leave a comment.
              </p>
            )}
            <ul className="comments">
              {comments.map((c) => (
                <li key={c.id}>
                  <div className="comment-author">
                    <UserCard user={c} />
                  </div>
                  <div className="comment-body">
                    <div className="muted small">{c.created_at} UTC</div>
                    {/* Plain text only — React escapes it */}
                    <p>{c.body}</p>
                    {viewer && (isOwner || viewer.id === c.author_id) && (
                      <form action={deleteComment}>
                        <input type="hidden" name="comment_id" value={c.id} />
                        <button className="linklike small">delete</button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

function FriendButton({ status, profileId }) {
  const config = {
    none: { action: sendFriendRequest, label: '+ Add to Friends' },
    sent: { action: removeFriend, label: 'Request sent (cancel)' },
    received: { action: acceptFriendRequest, label: 'Accept friend request' },
    friends: { action: removeFriend, label: 'Friends ✓ (remove)' },
  }[status];
  return (
    <form action={config.action}>
      <input type="hidden" name="user_id" value={profileId} />
      <button className={`btn ${status === 'friends' || status === 'sent' ? 'btn-secondary' : ''}`}>
        {config.label}
      </button>
    </form>
  );
}
