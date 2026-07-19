"use client";

import { useEffect, useMemo, useState } from "react";
import EditableCombo from "./EditableCombo";
import type { 단가행, 운영통계행 } from "@/components/Dashboard";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  거래처명: string; // 부모(PricingMaster.tsx)가 넘겨주는 현재 선택된 거래처 — create/edit 둘 다 고정
  initial: 단가행 | null; // create 모드에선 null
  taskRows: 운영통계행[]; // 업무명·작업명 자동완성 후보 추출용(표시는 안 함)
  onClose: () => void;
  onCreated: (row: 단가행) => void;
  onUpdated: (
    id: number,
    patch: Pick<
      단가행,
      | "출력단가"
      | "봉입단가"
      | "추가봉입단가"
      | "용지제작단가"
      | "봉투제작단가"
      | "삽지제작단가"
      | "각대대봉투단가"
      | "각대대봉투봉입단가"
      | "비고"
      | "수정일"
    >
  ) => void;
};

const label = "block text-sm text-gray-700 dark:text-gray-300";
const input =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";
const readonlyInput = `${input} cursor-not-allowed bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400`;

type 가격필드 =
  | "출력단가"
  | "봉입단가"
  | "추가봉입단가"
  | "각대대봉투봉입단가"
  | "용지제작단가"
  | "봉투제작단가"
  | "삽지제작단가"
  | "각대대봉투단가";

// 화면 표시 라벨은 Streamlit 원본과 동일하게 맞춤 — 각대대봉투봉입단가만 "수작업 단가"로 표시(기존
// 관례, scripts/app.py:1098 등). 순서도 Streamlit 입력 폼(app.py:1195~1204)과 동일하게 유지.
const 가격필드목록: { key: 가격필드; label: string }[] = [
  { key: "출력단가", label: "출력단가(원)" },
  { key: "봉입단가", label: "봉입단가(원)" },
  { key: "추가봉입단가", label: "추가봉입단가(원)" },
  { key: "각대대봉투봉입단가", label: "수작업 단가(원)" },
  { key: "용지제작단가", label: "용지제작단가(원)" },
  { key: "봉투제작단가", label: "봉투제작단가(원)" },
  { key: "삽지제작단가", label: "삽지제작단가(원)" },
  { key: "각대대봉투단가", label: "각대대봉투단가(원)" },
];

