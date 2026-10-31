/** @type {import('next').NextConfig} */
const nextConfig = {
  // The README card route reads the pre-rendered animation from disk at request time.
  outputFileTracingIncludes: {
    "/api/readme-racer": ["./public/readme/racer.webp"],
  },
};

module.exports = nextConfig
