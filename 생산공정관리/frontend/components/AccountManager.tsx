"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ConfirmDialog from "./ConfirmDialog";
import PasswordRuleHints from "./PasswordRuleHints";
import SessionGuard from "./SessionGuard";
import { 비밀번호_규칙통과 } from "@/lib/passwordRules";
import type { 내정보 } from "@/lib/session";

// 계정 관리 화면(관리자 전용, 2026-11-13 7단계 2-3) — app/accounts/page.tsx가 관리자에게만 보여준다
// (서버 API도 관리자가 아니면 403 — 이중 차단). 표·안내줄 모양은 StaffMaster.tsx와 맞춤.
// 목록·설정은 이 화면이 직접 불러온다(StaffMaster와 같은 방식). 서버 안전장치(본인 사용중지·관리자 해제 불가,
// 사용 중 관리자 최소 1명)는 화면에서도 버튼을 꺼서 미리 안내하되, 최종 판단은 서버.

type 계정행 = {
  id: number;
  사용자명: string;
  이름: string | null;
  관리자: boolean;
  사용여부: boolean;
  비밀번호변경필요: boolean;
  마지막활동: string | null;
  등록일: string | null;
};
type 설정 = { 유휴시간_분: number; 중복로그인차단: boolean };
type 배너 = { type: "success" | "error"; text: string };
type 확인작업 = { 종류: "사용중지" | "재사용" | "관리자지정" | "관리자해제"; 행: 계정행 };

const 배너색상: Record<배너["type"], string> = {
  success: "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  error: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
};
const th = "px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300";
const td = "px-3 py-1.5 text-gray-900 dark:text-gray-100";
const 입력칸 =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";
const 작은버튼 =
  "rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800";
const 주버튼 =
  "rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300 dark:disabled:bg-gray-700";
const 보조버튼 =
  "rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800";
const 유휴범위 = { 최소: 5, 최대: 480 };

