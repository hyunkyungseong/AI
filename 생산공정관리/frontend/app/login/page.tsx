"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [사용자명, set사용자명] = useState("");
  const [비밀번호, set비밀번호] = useState("");
  const [오류, set오류] = useState("");
  const [로딩, set로딩] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    set오류("");
    set로딩(true);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 사용자명, 비밀번호 }),
    });

    set로딩(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      set오류(data.detail ?? "로그인에 실패했습니다");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-gray-900">로그인</h1>

        <div>
          <label className="mb-1 block text-sm text-gray-700">사용자명</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            value={사용자명}
            onChange={(e) => set사용자명(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-700">비밀번호</label>
          <input
            type="password"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            value={비밀번호}
            onChange={(e) => set비밀번호(e.target.value)}
          />
        </div>

        {오류 && <p className="text-sm text-red-600">{오류}</p>}

        <button
          type="submit"
          disabled={로딩}
          className="w-full rounded-md bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {로딩 ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}
