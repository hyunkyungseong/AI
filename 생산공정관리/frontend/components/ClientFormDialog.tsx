"use client";

import { useEffect, useMemo, useState } from "react";
import EditableCombo from "./EditableCombo";
import type { 거래처행, 운영통계행 } from "@/components/Dashboard";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initial: 거래처행 | null; // create 모드에선 null
  clientRows: 거래처행[]; // 이미 등록된 거래처명 제외용(2026-08-09, 거래처명 자동완성 후보 계산)
  taskRows: 운영통계행[]; // 거래처명 자동완성 후보 추출용(표시는 안 함) — PricingFormDialog.tsx와 동일 패턴
  onClose: () => void;
  onCreated: (row: 거래처행) => void;
  onUpdated: (
    거래처명: string,
    patch: Pick<거래처행, "사업자등록번호" | "수신이메일" | "비고" | "역발행" | "수정일">
  ) => void;
};

const 이메일형식 = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const label = "block text-sm text-gray-700 dark:text-gray-300";
const input =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";

// ConfirmDialog.tsx의 모달 뼈대(오버레이·Escape 키 처리·open=false면 렌더 안 함)를 그대로 가져와
// 메시지 대신 실제 입력 필드로 채운 프로젝트 첫 입력 폼 모달 ([4-D] 거래처 마스터 신규/수정 겸용).
// 거래처명은 다른 테이블들이 FK 없이 문자열로만 참조하고 있어 생성 후 절대 수정 불가 —
// edit 모드에선 읽기전용 입력창으로만 보여주고, 실제 PUT 요청 바디에도 이 필드를 아예 안 보낸다.
export default function ClientFormDialog({
  open,
  mode,
  initial,
  clientRows,
  taskRows,
  onClose,
  onCreated,
  onUpdated,
}: Props) {
  // 부모(ClientMaster.tsx)가 다이얼로그를 열 때마다 key를 바꿔 이 컴포넌트를 강제 리마운트하므로,
  // useState 초기값이 항상 그 시점의 initial을 정확히 반영한다 — useEffect로 재동기화할 필요가
  // 없다(Next.js 16 react-hooks/set-state-in-effect 규칙 위반 회피, Tab4의 usePrunedSelection과
  // 같은 이유: 렌더링 중 조정 대신 React가 권장하는 "key로 리셋" 패턴 채택).
  const [거래처명, set거래처명] = useState(initial?.거래처명 ?? "");
  const [사업자등록번호, set사업자등록번호] = useState(initial?.사업자등록번호 ?? "");
  const [수신이메일, set수신이메일] = useState(initial?.수신이메일 ?? "");
  const [비고, set비고] = useState(initial?.비고 ?? "");
  // 역발행(2026-08-24) — 신규 등록 시 기본값은 항상 비워둠(체크 안 함), 요청사항과 일치.
  const [역발행, set역발행] = useState(initial?.역발행 ?? false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 실제 운영통계자료에 등장하지만 아직 거래처마스터에 등록 안 된 거래처명 후보(2026-08-09,
  // 사용자 요청: "직접 키인도 가능하고 콤보박스로 등록된 거래처명이 보였으면 좋겠다") — 오타로
  // 실제 데이터와 이름이 어긋나는 걸 방지하되, 직접 타이핑도 그대로 허용(EditableCombo).
  const 거래처명후보 = useMemo(() => {
    const 등록됨 = new Set(clientRows.map((c) => c.거래처명));
    const set = new Set(taskRows.map((t) => t.거래처명).filter((n) => n && !등록됨.has(n)));
    return Array.from(set).sort();
  }, [taskRows, clientRows]);

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
          body: JSON.stringify({ 거래처명: 이름, 사업자등록번호, 수신이메일, 비고, 역발행 }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.detail ?? "저장 중 오류가 발생했습니다.");
          return;
        }
        const 오늘 = new Date().toISOString().slice(0, 10);
        onCreated({ 거래처명: 이름, 사업자등록번호, 수신이메일, 비고, 역발행, 등록일: 오늘, 수정일: 오늘 });
      } else {
        const res = await fetch("/api/client-update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 거래처명: initial!.거래처명, 사업자등록번호, 수신이메일, 비고, 역발행 }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.detail ?? "수정 중 오류가 발생했습니다.");
          return;
        }
        const 오늘 = new Date().toISOString().slice(0, 10);
        onUpdated(initial!.거래처명, { 사업자등록번호, 수신이메일, 비고, 역발행, 수정일: 오늘 });
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
          {/* EditableCombo의 드롭다운 목록(<ul>)이 <label> 안에 들어가면 label의 접근성 텍스트가
              "거래처명"+후보 항목 전체로 합쳐지는 문제가 있어(PricingFormDialog.tsx에서 실측으로
              발견된 것과 동일한 이유), <label> 대신 <div>+<span> 조합과 aria-label을 쓴다. */}
          <div>
            <span className={label}>거래처명 {mode === "create" && "*"}</span>
            {mode === "edit" ? (
              <input
                value={거래처명}
                readOnly
                aria-label="거래처명"
                className={`${input} cursor-not-allowed bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400`}
              />
            ) : (
              <EditableCombo
                value={거래처명}
                onChange={set거래처명}
                options={거래처명후보}
                placeholder="직접 입력하거나 목록에서 선택"
                aria-label="거래처명"
                className={input}
              />
            )}
          </div>
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
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={역발행} onChange={(e) => set역발행(e.target.checked)} />
            역발행 (고객사가 거래명세서를 역으로 발행하는 거래처)
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