// ClientFormDialog.tsx와 동일한 모달 뼈대(오버레이·Escape·formKey 리마운트로 초기화, 재동기화용
// useEffect 없음). 차이점: 업무명·작업명은 <input list>+<datalist>로 자유 입력과 기존 값 추천을
// 동시에 지원(별도 콤보박스 컴포넌트 불필요, 사용자 확정 — 실적 없는 신규 업무에도 미리 가격을
// 매길 수 있어야 함). 수정 모드에선 업무명·작업명이 읽기전용(거래처명이 [4-D]에서 그랬듯
// PUT 바디에 이 필드 자체가 없어 애초에 서버가 안 받음).
export default function PricingFormDialog({
  open,
  mode,
  거래처명,
  initial,
  taskRows,
  onClose,
  onCreated,
  onUpdated,
}: Props) {
  const [업무명, set업무명] = useState(initial?.업무명 ?? "");
  const [작업명, set작업명] = useState(initial?.작업명 ?? "");
  const [가격, set가격] = useState<Record<가격필드, string>>({
    출력단가: initial ? String(initial.출력단가) : "",
    봉입단가: initial ? String(initial.봉입단가) : "",
    추가봉입단가: initial ? String(initial.추가봉입단가) : "",
    각대대봉투봉입단가: initial ? String(initial.각대대봉투봉입단가) : "",
    용지제작단가: initial ? String(initial.용지제작단가) : "",
    봉투제작단가: initial ? String(initial.봉투제작단가) : "",
    삽지제작단가: initial ? String(initial.삽지제작단가) : "",
    각대대봉투단가: initial ? String(initial.각대대봉투단가) : "",
  });
  const [비고, set비고] = useState(initial?.비고 ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const 업무명후보 = useMemo(() => {
    const set = new Set(taskRows.filter((t) => t.거래처명 === 거래처명).map((t) => t.업무명));
    return Array.from(set).filter(Boolean).sort();
  }, [taskRows, 거래처명]);

  const 작업명후보 = useMemo(() => {
    const set = new Set(
      taskRows.filter((t) => t.거래처명 === 거래처명 && t.업무명 === 업무명).map((t) => t.작업명)
    );
    return Array.from(set).filter(Boolean).sort();
  }, [taskRows, 거래처명, 업무명]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function 숫자값(key: 가격필드): number {
    const n = Number(가격[key]);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "create") {
        const payload = {
          거래처명,
          업무명: 업무명.trim() || null,
          작업명: 작업명.trim() || null,
          ...Object.fromEntries(가격필드목록.map(({ key }) => [key, 숫자값(key)])),
          비고: 비고.trim() || null,
        };
        const res = await fetch("/api/pricing-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.detail ?? "저장 중 오류가 발생했습니다.");
          return;
        }
        const 오늘 = new Date().toISOString().slice(0, 10);
        onCreated({
          id: data.id,
          거래처명,
          업무명: 업무명.trim(),
          작업명: 작업명.trim(),
          출력단가: 숫자값("출력단가"),
          봉입단가: 숫자값("봉입단가"),
          추가봉입단가: 숫자값("추가봉입단가"),
          각대대봉투봉입단가: 숫자값("각대대봉투봉입단가"),
          용지제작단가: 숫자값("용지제작단가"),
          봉투제작단가: 숫자값("봉투제작단가"),
          삽지제작단가: 숫자값("삽지제작단가"),
          각대대봉투단가: 숫자값("각대대봉투단가"),
          비고: 비고.trim(),
          등록일: 오늘,
          수정일: 오늘,
        });
      } else {
        const payload = {
          id: initial!.id,
          ...Object.fromEntries(가격필드목록.map(({ key }) => [key, 숫자값(key)])),
          비고: 비고.trim() || null,
        };
        const res = await fetch("/api/pricing-update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.detail ?? "수정 중 오류가 발생했습니다.");
          return;
        }
        const 오늘 = new Date().toISOString().slice(0, 10);
        onUpdated(initial!.id, {
          출력단가: 숫자값("출력단가"),
          봉입단가: 숫자값("봉입단가"),
          추가봉입단가: 숫자값("추가봉입단가"),
          각대대봉투봉입단가: 숫자값("각대대봉투봉입단가"),
          용지제작단가: 숫자값("용지제작단가"),
          봉투제작단가: 숫자값("봉투제작단가"),
          삽지제작단가: 숫자값("삽지제작단가"),
          각대대봉투단가: 숫자값("각대대봉투단가"),
          비고: 비고.trim(),
          수정일: 오늘,
        });
      }
    } catch {
      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {mode === "create" ? `새 단가 추가 — ${거래처명}` : `단가 수정 — ${거래처명}`}
        </h2>

        {error && (
          <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* 드롭다운 목록(EditableCombo)이 있는 필드는 <label>로 감싸지 않는다 — <label> 안에
              후보 목록(<ul>)까지 들어가면 label의 접근성 텍스트가 "업무명"+후보 항목 전체로
              합쳐져 버려서(2026-07-19 Playwright 실측으로 발견), aria-label을 입력에 직접
              달고 <div>+<span> 조합으로 대체했다. */}
          <div>
            <span className={label}>업무명</span>
            {mode === "edit" ? (
              <input value={업무명} readOnly aria-label="업무명" className={readonlyInput} />
            ) : (
              <EditableCombo
                value={업무명}
                onChange={set업무명}
                options={업무명후보}
                placeholder="비워두면 거래처 기본단가"
                aria-label="업무명"
                className={input}
              />
            )}
          </div>
          <div>
            <span className={label}>작업명</span>
            {mode === "edit" ? (
              <input value={작업명} readOnly aria-label="작업명" className={readonlyInput} />
            ) : (
              <EditableCombo
                value={작업명}
                onChange={set작업명}
                options={작업명후보}
                placeholder="비워두면 업무명 기본단가"
                aria-label="작업명"
                className={input}
              />
            )}
          </div>

          {/* 클릭 시 전체 선택 — Tab으로 넘어올 땐 브라우저가 기본으로 전체 선택해주지만
              마우스 클릭은 커서만 놓이는 게 기본 동작이라 둘의 느낌이 다름(사용자 요청,
              SKILL-08 관례와 동일). onFocus만으론 이미 포커스된 입력을 다시 클릭했을 때
              재적용이 안 되므로(EditableCombo.tsx에서 실측으로 확인된 것과 동일한 이유)
              onClick에도 같이 건다. */}
          {가격필드목록.map(({ key, label: 필드라벨 }) => (
            <label key={key} className={label}>
              {필드라벨}
              <input
                type="number"
                min={0}
                step="0.01"
                value={가격[key]}
                onChange={(e) => set가격((prev) => ({ ...prev, [key]: e.target.value }))}
                onFocus={(e) => e.target.select()}
                onClick={(e) => e.currentTarget.select()}
                placeholder="0.00"
                className={input}
              />
            </label>
          ))}

          <label className={`${label} col-span-2`}>
            비고
            <input
              value={비고}
              onChange={(e) => set비고(e.target.value)}
              onFocus={(e) => e.target.select()}
              onClick={(e) => e.currentTarget.select()}
              className={input}
            />
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
