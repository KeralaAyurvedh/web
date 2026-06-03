import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/uploads/kerala-ayurvedh.apk",
        destination: "https://web-laqb.onrender.com/downloads/kerala-ayurvedh.apk",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
