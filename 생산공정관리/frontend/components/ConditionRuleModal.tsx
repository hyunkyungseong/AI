"use client";

import { useEffect, useState } from "react";

export type 규칙조건단일 = { field: "코드" | "품목" | "작업명"; op: "==" | "contains"; value: string };
export type 규칙조건AND그룹 = { and: 규칙조건단일[] };
export type 규칙조건 = { or: 규칙조건AND그룹[] };

const 필드옵션 = [
  { value: "코드" as const, label: "공정 코드" },
  { value: "품목" as const, label: "품목명" },
  { value: "작업명" as const, label: "작업명" },
];

function 연산자옵션(field: string) {
  // 코드는 정해진 값(P/M/MM/E/F 등) 중 하나라 일치함만 의미 있고, 품목·작업명(텍스트)은
  // 포함함(contains)도 지원 — billing.py 평가_조건()과 동일한 필드별 연산자 제한(2026-07-22).
  if (field === "코드") return [{ value: "==" as const, label: "이 일치함" }];
  return [
    { value: "==" as const, label: "이 일치함" },
    { value: "contains" as const, label: "을 포함함" },
  ];
}

function 빈조건단일(): 규칙조건단일 {
  return { field: "코드", op: "==", value: "" };
}

const inputCls =
  "rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

type Props = {
  initial: { 최종청구품명: string; 조건: 규칙조건 } | null; // null = 새 규칙(빈 값으로 시작)
  코드옵션?: string[]; // 지금 원본(왼쪽) 표에 실제 등장하는 값 — 오타 방지용 datalist 후보
  품목옵션?: string[];
  작업명옵션?: string[];
  onSave: (결과: { 최종청구품명: string; 조건: 규칙조건 }) => void;
  onCancel: () => void;
};

function 값옵션(field: 규칙조건단일["field"], 코드옵션: string[], 품목옵션: string[], 작업명옵션: string[]) {
  if (field === "코드") return 코드옵션;
  if (field === "품목") return 품목옵션;
  return 작업명옵션;
}

