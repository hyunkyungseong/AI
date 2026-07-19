"use client";

import { useEffect, useState } from "react";
import type { 거래처행 } from "@/components/Dashboard";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initial: 거래처행 | null; // create 모드에선 null
  onClose: () => void;
  onCreated: (row: 거래처행) => void;
  onUpdated: (거래처명: string, patch: Pick<거래처행, "사업자등록번호" | "수신이메일" | "비고" | "수정일">) => void;
};

const 이메일형식 = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const label = "block text-sm text-gray-700 dark:text-gray-300";
const input =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";

// ConfirmDialog.tsx의 모달 뼈대(오버레이·Escape 키 처리·open=false면 렌더 안 함)를 그대로 가져와
// 메시지 대신 실제 입력 필드로 채운 프로젝트 첫 입력 폼 모달 ([4-D] 거래처 마스터 신규/수정 겸용).
// 거래처명은 다른 테이블들이 FK 없이 문자열로만 참조하고 있어 생성 후 절대 수정 불가 —
// edit 모드에선 읽기전용 입력창으로만 보여주고, 실제 PUT 요청 바디에도 이 필드를 아예 안 보낸다.
export default function ClientFormDialog({ open, mode, initial, onClose, onCreated, onUpdated }: Props) {
  // 부모(ClientMaster.tsx)가 다이얼로그를 열 때마다 key를 바꿔 이 컴포넌트를 강제 리마운트하므로,
  // useState 초기값이 항상 그 시점의 initial을 정확히 반영한다 — useEffect로 재동기화할 필요가
  // 없다(Next.js 16 react-hooks/set-state-in-effect 규칙 위반 회피, Tab4의 usePrunedSelection과
  // 같은 이유: 렌더링 중 조정 대신 React가 권장하는 "key로 리셋" 패턴 채택).
  const [거래처명, set거래처명] = useState(initial?.거래처명 ?? "");
  const [사업자등록번호, set사업자등록번호] = useState(initial?.사업자등록번호 ?? "");
  const [수신이메일, set수신이메일] = useState(initial?.수신이메일 ?? "");
  const [비고, set비고] = useState(initial?.비고 ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit() {
    const 이름 = 거래처명.trim();
    if (mode === "create" && 이름 === "") {
      setError("거래처명은 필수입니다");
      return;
    }
    if (수신이메일.trim() !== "" && !이메일형식.test(수신이메일.trim())) {
      setError("수신이메일 형식이 올바르지 않습니다");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (mode === "create") {
        const res = await fetch("/api/client-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 거래처명: 이름, 사업자등록번호, 수신이메일, 비고 }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.detail ?? "저장 중 오류가 발생했습니다.");
          return;
        }
        const 오늘 = new Date().toISOString().slice(0, 10);
        onCreated({ 거래처명: 이름, 사업자등록번호, 수신이메일, 비고, 등록일: 오늘, 수정일: 오늘 });
      } else {
        const res = await fetch("/api/client-update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 거래처명: initial!.거래처명, 사업자등록번호, 수신이메일, 비고 }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.detail ?? "수정 중 오류가 발생했습니다.");
          return;
        }
        const 오늘 = new Date().toISOString().slice(0, 10);
        onUpdated(initial!.거래처명, { 사업자등록번호, 수신이메일, 비고, 수정일: 오늘 });
      }
    } catch {
      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {mode === "create" ? "신규 거래처 추가" : `거래처 수정 — ${initial?.거래처명}`}
        </h2>

        {error && (
          <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <label className={label}>
            거래처명 {mode === "create" && "*"}
            <input
              value={거래처명}
              onChange={(e) => set거래처명(e.target.value)}
              readOnly={mode === "edit"}
              className={
                mode === "edit"
                  ? `${input} cursor-not-allowed bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400`
                  : input
              }
            />
          </label>
          <label className={label}>
            사업자등록번호
            <input value={사업자등록번호} onChange={(e) => set사업자등록번호(e.target.value)} className={input} />
          </label>
          <label className={label}>
            수신이메일
            <input value={수신이메일} onChange={(e) => set수신이메일(e.target.value)} className={input} />
          </label>
          <label className={label}>
            비고
            <textarea value={비고} onChange={(e) => set비고(e.target.value)} rows={2} className={input} />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
