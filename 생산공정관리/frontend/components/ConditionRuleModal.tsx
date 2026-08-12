"use client";

import { useEffect, useState } from "react";

export type 규칙조건단일 = { field: "코드" | "품목" | "작업명" | "단가"; op: "==" | "contains"; value: string };
export type 규칙조건AND그룹 = { and: 규칙조건단일[] };
export type 규칙조건 = { or: 규칙조건AND그룹[] };

const 필드옵션 = [
  { value: "코드" as const, label: "공정 코드" },
  { value: "품목" as const, label: "품목명" },
  { value: "작업명" as const, label: "작업명" },
  { value: "단가" as const, label: "단가" },
];

function 연산자옵션(field: string) {
  // 코드·단가는 정해진 값(코드: P/M/MM/E/F 등, 단가: 숫자) 하나와 비교하는 것만 의미 있어
  // 일치함만 지원(단가는 이·상하 같은 범위 비교는 이번 범위 아님, 2026-07-28). 품목·작업명(텍스트)은
  // 포함함(contains)도 지원 — billing.py 평가_조건()과 동일한 필드별 연산자 제한(2026-07-22).
  if (field === "코드" || field === "단가") return [{ value: "==" as const, label: "이 일치함" }];
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
  initial:
    | { 최종청구품명: string; 조건: 규칙조건; 조?: string; 구분표시?: string; 규격?: string; 비고?: string }
    | null; // null = 새 규칙(빈 값으로 시작)
  코드옵션?: string[]; // 지금 원본(왼쪽) 표에 실제 등장하는 값 — 오타 방지용 datalist 후보
  품목옵션?: string[];
  작업명옵션?: string[];
  단가옵션?: string[];
  조옵션?: string[]; // 이미 쓰인 조 이름 + 원본 표의 작업명 목록(조별 분할발급, 2026-07-29)
  onSave: (결과: {
    최종청구품명: string;
    조건: 규칙조건;
    조?: string;
    구분표시?: string;
    규격?: string;
    비고?: string;
  }) => void;
  onCancel: () => void;
};

// 지금 편집 중인 조건이 "작업명 == X" 단일 조건(그룹 1개·조건 1개)이면 X를 반환 — 조 입력칸의
// 기본값 자동 채움에 쓰는 흔한 케이스(2026-07-29 사용자 확정: "조 이름은 보통 작업명과 같다").
function 단일_작업명조건값(groups: 규칙조건AND그룹[]): string | undefined {
  if (groups.length !== 1 || groups[0].and.length !== 1) return undefined;
  const c = groups[0].and[0];
  return c.field === "작업명" && c.op === "==" && c.value ? c.value : undefined;
}

function 값옵션(
  field: 규칙조건단일["field"],
  코드옵션: string[],
  품목옵션: string[],
  작업명옵션: string[],
  단가옵션: string[]
) {
  if (field === "코드") return 코드옵션;
  if (field === "품목") return 품목옵션;
  if (field === "단가") return 단가옵션;
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
  단가옵션 = [],
  조옵션 = [],
  onSave,
  onCancel,
}: Props) {
  const [최종청구품명, set최종청구품명] = useState(initial?.최종청구품명 ?? "");
  const [groups, setGroups] = useState<규칙조건AND그룹[]>(
    () => initial?.조건.or.map((g) => ({ and: g.and.map((c) => ({ ...c })) })) ?? []
  );
  const [조, set조] = useState(initial?.조 ?? "");
  // 거래명세서 Excel 구분(B열)·규격(H열)·비고(N열) 직접 입력(2026-08-11) — 규칙 단위로 저장,
  // 비워두면 구분은 지금처럼 발행일 자동값(첫 행만), 규격·비고는 빈 칸 그대로 나간다.
  const [구분표시, set구분표시] = useState(initial?.구분표시 ?? "");
  const [규격, set규격] = useState(initial?.규격 ?? "");
  const [비고, set비고] = useState(initial?.비고 ?? "");
  // 사용자가 조 입력칸을 직접 건드리기 전까지는(첫 렌더에 이미 값이 있던 경우 포함) "작업명==X"
  // 단일 조건의 X를 실시간으로 자동 채워 보여준다 — 한 번이라도 직접 입력하면 그 뒤로는 사용자
  // 값을 그대로 존중(자동채움을 덮어씀, 2026-07-29 사용자 확정).
  const [조수동입력됨, set조수동입력됨] = useState(!!initial?.조);
  const 자동조 = 단일_작업명조건값(groups);
  const 조표시값 = 조수동입력됨 ? 조 : 자동조 ?? 조;

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
    const 조_최종 = 조표시값.trim();
    onSave({
      최종청구품명: 최종청구품명.trim(),
      조건: { or: groups.filter((g) => g.and.length > 0) },
      조: 조_최종 || undefined,
      구분표시: 구분표시.trim() || undefined,
      규격: 규격.trim() || undefined,
      비고: 비고.trim() || undefined,
    });
  }

  return (
    <div className="absolute inset-y-0 right-0 z-20 flex w-full max-w-xl flex-col overflow-auto border-l border-gray-300 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
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

      <label className="mt-3 block text-sm text-gray-700 dark:text-gray-300">
        작업구분(시트명) <span className="text-gray-400">— 비워두면 분리발급 안 함</span>
        <input
          type="text"
          list="조옵션"
          value={조표시값}
          onChange={(e) => {
            set조수동입력됨(true);
            set조(e.target.value);
          }}
          placeholder="예: 은행A (비워두면 거래명세서 1건)"
          className={`mt-1 w-full ${inputCls}`}
        />
        <datalist id="조옵션">
          {조옵션.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
        {!조수동입력됨 && 자동조 && (
          <span className="mt-1 block text-xs text-gray-400">
            &quot;작업명 == {자동조}&quot; 조건에서 자동으로 채웠습니다 — 직접 입력하면 그 값을 씁니다.
          </span>
        )}
      </label>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <label className="block text-sm text-gray-700 dark:text-gray-300">
          구분 <span className="text-gray-400">— 비우면 발행일 자동</span>
          <input
            type="text"
            value={구분표시}
            onChange={(e) => set구분표시(e.target.value)}
            placeholder="예: 05월29일"
            className={`mt-1 w-full ${inputCls}`}
          />
        </label>
        <label className="block text-sm text-gray-700 dark:text-gray-300">
          규격
          <input
            type="text"
            value={규격}
            onChange={(e) => set규격(e.target.value)}
            placeholder="예: A4"
            className={`mt-1 w-full ${inputCls}`}
          />
        </label>
        <label className="block text-sm text-gray-700 dark:text-gray-300">
          비고
          <input
            type="text"
            value={비고}
            onChange={(e) => set비고(e.target.value)}
            placeholder="예: 추가내역서 봉입"
            className={`mt-1 w-full ${inputCls}`}
          />
        </label>
      </div>

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
                      type={cond.field === "단가" ? "number" : "text"}
                      step={cond.field === "단가" ? "0.01" : undefined}
                      list={`값옵션-${gi}-${ci}`}
                      value={cond.value}
                      onChange={(e) => updateCond(gi, ci, { value: e.target.value })}
                      placeholder="값"
                      className={`w-28 ${inputCls}`}
                    />
                    <datalist id={`값옵션-${gi}-${ci}`}>
                      {값옵션(cond.field, 코드옵션, 품목옵션, 작업명옵션, 단가옵션).map((v) => (
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