// 오른쪽 표 셀 클릭 시 뜨는 조건식 편집창 — OR 그룹 여러 개, 그룹마다 AND 조건 여러 개를
// 조합해서 "공정 코드 == P" 같은 규칙을 만든다. 그룹을 하나도 안 만들면(빈 상태로 저장)
// billing.평가_조건()이 "전체 매칭"으로 취급 — 코드 구분 없는 합산 규칙(2026-07-22 신규,
// [거래명세서편집_규칙엔진] 착수 순서 4).
//
// 값 입력칸은 <datalist>로 지금 원본 표에 실제 등장하는 값을 제안해준다(2026-07-22, 사용자 피드백:
// "원본의 품명을 복사할 수 있으면 좋겠어 — 직접 키인은 오타 위험") — 목록에서 고를 수도, 그냥
// 타이핑할 수도 있다(select와 달리 강제하지 않음, "포함함" 연산자는 부분 문자열도 허용해야 하므로).
//
// 열림/닫힘은 부모(InvoicePreviewDialog)가 조건부 렌더링으로 통째로 마운트/언마운트해서 제어한다
// (열릴 때마다 완전히 새로 마운트되므로 initial이 바뀌어도 useState 초기값이 항상 최신으로 잡힘) —
// "open이 될 때마다 useEffect로 state를 되돌리는" 패턴은 react-hooks 린트가 지적하는
// set-state-in-effect 문제를 일으켜서 이 구조로 대체함.
export default function ConditionRuleModal({
  initial,
  코드옵션 = [],
  품목옵션 = [],
  작업명옵션 = [],
  onSave,
  onCancel,
}: Props) {
  const [최종청구품명, set최종청구품명] = useState(initial?.최종청구품명 ?? "");
  const [groups, setGroups] = useState<규칙조건AND그룹[]>(
    () => initial?.조건.or.map((g) => ({ and: g.and.map((c) => ({ ...c })) })) ?? []
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  function addGroup() {
    setGroups((prev) => [...prev, { and: [빈조건단일()] }]);
  }
  function removeGroup(gi: number) {
    setGroups((prev) => prev.filter((_, i) => i !== gi));
  }
  function addCond(gi: number) {
    setGroups((prev) => prev.map((g, i) => (i === gi ? { and: [...g.and, 빈조건단일()] } : g)));
  }
  function removeCond(gi: number, ci: number) {
    setGroups((prev) => prev.map((g, i) => (i === gi ? { and: g.and.filter((_, j) => j !== ci) } : g)));
  }
  function updateCond(gi: number, ci: number, patch: Partial<규칙조건단일>) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === gi
          ? {
              and: g.and.map((c, j) => {
                if (j !== ci) return c;
                const next = { ...c, ...patch };
                // 필드가 바뀌면(예: 품목→코드) 지금 연산자가 새 필드에서 지원 안 될 수 있으므로 보정
                const 허용 = 연산자옵션(next.field).map((o) => o.value);
                if (!허용.includes(next.op)) next.op = 허용[0];
                return next;
              }),
            }
          : g
      )
    );
  }

  function handleSave() {
    if (!최종청구품명.trim()) return;
    onSave({ 최종청구품명: 최종청구품명.trim(), 조건: { or: groups.filter((g) => g.and.length > 0) } });
  }

  return (
    <div className="absolute inset-y-0 right-0 z-20 flex w-full max-w-md flex-col overflow-auto border-l border-gray-300 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">청구 조건식 편집</h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        왼쪽에 열려 있는 원본 표를 참고하면서 조건을 만드세요.
      </p>

      <label className="mt-3 block text-sm text-gray-700 dark:text-gray-300">
        최종 청구 품명
        <input
          type="text"
          list="최종청구품명옵션"
          value={최종청구품명}
          onChange={(e) => set최종청구품명(e.target.value)}
          placeholder="예: 통합 인쇄봉입비"
          className={`mt-1 w-full ${inputCls}`}
        />
        <datalist id="최종청구품명옵션">
          {품목옵션.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </label>

        <div className="mt-4 space-y-3">
          {groups.length === 0 && (
            <p className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
              조건 그룹이 없으면 &quot;전체 합산&quot; 규칙이 됩니다 — 코드 구분 없이 왼쪽 원본 항목
              전부를 이 하나의 행으로 합칩니다.
            </p>
          )}
          {groups.map((group, gi) => (
            <div key={gi} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  조건 그룹 {gi + 1} {gi > 0 && <span className="text-gray-400">(OR)</span>}
                </span>
                <button type="button" onClick={() => removeGroup(gi)} className="text-xs text-red-600 hover:underline dark:text-red-400">
                  그룹 삭제
                </button>
              </div>

              <div className="mt-2 space-y-2">
                {group.and.map((cond, ci) => (
                  <div key={ci} className="flex flex-wrap items-center gap-2">
                    {ci > 0 && <span className="text-xs text-gray-400">그리고(AND)</span>}
                    <select
                      value={cond.field}
                      onChange={(e) => updateCond(gi, ci, { field: e.target.value as 규칙조건단일["field"] })}
                      className={inputCls}
                    >
                      {필드옵션.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={cond.op}
                      onChange={(e) => updateCond(gi, ci, { op: e.target.value as 규칙조건단일["op"] })}
                      className={inputCls}
                    >
                      {연산자옵션(cond.field).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      list={`값옵션-${gi}-${ci}`}
                      value={cond.value}
                      onChange={(e) => updateCond(gi, ci, { value: e.target.value })}
                      placeholder="값"
                      className={`w-28 ${inputCls}`}
                    />
                    <datalist id={`값옵션-${gi}-${ci}`}>
                      {값옵션(cond.field, 코드옵션, 품목옵션, 작업명옵션).map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                    {group.and.length > 1 && (
                      <button type="button" onClick={() => removeCond(gi, ci)} className="text-xs text-gray-500 hover:underline dark:text-gray-400">
                        삭제
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addCond(gi)} className="text-xs text-gray-600 hover:underline dark:text-gray-300">
                  + 조건 추가
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addGroup}
            className="w-full rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            + 조건 그룹 추가 (OR)
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!최종청구품명.trim()}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            저장
          </button>
      </div>
    </div>
  );
}
