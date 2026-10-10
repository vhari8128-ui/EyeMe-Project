/** @type {import('next').NextConfig} */
const nextConfig = {
  // Every page reads the logged-in user from a cookie, so pages render per request.
  // The dev-mode badge sits on top of the music player's buttons.
  devIndicators: false,
};

export default nextConfig;
