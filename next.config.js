/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/testsite",
  output: "export",
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
