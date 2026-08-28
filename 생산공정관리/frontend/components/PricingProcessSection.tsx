"use client";

import { useEffect, useRef, useState } from "react";
import type { 공정단가행 } from "@/components/Dashboard";

type Props = {
  단가마스터_id: number;
  rows: 공정단가행[];
  onChange: (rows: 공정단가행[]) => void;
};

const inputCls =
  "rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

// 2026-08-21 신규 — 당사 생산공정관리시스템이 5월분부터 내려주는 공정 세분화 컬럼 8종. 봉입(기계)·
// 수작업은 기존 봉입단가·각대대봉투봉입단가를 그대로 재사용해 이 목록에 없다(scripts/billing.py
// _작업별_품목누적() 참고). 공정은 PricingMaterialSection.tsx의 자재와 달리 고정 enum이라 자재명
// 검색·드롭다운 없이 select 하나로 고르는 단순한 구조로 뒀다.
const 공정코드옵션: { value: 공정단가행["공정코드"]; label: string }[] = [
  { value: "압착", label: "압착" },
  { value: "주소출력", label: "주소출력" },
  { value: "중철", label: "중철" },
  { value: "제본", label: "제본" },
  { value: "무광코팅", label: "무광코팅" },
  { value: "유광코팅", label: "유광코팅" },
  { value: "에폭시", label: "에폭시" },
  { value: "날개접지", label: "날개접지" },
];

// 이미 등록된 공정코드는 select 후보에서 빼서 UNIQUE(단가마스터_id, 공정코드) 제약으로 인한 409
// 오류를 미리 막는다 — 수정 중인 행 자신의 공정코드는 계속 보여야 하므로 editing과 같은 id는 제외.
function 미등록옵션(rows: 공정단가행[], editing: number | "new" | null) {
  const 등록됨 = new Set(rows.filter((r) => editing === "new" || r.id !== editing).map((r) => r.공정코드));
  return 공정코드옵션.filter((c) => !등록됨.has(c.value));
}

// el 자신이 아니라 진짜로 세로 스크롤이 걸려 있는 조상을 찾는다(PricingMaterialSection.tsx와 동일
// 패턴) — 이 컴포넌트를 담은 PricingFormDialog가 다이얼로그 전체를 스크롤시키는 구조라, editorRef만
// scrollIntoView하면 편집창 박스 안쪽까지만 보이고 그 아래 취소·저장 버튼은 화면 밖에 남는다.
function 스크롤가능부모(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const style = window.getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}

export default function PricingProcessSection({ 단가마스터_id, rows, onChange }: Props) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [공정코드, set공정코드] = useState<공정단가행["공정코드"]>("압착");
  const [단가, set단가] = useState("");
  const [비고, set비고] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const 옵션목록 = 미등록옵션(rows, editing);

  // 공정단가를 이미 여러 개 등록해둔 상태에서 "+ 공정단가 추가"·"수정"을 누르면 편집창이 목록 맨
  // 아래에 나타나 화면 밖에 있는 경우가 많아, 편집창이 열릴 때마다 다이얼로그 전체를 맨 아래까지
  // 스크롤해 취소·저장 버튼까지 보이게 한다(PricingMaterialSection.tsx와 동일 패턴, 2026-08-21).
  useEffect(() => {
    if (editing === null) return;
    const container = 스크롤가능부모(editorRef.current);
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    } else {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [editing]);

  function openNew() {
    setEditing("new");
    set공정코드(미등록옵션(rows, "new")[0]?.value ?? "압착");
    set단가("");
    set비고("");
    setError(null);
  }

  function openEdit(row: 공정단가행) {
    setEditing(row.id);
    set공정코드(row.공정코드);
    set단가(String(row.단가));
    set비고(row.비고 ?? "");
    setError(null);
  }

  function closeEditor() {
    setEditing(null);
    setError(null);
  }

  async function handleSave() {
    setError(null);
    const 단가값 = Number(단가);
    if (!Number.isFinite(단가값) || 단가값 < 0) {
      setError("단가를 올바르게 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      if (editing === "new") {
        const res = await fetch("/api/pricing-process-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 단가마스터_id, 공정코드, 단가: 단가값, 비고: 비고.trim() || null }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.detail ?? "저장 중 오류가 발생했습니다.");
          return;
        }
        onChange([...rows, { id: data.id, 단가마스터_id, 공정코드, 단가: 단가값, 비고: 비고.trim() || null }]);
      } else if (typeof editing === "number") {
        const res = await fetch("/api/pricing-process-update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing, 단가: 단가값, 비고: 비고.trim() || null }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.detail ?? "수정 중 오류가 발생했습니다.");
          return;
        }
        onChange(rows.map((r) => (r.id === editing ? { ...r, 단가: 단가값, 비고: 비고.trim() || null } : r)));
      }
      closeEditor();
    } catch {
      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("이 공정단가를 삭제하시겠습니까?")) return;
    const res = await fetch("/api/pricing-process-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: [id] }),
    });
    if (res.ok) {
      onChange(rows.filter((r) => r.id !== id));
    }
  }

  return (
    <div className="col-span-2 rounded-md border border-gray-200 p-3 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700 dark:text-gray-300">
          공정별 단가{" "}
          <span className="text-xs text-gray-400">
            — 압착·주소출력·중철·제본·무광코팅·유광코팅·에폭시·날개접지 (봉입·수작업은 위 기본단가 사용)
          </span>
        </span>
        {editing === null && 옵션목록.length > 0 && (
          <button type="button" onClick={openNew} className="text-xs text-gray-600 hover:underline dark:text-gray-300">
            + 공정단가 추가
          </button>
        )}
      </div>

      {rows.length === 0 && editing === null && (
        <p className="mt-2 text-xs text-gray-400">등록된 공정단가가 없습니다.</p>
      )}

      {rows.length > 0 && (
        <ul className="mt-2 space-y-1">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 rounded border border-gray-100 px-2 py-1 text-xs dark:border-gray-800"
            >
              <span className="truncate">
                <span className="font-medium text-gray-700 dark:text-gray-300">{r.공정코드}</span>{" "}
                <span className="text-gray-500 dark:text-gray-400">{r.단가.toLocaleString()}원</span>{" "}
                {r.비고 && <span className="text-gray-400">({r.비고})</span>}
              </span>
              <span className="flex shrink-0 gap-2">
                <button type="button" onClick={() => openEdit(r)} className="text-gray-600 hover:underline dark:text-gray-300">
                  수정
                </button>
                <button type="button" onClick={() => handleDelete(r.id)} className="text-red-600 hover:underline dark:text-red-400">
                  삭제
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <div
          ref={editorRef}
          className="mt-3 space-y-2 rounded-md border border-dashed border-gray-300 p-3 dark:border-gray-700"
        >
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-400">
              공정
              <select
                value={공정코드}
                onChange={(e) => set공정코드(e.target.value as 공정단가행["공정코드"])}
                disabled={typeof editing === "number"}
                className={`mt-1 w-full ${inputCls} disabled:opacity-60`}
              >
                {옵션목록.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-gray-600 dark:text-gray-400">
              단가(원)
              <input
                type="number"
                min={0}
                step="0.01"
                value={단가}
                onChange={(e) => set단가(e.target.value)}
                className={`mt-1 w-full ${inputCls}`}
              />
            </label>
            <label className="col-span-2 text-xs text-gray-600 dark:text-gray-400">
              비고(선택)
              <input value={비고} onChange={(e) => set비고(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeEditor}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
            >
              {submitting ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
