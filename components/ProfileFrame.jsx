'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildProfileDocument } from '@/lib/profileDocument';

export default function ProfileFrame({ displayName, username, mood, avatarUrl, html, css }) {
  const ref = useRef(null);
  const [height, setHeight] = useState(300);

  // A fresh nonce per document; user content never sees it, so it can't run scripts.
  const doc = useMemo(() => {
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
    return buildProfileDocument({ displayName, username, mood, avatarUrl, html, css, nonce });
  }, [displayName, username, mood, avatarUrl, html, css]);

  useEffect(() => {
    function onMessage(e) {
      if (e.source !== ref.current?.contentWindow) return;
      if (e.data?.type === 'profile-height' && Number.isFinite(e.data.h)) {
        setHeight(Math.min(Math.max(e.data.h, 200), 20000));
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <iframe
      ref={ref}
      title={`${displayName}'s profile`}
      // NEVER add allow-same-origin here: combined with allow-scripts it removes the sandbox.
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      srcDoc={doc}
      style={{ width: '100%', height, border: 0, display: 'block' }}
    />
  );
}
