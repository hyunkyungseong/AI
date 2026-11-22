import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  // 화면 버전(2026-11-22) — package.json "version"을 빌드 시점에 화면 코드로 주입.
  // 화면 버전은 package.json 한 곳에서만 바꾼다(서버 버전은 scripts/version.py).
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
};

export default nextConfig;
