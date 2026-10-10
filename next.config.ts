import type { NextConfig } from "next";

/**
 * 브라우저는 항상 같은 주소(localhost:3000)의 /api 로 요청하고,
 * Next.js 개발 서버가 그 요청을 Spring Boot로 대신 전달한다.
 * 이렇게 하면 CORS 설정이 필요 없고, refreshToken 쿠키도 정상적으로 붙는다.
 */
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
