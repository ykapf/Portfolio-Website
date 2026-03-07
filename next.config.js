/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["yt-dlp-wrap"],
  },
};

module.exports = nextConfig
