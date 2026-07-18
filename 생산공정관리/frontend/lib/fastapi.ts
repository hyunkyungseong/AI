import { cookies } from "next/headers";

const FASTAPI_URL = process.env.FASTAPI_URL ?? "http://localhost:8000";
const COOKIE_NAME = "session_token";

// 서버(Route Handler·서버 컴포넌트) 전용 — httpOnly 쿠키의 토큰을 꺼내
// FastAPI에 Authorization 헤더로 대신 실어 보낸다. 브라우저 JS는 이 토큰에 접근할 수 없다.
export async function fastapiFetch(path: string, init?: RequestInit) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  return fetch(`${FASTAPI_URL}${path}`, { ...init, headers, cache: "no-store" });
}

export { COOKIE_NAME };
