// Builds the HTML document shown inside a profile's sandboxed iframe.
// Pure function so the editor's live preview and the real profile render identically.

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildProfileDocument({ displayName, username, mood, avatarUrl, html, css, nonce }) {
  // Only our own nonce'd script may run (it reports the page height to the parent so the
  // iframe can grow). User HTML is sanitized on save and any <script> is blocked by this CSP.
  const csp = [
    "default-src 'none'",
    'img-src * data: blob:',
    "style-src 'unsafe-inline' https:",
    'font-src https: data:',
    `script-src 'nonce-${nonce}'`,
  ].join('; ');

  const avatar = avatarUrl
    ? `<img class="avatar" src="${escapeHtml(avatarUrl)}" alt="">`
    : `<div class="avatar avatar-empty">no pic</div>`;

  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<base target="_blank">
<style>
  body { margin: 0; padding: 16px; font-family: Verdana, Arial, sans-serif; font-size: 13px; }
  .profile-header { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
  .avatar { width: 160px; height: 160px; object-fit: cover; border: 1px solid #999; }
  .avatar-empty { display: flex; align-items: center; justify-content: center; background: #eee; color: #888; }
  .display-name { margin: 0 0 6px; font-size: 22px; }
  .username { color: #666; margin-bottom: 8px; }
  .about img { max-width: 100%; }
</style>
<style>${css ?? ''}</style>
</head>
<body>
<div class="profile">
  <div class="profile-header">
    ${avatar}
    <div class="profile-info">
      <h1 class="display-name">${escapeHtml(displayName)}</h1>
      <div class="username">@${escapeHtml(username)}</div>
      ${mood ? `<div class="mood"><b>Mood:</b> ${escapeHtml(mood)}</div>` : ''}
    </div>
  </div>
  <div class="about">${html ?? ''}</div>
</div>
<script nonce="${nonce}">
  (function () {
    // Measure the body itself: documentElement.scrollHeight never drops below the iframe's current height
    function send() {
      var cs = getComputedStyle(document.body);
      var h = document.body.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
      parent.postMessage({ type: 'profile-height', h: Math.ceil(h) }, '*');
    }
    new ResizeObserver(send).observe(document.body);
    addEventListener('load', send);
    send();
  })();
</script>
</body></html>`;
}
