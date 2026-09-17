/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/pricing", destination: "/demo", permanent: false },
    ];
  },
};
export default nextConfig;
