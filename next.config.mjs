/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep production `next build` output in `.next` and isolate the running
  // `next dev` cache so builds cannot wipe live demo chunks mid-session.
  distDir: process.env.HL_DIST_DIR || ".next",
  experimental: {
    outputFileTracingIncludes: {
      "/api/downloads/windows": ["./private/downloads/**/*"],
    },
  },
};
export default nextConfig;
