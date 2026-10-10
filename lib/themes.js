// Starter themes for the editor. Users load one with a click, then edit freely.
// Classes available to style: .profile, .profile-header, .avatar, .profile-info,
// .display-name, .username, .mood, .about

export const DEFAULT_HTML = `<h2>About me</h2>
<p>Hi! Welcome to my page. Edit this in <b>Edit Profile</b>.</p>

<h2>Who I'd like to meet</h2>
<p>People who like good music.</p>`;

export const THEMES = [
  {
    name: 'Classic',
    css: `body { background: #e5ecf9; }
.profile { background: #fff; border: 1px solid #6699cc; padding: 12px; }
.about h2 { background: #6699cc; color: #fff; font-size: 14px; padding: 4px 8px; }
.display-name { color: #336699; }`,
  },
  {
    name: 'Emo Night',
    css: `body { background: #000; color: #ddd; font-family: 'Courier New', monospace; }
.profile { border: 2px solid #8b0000; padding: 16px; background: #111; }
.display-name { color: #ff1a1a; text-shadow: 0 0 8px #ff0000; }
.about h2 { color: #ff1a1a; border-bottom: 1px dashed #8b0000; }
.avatar { filter: grayscale(1) contrast(1.2); border: 2px solid #8b0000; }
a { color: #ff6666; }`,
  },
  {
    name: 'Glitter Pink',
    css: `body {
  background: repeating-linear-gradient(45deg, #ffd1ec, #ffd1ec 20px, #ffe6f5 20px, #ffe6f5 40px);
  font-family: 'Comic Sans MS', cursive;
}
.profile { background: rgba(255,255,255,0.85); border: 4px dotted #ff3399; border-radius: 20px; padding: 16px; }
.display-name { color: #ff3399; font-size: 30px; }
.avatar { border-radius: 50%; border: 4px solid #ff66b3; }
.about h2 { color: #cc0066; }`,
  },
  {
    name: 'Retro Terminal',
    css: `body { background: #001100; color: #33ff33; font-family: 'Courier New', monospace; }
.profile { border: 1px solid #33ff33; padding: 16px; box-shadow: 0 0 20px #00ff0055; }
.display-name::before { content: '> '; }
.display-name, .about h2 { color: #66ff66; }
.username, .mood { color: #22aa22; }
.avatar { border: 1px solid #33ff33; image-rendering: pixelated; }
a { color: #99ff99; }`,
  },
  {
    name: 'Blank',
    css: '',
  },
];
