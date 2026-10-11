import type { NextConfig } from "next";
const config: NextConfig = {
 poweredByHeader: false,
 turbopack: { root: process.cwd() },
 experimental: { workerThreads: true, cpus: 1 },
 async headers() { return [{ source: "/:path*", headers: [
 { key: "X-Content-Type-Options", value: "nosniff" },
 { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
 { key: "X-Frame-Options", value: "DENY" },
 { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
 { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
 { key: "X-DNS-Prefetch-Control", value: "off" },
 ...(process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") ? [{key:"Strict-Transport-Security",value:"max-age=31536000"}] : [])
 ] }]; }
}; export default config;
