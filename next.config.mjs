/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow dev resource access from different origins
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.1.3', '0.0.0.0'],
};

export default nextConfig;