function 시각표시(값: string | null) {
  if (!값) return "—";
  const m = 값.match(/^\d{4}-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  return m ? `${m[1]}-${m[2]} ${m[3]}:${m[4]}` : 값;
}
function 날짜표시(값: string | null) {
  if (!값) return "—";
  const m = 값.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : 값;
}
async function 오류문구(res: Response | null, 기본: string) {
  if (!res) return 기본;
  const data = await res.json().catch(() => ({}));
  return typeof data.detail === "string" ? data.detail : 기본;
}

// 공용 작은 창 틀(계정 추가·비밀번호 초기화·이름 수정)
function ModalFrame({ 제목, children }: { 제목: string; children: React.ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{제목}</h2>
        {children}
      </div>
    </div>
  );
}

export default function AccountManager({ 정보 }: { 정보: 내정보 }) {
  const [rows, setRows] = useState<계정행[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<배너 | null>(null);

  const [설정값, set설정값] = useState<설정 | null>(null);
  const [유휴입력, set유휴입력] = useState("");
  const [차단입력, set차단입력] = useState(true);
  const [설정저장중, set설정저장중] = useState(false);

  // 창 상태
  const [추가창, set추가창] = useState(false);
  const [추가, set추가] = useState({ 사용자명: "", 이름: "", 초기비밀번호: "", 관리자: false });
  const [초기화대상, set초기화대상] = useState<계정행 | null>(null);
  const [임시비밀번호, set임시비밀번호] = useState("");
  const [이름수정대상, set이름수정대상] = useState<계정행 | null>(null);
  const [새이름, set새이름] = useState("");
  const [확인대상, set확인대상] = useState<확인작업 | null>(null);
  const [창오류, set창오류] = useState("");
  const [처리중, set처리중] = useState(false);

  async function 목록새로고침() {
    try {
      const res = await fetch("/api/account-list", { cache: "no-store" });
      if (res.ok) setRows(await res.json());
      else setBanner({ type: "error", text: await 오류문구(res, "계정 목록을 불러오지 못했습니다.") });
    } catch {
      setBanner({ type: "error", text: "계정 목록을 불러오지 못했습니다." });
    } finally {
      setLoading(false);
    }
  }

  async function 설정불러오기() {
    try {
      const res = await fetch("/api/system-settings", { cache: "no-store" });
      if (!res.ok) return;
      const data: 설정 = await res.json();
      set설정값(data);
      set유휴입력(String(data.유휴시간_분));
      set차단입력(data.중복로그인차단);
    } catch {
      /* 표시만 안 됨 — 저장 시 다시 시도 */
    }
  }

  // StaffMaster와 같은 이유로 익명 async IIFE(린트: effect 안 직접 setState 금지, SKILL-36 선언 순서)
  useEffect(() => {
    (async () => {
      await Promise.all([목록새로고침(), 설정불러오기()]);
    })();
  }, []);

  function 창닫기() {
    set추가창(false);
    set초기화대상(null);
    set이름수정대상(null);
    set확인대상(null);
    set창오류("");
    set처리중(false);
  }

  async function 요청(url: string, method: "POST" | "PUT", body: unknown, 성공문구: string) {
    set처리중(true);
    set창오류("");
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!res || !res.ok) {
      set처리중(false);
      return { ok: false, 문구: await 오류문구(res, "처리하지 못했습니다.") };
    }
    창닫기();
    // 목록을 먼저 갱신한 뒤 완료 안내 — 안내가 먼저 뜨면 잠깐 옛 상태의 표와 함께 보이는 어긋남이 생김
    await 목록새로고침();
    setBanner({ type: "success", text: 성공문구 });
    return { ok: true, 문구: "" };
  }

  async function 계정추가() {
    const r = await 요청(
      "/api/account-create",
      "POST",
      { ...추가, 사용자명: 추가.사용자명.trim(), 이름: 추가.이름.trim() },
      `'${추가.사용자명.trim()}' 계정이 추가되었습니다. 첫 로그인 시 비밀번호를 변경하게 됩니다.`,
    );
    if (!r.ok) set창오류(r.문구);
  }

  async function 비밀번호초기화() {
    if (!초기화대상) return;
    const r = await 요청(
      "/api/account-reset-password",
      "PUT",
      { id: 초기화대상.id, 임시비밀번호 },
      `'${초기화대상.사용자명}' 비밀번호가 초기화되었습니다. 해당 직원은 다음 접속 시 비밀번호를 변경해야 합니다.`,
    );
    if (!r.ok) set창오류(r.문구);
  }

  async function 이름수정() {
    if (!이름수정대상) return;
    const r = await 요청(
      "/api/account-update",
      "PUT",
      { id: 이름수정대상.id, 이름: 새이름.trim() },
      `'${이름수정대상.사용자명}' 이름이 변경되었습니다.`,
    );
    if (!r.ok) set창오류(r.문구);
  }

  async function 확인작업실행() {
    if (!확인대상) return;
    const { 종류, 행 } = 확인대상;
    const 변경 =
      종류 === "사용중지" ? { 사용여부: false }
      : 종류 === "재사용" ? { 사용여부: true }
      : 종류 === "관리자지정" ? { 관리자: true }
      : { 관리자: false };
    const r = await 요청("/api/account-update", "PUT", { id: 행.id, ...변경 }, `'${행.사용자명}' ${종류} 완료되었습니다.`);
    if (!r.ok) {
      창닫기();
      setBanner({ type: "error", text: r.문구 });
    }
  }

  async function 설정저장() {
    const 분 = Number(유휴입력);
    if (!Number.isInteger(분) || 분 < 유휴범위.최소 || 분 > 유휴범위.최대) {
      setBanner({ type: "error", text: `자동 로그아웃 시간은 ${유휴범위.최소}~${유휴범위.최대}분 사이로 입력해 주세요.` });
      return;
    }
    set설정저장중(true);
    const res = await fetch("/api/system-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 유휴시간_분: 분, 중복로그인차단: 차단입력 }),
    }).catch(() => null);
    set설정저장중(false);
    if (!res || !res.ok) {
      setBanner({ type: "error", text: await 오류문구(res, "설정을 저장하지 못했습니다.") });
      return;
    }
    setBanner({ type: "success", text: "접속 보안 설정이 저장되었습니다. 모든 직원에게 바로 적용됩니다." });
    await 설정불러오기();
  }

  const 추가가능 = !!추가.사용자명.trim() && !!추가.이름.trim() && 비밀번호_규칙통과(추가.초기비밀번호) && !처리중;
  const 설정변경됨 = 설정값 !== null && (유휴입력 !== String(설정값.유휴시간_분) || 차단입력 !== 설정값.중복로그인차단);

  const 확인문구: Record<확인작업["종류"], { 제목: string; 문구: string; danger: boolean }> = {
    사용중지: { 제목: "계정 사용중지", 문구: "사용중지하면 이 직원은 즉시 접속이 끊기고 로그인할 수 없습니다.", danger: true },
    재사용: { 제목: "계정 재사용", 문구: "이 계정을 다시 사용할 수 있게 합니다.", danger: false },
    관리자지정: { 제목: "관리자 지정", 문구: "이 직원도 계정 관리 화면을 사용할 수 있게 됩니다.", danger: false },
    관리자해제: { 제목: "관리자 해제", 문구: "이 직원은 더 이상 계정 관리 화면을 사용할 수 없습니다.", danger: false },
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SessionGuard />
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Link href="/" className={보조버튼}>
            ← 업무 화면으로
          </Link>
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">계정 관리</h1>
        </div>
        <span className="text-xs text-gray-700 dark:text-gray-300" data-testid="user-name">
          {정보.이름 ? `${정보.이름} (${정보.사용자명})` : 정보.사용자명}
        </span>
      </header>

      <main className="space-y-6 p-6">
        {banner && (
          <div role="status" className={`rounded-md border px-3 py-2 text-sm ${배너색상[banner.type]}`}>
            {banner.text}
          </div>
        )}

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">계정 목록</h2>
            <button
              type="button"
              className={주버튼}
              onClick={() => {
                set추가({ 사용자명: "", 이름: "", 초기비밀번호: "", 관리자: false });
                set창오류("");
                set추가창(true);
              }}
            >
              + 계정 추가
            </button>
          </div>
          <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm" data-testid="account-table">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className={th}>ID</th>
                  <th className={th}>이름</th>
                  <th className={th}>권한</th>
                  <th className={th}>상태</th>
                  <th className={th}>비밀번호</th>
                  <th className={th}>마지막 접속</th>
                  <th className={th}>등록일</th>
                  <th className={th}>작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td className={td} colSpan={8}>불러오는 중...</td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const 본인 = r.사용자명 === 정보.사용자명;
                    const 본인안내 = 본인 ? "본인 계정은 변경할 수 없습니다" : undefined;
                    // 사용중지된 계정은 [재사용]만 동작(2026-11-13 사용자 제보 — 줄 전체를 흐리게만 해서 버튼이
                    // 꺼진 것처럼 보이는데 실제로 눌리던 문제). 서버도 같은 규칙으로 거부(api.py 계정_수정·비밀번호초기화).
                    const 중지됨 = !r.사용여부;
                    const 중지안내 = 중지됨 ? "사용중지된 계정입니다. [재사용] 후 변경할 수 있습니다" : undefined;
                    // 흐림은 글자 칸에만 — 작업 칸까지 흐리면 [재사용]도 꺼진 것처럼 보임
                    const 글자칸 = 중지됨 ? `${td} opacity-50` : td;
                    return (
                      <tr key={r.id} data-account={r.사용자명}>
                        <td className={글자칸}>{r.사용자명}{본인 && <span className="ml-1 text-xs text-gray-500">(본인)</span>}</td>
                        <td className={글자칸}>{r.이름 ?? "—"}</td>
                        <td className={글자칸}>{r.관리자 ? "관리자" : "일반"}</td>
                        <td className={글자칸}>{r.사용여부 ? "사용 중" : "사용중지"}</td>
                        <td className={글자칸}>
                          {r.비밀번호변경필요 ? <span className="text-amber-700 dark:text-amber-400">변경 대기</span> : "—"}
                        </td>
                        <td className={글자칸}>{시각표시(r.마지막활동)}</td>
                        <td className={글자칸}>{날짜표시(r.등록일)}</td>
                        <td className={td}>
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              className={작은버튼}
                              disabled={중지됨}
                              title={중지안내}
                              onClick={() => {
                                set새이름(r.이름 ?? "");
                                set창오류("");
                                set이름수정대상(r);
                              }}
                            >
                              이름 수정
                            </button>
                            <button
                              type="button"
                              className={작은버튼}
                              disabled={중지됨 || (본인 && r.관리자)}
                              title={중지안내 ?? (본인 && r.관리자 ? 본인안내 : undefined)}
                              onClick={() => set확인대상({ 종류: r.관리자 ? "관리자해제" : "관리자지정", 행: r })}
                            >
                              {r.관리자 ? "관리자 해제" : "관리자 지정"}
                            </button>
                            <button
                              type="button"
                              className={작은버튼}
                              disabled={본인 && r.사용여부}
                              title={본인 && r.사용여부 ? 본인안내 : undefined}
                              onClick={() => set확인대상({ 종류: r.사용여부 ? "사용중지" : "재사용", 행: r })}
                            >
                              {r.사용여부 ? "사용중지" : "재사용"}
                            </button>
                            <button
                              type="button"
                              className={작은버튼}
                              disabled={중지됨}
                              title={중지안내}
                              onClick={() => {
                                set임시비밀번호("");
                                set창오류("");
                                set초기화대상(r);
                              }}
                            >
                              비밀번호 초기화
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="max-w-xl rounded-md border border-gray-200 p-4 dark:border-gray-800" data-testid="security-settings">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">접속 보안 설정</h2>
          <div className="mt-3 space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              자동 로그아웃 시간
              <input
                type="number"
                min={유휴범위.최소}
                max={유휴범위.최대}
                value={유휴입력}
                onChange={(e) => set유휴입력(e.target.value)}
                className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                aria-label="자동 로그아웃 시간(분)"
              />
              분 동안 사용하지 않으면 자동 로그아웃 ({유휴범위.최소}~{유휴범위.최대})
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={차단입력}
                onChange={(e) => set차단입력(e.target.checked)}
                className="mt-0.5"
                aria-label="중복 로그인 차단"
              />
              <span>
                중복 로그인 차단
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  같은 ID로 다른 곳에서 로그인하면 먼저 접속한 쪽이 끊깁니다.
                </span>
              </span>
            </label>
          </div>
          <div className="mt-4">
            <button type="button" className={주버튼} disabled={!설정변경됨 || 설정저장중} onClick={설정저장}>
              {설정저장중 ? "저장 중..." : "저장"}
            </button>
          </div>
        </section>
      </main>

      {추가창 && (
        <ModalFrame 제목="계정 추가">
          <div className="mt-4 space-y-3">
            <label className="block text-sm text-gray-700 dark:text-gray-300">
              ID (로그인할 때 입력)
              <input autoFocus className={입력칸} value={추가.사용자명} onChange={(e) => set추가({ ...추가, 사용자명: e.target.value })} />
            </label>
            <label className="block text-sm text-gray-700 dark:text-gray-300">
              이름
              <input className={입력칸} value={추가.이름} onChange={(e) => set추가({ ...추가, 이름: e.target.value })} />
            </label>
            <label className="block text-sm text-gray-700 dark:text-gray-300">
              초기 비밀번호 (직원에게 전달 — 첫 로그인 시 변경)
              <input
                type="text"
                autoComplete="off"
                className={입력칸}
                value={추가.초기비밀번호}
                onChange={(e) => set추가({ ...추가, 초기비밀번호: e.target.value })}
              />
              <PasswordRuleHints 값={추가.초기비밀번호} />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={추가.관리자} onChange={(e) => set추가({ ...추가, 관리자: e.target.checked })} />
              관리자로 지정 (계정 관리 화면 사용 가능)
            </label>
          </div>
          {창오류 && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{창오류}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={보조버튼} onClick={창닫기}>취소</button>
            <button type="button" className={주버튼} disabled={!추가가능} onClick={계정추가}>
              {처리중 ? "추가 중..." : "추가"}
            </button>
          </div>
        </ModalFrame>
      )}

      {초기화대상 && (
        <ModalFrame 제목={`비밀번호 초기화 — ${초기화대상.사용자명}`}>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            임시 비밀번호를 정해 직원에게 전달해 주세요. 직원은 다음 접속 시 반드시 비밀번호를 변경해야 합니다.
          </p>
          <label className="mt-3 block text-sm text-gray-700 dark:text-gray-300">
            임시 비밀번호
            <input
              type="text"
              autoFocus
              autoComplete="off"
              className={입력칸}
              value={임시비밀번호}
              onChange={(e) => set임시비밀번호(e.target.value)}
            />
            <PasswordRuleHints 값={임시비밀번호} />
          </label>
          {창오류 && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{창오류}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={보조버튼} onClick={창닫기}>취소</button>
            <button type="button" className={주버튼} disabled={!비밀번호_규칙통과(임시비밀번호) || 처리중} onClick={비밀번호초기화}>
              {처리중 ? "처리 중..." : "초기화"}
            </button>
          </div>
        </ModalFrame>
      )}

      {이름수정대상 && (
        <ModalFrame 제목={`이름 수정 — ${이름수정대상.사용자명}`}>
          <label className="mt-3 block text-sm text-gray-700 dark:text-gray-300">
            이름
            <input autoFocus className={입력칸} value={새이름} onChange={(e) => set새이름(e.target.value)} />
          </label>
          {창오류 && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{창오류}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={보조버튼} onClick={창닫기}>취소</button>
            <button type="button" className={주버튼} disabled={!새이름.trim() || 처리중} onClick={이름수정}>
              {처리중 ? "저장 중..." : "저장"}
            </button>
          </div>
        </ModalFrame>
      )}

      <ConfirmDialog
        open={확인대상 !== null}
        title={확인대상 ? 확인문구[확인대상.종류].제목 : ""}
        message={확인대상 ? 확인문구[확인대상.종류].문구 : ""}
        items={확인대상 ? [`${확인대상.행.사용자명}${확인대상.행.이름 ? ` (${확인대상.행.이름})` : ""}`] : undefined}
        confirmLabel={확인대상 ? 확인문구[확인대상.종류].제목.replace("계정 ", "") : "확인"}
        cancelLabel="취소"
        danger={확인대상 ? 확인문구[확인대상.종류].danger : false}
        dangerText="다시 [재사용]을 누르면 복구할 수 있습니다."
        onConfirm={확인작업실행}
        onClose={창닫기}
      />
    </div>
  );
}
