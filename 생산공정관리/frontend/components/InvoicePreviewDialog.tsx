"use client";

import { useEffect, useMemo, useState } from "react";
import ConditionRuleModal from "./ConditionRuleModal";
import type { 규칙조건 } from "./ConditionRuleModal";
import { 적용_규칙 } from "@/lib/billingRules";
import type { 원본품목 } from "@/lib/billingRules";

export type 미리보기품목 = 원본품목;

export type 규칙적용행_API = {
  최종청구품명: string;
  코드: string | null;
  수량: number;
  단가: number | null;
  금액: number;
};

export type 저장된규칙 = { 순서: number; 최종청구품명: string; 조건: 규칙조건 };

export type 미리보기결과 = {
  거래처명: string;
  업무명: string;
  품목: 미리보기품목[];
  규칙적용결과: 규칙적용행_API[];
  미분류: 미리보기품목[];
  총합계: number;
  규칙목록?: 저장된규칙[]; // Tab4Invoice가 GET /api/billing-rules로 따로 받아와 채워줌
};

export type 확정품목 = { 코드: string | null; 품목: string; 수량: number; 단가: number | null; 금액: number };
export type 확정규칙 = { 순서: number; 최종청구품명: string; 조건: 규칙조건 };

type 편집행 = {
  key: string;
  최종청구품명: string;
  코드: string | null;
  수량: number;
  단가: number | null;
  금액: number;
  조건: 규칙조건 | null; // null이면 수동으로 추가/복사한 행(규칙 아님)
};

type Props = {
  open: boolean;
  data: 미리보기결과 | null;
  submitting: boolean;
  onConfirm: (edited: { 품목_최종: 확정품목[]; 규칙: 확정규칙[] }) => void;
  onClose: () => void;
};

const th = "px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300";
const thRight = "px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300";
const td = "px-3 py-1.5 text-gray-900 dark:text-gray-100";
const tdRight = "px-3 py-1.5 text-right tabular-nums text-gray-900 dark:text-gray-100";
const numInput =
  "w-24 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-right text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

let 신규행_카운터 = 0;

function 원본행_recompute(rows: 편집행[], 원본목록: 원본품목[]): 편집행[] {
  const 규칙행 = rows.filter((r) => r.조건 !== null);
  if (규칙행.length === 0) return rows;
  const { 결과 } = 적용_규칙(
    원본목록,
    규칙행.map((r) => ({ 최종청구품명: r.최종청구품명, 조건: r.조건 as 규칙조건 }))
  );
  let ri = 0;
  return rows.map((r) => {
    if (r.조건 === null) return r;
    const res = 결과[ri++];
    return { ...r, 최종청구품명: res.최종청구품명, 코드: res.코드 || null, 수량: res.수량, 단가: res.단가, 금액: res.금액 };
  });
}

// 미발행 목록 "거래명세서 요청" 클릭 시 즉시 저장하지 않고 먼저 품목·합계를 보여주는 미리보기
// 팝업(2026-07-20 최초 작성). 좌/우 2단 편집 화면으로 전면 개편(2026-07-22, [거래명세서편집_규칙엔진]) —
// 왼쪽은 시스템 자동계산 원본(읽기 전용), 오른쪽은 저장된 청구품목규칙을 적용해 만든 고객사
// 청구 명세서 초안으로, 셀 클릭 시 조건식 편집 모달이 뜨고 수량·단가·금액 직접 수정·새 행 추가도
// 가능하다. "확정"을 눌러야 Tab4Invoice.tsx가 실제 POST /api/invoice-request를 보낸다.
// data가 바뀔 때마다 rightRows를 되돌려야 하는데, "부모가 매번 새 key를 줘서 이 컴포넌트를
// 통째로 재마운트한다"는 전제로 useState 초기값에서 한 번만 계산한다(Tab4Invoice가
// key={previewSeq}로 미리보기를 새로 열 때마다 강제 재마운트) — set-state-in-effect 린트
// 문제를 피하기 위한 구조, ConditionRuleModal과 동일한 패턴(2026-07-22).
function 초기_rightRows(data: 미리보기결과 | null): 편집행[] {
  if (!data) return [];
  const 규칙목록 = data.규칙목록 ?? [];
  if (규칙목록.length === 0 || data.규칙적용결과.length === 0) return [];
  return data.규칙적용결과.map((r, i) => ({
    key: `rule-init-${i}`,
    최종청구품명: r.최종청구품명,
    코드: r.코드,
    수량: r.수량,
    단가: r.단가,
    금액: r.금액,
    조건: 규칙목록[i]?.조건 ?? null,
  }));
}

export default function InvoicePreviewDialog({ open, data, submitting, onConfirm, onClose }: Props) {
  const [rightRows, setRightRows] = useState<편집행[]>(() => 초기_rightRows(data));
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState<number | null>(null); // null = 새 규칙 행 추가

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting && !modalOpen) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, submitting, modalOpen, onClose]);

  // 왼쪽 원본 표에서 "이미 오른쪽 표(어느 규칙)에 반영된 항목"을 체크 표시로 구분하기 위한 정보 —
  // 미분류(안 걸린 항목)의 여집합을 참조 동등성(원본 배열 항목 그대로 필터링돼 참조가 같음)으로
  // 구한다(2026-07-24 사용자 요청: "선택된 항목은 체크가 되어 식별이 쉬웠으면 좋겠어").
  const { 미분류: 미분류표시, 매칭Set } = useMemo(() => {
    if (!data) return { 미분류: [] as 원본품목[], 매칭Set: new Set<원본품목>() };
    const 규칙행 = rightRows.filter((r) => r.조건 !== null);
    if (규칙행.length === 0) return { 미분류: [] as 원본품목[], 매칭Set: new Set<원본품목>() };
    const { 미분류 } = 적용_규칙(
      data.품목,
      규칙행.map((r) => ({ 최종청구품명: r.최종청구품명, 조건: r.조건 as 규칙조건 }))
    );
    const 미분류Set = new Set(미분류);
    return { 미분류, 매칭Set: new Set(data.품목.filter((r) => !미분류Set.has(r))) };
  }, [data, rightRows]);

  const 오른쪽합계 = useMemo(() => rightRows.reduce((s, r) => s + (Number.isFinite(r.금액) ? r.금액 : 0), 0), [rightRows]);

  // 조건 편집 패널의 값 입력칸에서 오타 없이 원본 값을 골라 쓸 수 있도록, 지금 원본(왼쪽) 표에
  // 실제로 등장하는 코드·품목·작업명 목록을 추출(2026-07-22, 사용자 피드백: "직접 키인은 오타 위험").
  const 코드옵션 = useMemo(() => Array.from(new Set(data?.품목.map((r) => r.코드) ?? [])).sort(), [data]);
  const 품목옵션 = useMemo(() => Array.from(new Set(data?.품목.map((r) => r.품목) ?? [])).sort(), [data]);
  const 작업명옵션 = useMemo(
    () => Array.from(new Set((data?.품목.map((r) => r.작업명).filter(Boolean) as string[]) ?? [])).sort(),
    [data]
  );

  if (!open || !data) return null;

  function openModalForNewRule() {
    setModalTarget(null);
    setModalOpen(true);
  }
  function openModalForRow(idx: number) {
    setModalTarget(idx);
    setModalOpen(true);
  }
  function handleModalCancel() {
    setModalOpen(false);
    setModalTarget(null);
  }
  function handleModalSave(result: { 최종청구품명: string; 조건: 규칙조건 }) {
    setRightRows((prev) => {
      let next: 편집행[];
      if (modalTarget === null) {
        next = [
          ...prev,
          {
            key: `rule-new-${신규행_카운터++}`,
            최종청구품명: result.최종청구품명,
            코드: null,
            수량: 0,
            단가: null,
            금액: 0,
            조건: result.조건,
          },
        ];
      } else {
        next = prev.map((r, i) => (i === modalTarget ? { ...r, 최종청구품명: result.최종청구품명, 조건: result.조건 } : r));
      }
      return 원본행_recompute(next, data!.품목);
    });
    setModalOpen(false);
    setModalTarget(null);
  }

  function addManualRow() {
    // 단가를 null이 아니라 0으로 시작 — null은 "규칙으로 합쳐진 원본 행들의 단가가 서로 달라 표시
    // 불가"한 경우 전용이고(원본행_recompute 참고), 새로 추가하는 행은 그런 모호함이 없으므로
    // 처음부터 단가 입력칸이 바로 보여야 한다(2026-07-22, 사용자 요청).
    setRightRows((prev) => [
      ...prev,
      { key: `manual-${신규행_카운터++}`, 최종청구품명: "", 코드: null, 수량: 0, 단가: 0, 금액: 0, 조건: null },
    ]);
  }
  function copyFromLeft() {
    setRightRows(
      data!.품목.map((row, i) => ({
        key: `copy-${i}`,
        최종청구품명: row.작업명 ? `${row.품목}(${row.작업명})` : row.품목,
        코드: row.코드,
        수량: row.수량,
        단가: row.단가,
        금액: row.금액,
        조건: null,
      }))
    );
  }
  function removeRow(idx: number) {
    setRightRows((prev) => 원본행_recompute(prev.filter((_, i) => i !== idx), data!.품목));
  }
  // 오른쪽 표(고객사 청구 명세서) 행 순서 변경(2026-07-24 사용자 요청) — 순서는 재계산과 무관한
  // 단순 배열 위치 교환이라 원본행_recompute 호출 불필요(수량·단가·금액은 그대로 유지).
  function moveRow(idx: number, direction: -1 | 1) {
    setRightRows((prev) => {
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }
  // 수량·단가 칸을 고치면 금액을 자동으로 다시 계산한다(2026-07-22, 사용자 요청: "수량과 단가
  // 표기 후 금액란도 자동으로 계산해주고") — 단가가 "—"(병합돼 단일 단가가 없는 경우, null)이면
  // 자동 계산할 기준이 없으므로 그때는 지금처럼 금액을 직접 입력하게 둔다. 금액 칸 자체는 여전히
  // 직접 수정 가능 — 그 다음에 수량·단가를 다시 건드리면 그 시점 값으로 재계산된다.
  function updateField(idx: number, patch: Partial<편집행>) {
    setRightRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const next = { ...r, ...patch };
        if (("수량" in patch || "단가" in patch) && next.단가 !== null) {
          next.금액 = next.수량 * next.단가;
        }
        return next;
      })
    );
  }

  function handleConfirmClick() {
    const 품목_최종: 확정품목[] = rightRows.map((r) => ({
      코드: r.코드,
      품목: r.최종청구품명,
      수량: r.수량,
      단가: r.단가,
      금액: r.금액,
    }));
    const 규칙: 확정규칙[] = rightRows
      .filter((r) => r.조건 !== null)
      .map((r, i) => ({ 순서: i + 1, 최종청구품명: r.최종청구품명, 조건: r.조건 as 규칙조건 }));
    onConfirm({ 품목_최종, 규칙 });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative flex h-[92vh] w-[96vw] max-w-[1600px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">거래명세서 미리보기 · 편집</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {data.거래처명} · {data.업무명}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          아직 저장되지 않았습니다 — 오른쪽 표를 확인·수정한 뒤 &quot;확정&quot;을 눌러야 실제로
          요청됩니다. 오른쪽 품명 칸을 클릭하면 조건식으로 왼쪽 항목을 자동으로 묶을 수 있습니다.
        </p>

        <div className="mt-3 grid flex-1 grid-cols-2 gap-4 overflow-hidden">
          {/* 왼쪽: 원본(읽기 전용) */}
          <div className="flex flex-col overflow-hidden">
            <h3 className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
              시스템 자동계산 원본 ({data.품목.length}건)
            </h3>
            <div className="overflow-auto rounded-md border border-gray-200 dark:border-gray-800">
              <table className="w-full whitespace-nowrap text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className={th} title="오른쪽 표에 반영된 항목">✓</th>
                    <th className={th}>코드</th>
                    <th className={th}>품목</th>
                    <th className={thRight}>수량</th>
                    <th className={thRight}>단가</th>
                    <th className={thRight}>금액</th>
                  </tr>
                </thead>
                <tbody>
                  {data.품목.map((row, i) => (
                    <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                      <td className={td}>
                        {매칭Set.has(row) && (
                          <span className="text-green-600 dark:text-green-400" title="오른쪽 표에 반영됨">
                            ✓
                          </span>
                        )}
                      </td>
                      <td className={td}>{row.코드}</td>
                      <td className={td}>
                        {row.품목}
                        {row.작업명 && <span className="text-gray-500 dark:text-gray-400">({row.작업명})</span>}
                      </td>
                      <td className={tdRight}>{row.수량.toLocaleString()}</td>
                      <td className={tdRight}>{row.단가.toLocaleString()}</td>
                      <td className={tdRight}>{Math.round(row.금액).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 font-semibold dark:border-gray-700">
                    <td className={td} colSpan={5}>
                      합계
                    </td>
                    <td className={tdRight}>{data.총합계.toLocaleString()}원</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 오른쪽: 규칙 적용 결과 + 수동 편집 */}
          <div className="flex flex-col overflow-hidden">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">고객사 청구 명세서</h3>
              <div className="flex gap-2">
                {rightRows.length === 0 && (
                  <button type="button" onClick={copyFromLeft} className="text-xs text-gray-600 hover:underline dark:text-gray-300">
                    좌측 그대로 시작
                  </button>
                )}
                <button type="button" onClick={openModalForNewRule} className="text-xs text-gray-600 hover:underline dark:text-gray-300">
                  + 조건 규칙 추가
                </button>
                <button type="button" onClick={addManualRow} className="text-xs text-gray-600 hover:underline dark:text-gray-300">
                  + 새 행 추가
                </button>
              </div>
            </div>

            <div className="overflow-auto rounded-md border border-gray-200 dark:border-gray-800">
              <table className="w-full whitespace-nowrap text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className={th}>품명</th>
                    <th className={thRight}>수량</th>
                    <th className={thRight}>단가</th>
                    <th className={thRight}>금액</th>
                    <th className={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {rightRows.map((row, i) => (
                    <tr key={row.key} className="border-t border-gray-100 dark:border-gray-800">
                      <td className={td}>
                        {row.조건 !== null ? (
                          <button
                            type="button"
                            onClick={() => openModalForRow(i)}
                            className="text-left text-blue-700 hover:underline dark:text-blue-400"
                            title="조건식 편집"
                          >
                            {row.최종청구품명 || "(품명 없음)"}
                          </button>
                        ) : (
                          <input
                            type="text"
                            value={row.최종청구품명}
                            onChange={(e) => updateField(i, { 최종청구품명: e.target.value })}
                            className={`w-full rounded border border-gray-300 bg-white px-1.5 py-0.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100`}
                            placeholder="품명"
                          />
                        )}
                      </td>
                      <td className={tdRight}>
                        <input
                          type="number"
                          value={row.수량}
                          onChange={(e) => updateField(i, { 수량: Number(e.target.value) })}
                          className={numInput}
                        />
                      </td>
                      <td className={tdRight}>
                        {row.단가 === null ? (
                          <span className="text-gray-400" title="병합된 항목의 단가가 서로 달라 표시할 수 없습니다">
                            —
                          </span>
                        ) : (
                          <input
                            type="number"
                            value={row.단가}
                            onChange={(e) => updateField(i, { 단가: Number(e.target.value) })}
                            className={numInput}
                          />
                        )}
                      </td>
                      <td className={tdRight}>
                        <input
                          type="number"
                          value={Math.round(row.금액)}
                          onChange={(e) => updateField(i, { 금액: Number(e.target.value) })}
                          className={numInput}
                        />
                      </td>
                      <td className={td}>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => moveRow(i, -1)}
                            disabled={i === 0}
                            title="위로 이동"
                            aria-label="위로 이동"
                            className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 dark:text-gray-400 dark:hover:text-gray-100"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => moveRow(i, 1)}
                            disabled={i === rightRows.length - 1}
                            title="아래로 이동"
                            aria-label="아래로 이동"
                            className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 dark:text-gray-400 dark:hover:text-gray-100"
                          >
                            ▼
                          </button>
                          <button type="button" onClick={() => removeRow(i)} className="text-xs text-red-600 hover:underline dark:text-red-400">
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rightRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                        저장된 규칙이 없습니다. &quot;조건 규칙 추가&quot;로 새로 만들거나 &quot;좌측
                        그대로 시작&quot;을 눌러 편집을 시작하세요.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 font-semibold dark:border-gray-700">
                    <td className={td} colSpan={3}>
                      합계
                    </td>
                    <td className={tdRight}>{Math.round(오른쪽합계).toLocaleString()}원</td>
                    <td className={td}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {미분류표시.length > 0 && (
              <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <p className="font-medium">어느 규칙에도 안 걸린 원본 항목 {미분류표시.length}건 — 빠뜨리지 않았는지 확인해 주세요.</p>
                <ul className="mt-1 list-disc pl-4">
                  {미분류표시.map((row, i) => (
                    <li key={i}>
                      [{row.코드}] {row.품목}
                      {row.작업명 ? `(${row.작업명})` : ""} — 수량 {row.수량.toLocaleString()}, 금액{" "}
                      {Math.round(row.금액).toLocaleString()}원
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={submitting || rightRows.length === 0}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            {submitting ? "요청 중..." : "확정"}
          </button>
        </div>

        {/* 조건 편집 패널 — 전체화면 모달이 아니라 오른쪽에 도킹된 패널로 띄운다(2026-07-22, 사용자
            피드백: "조건식 화면이 고정이다 보니 원본 내역을 확인할 수 없음") — 왼쪽 원본 표를 계속
            보면서 조건을 만들 수 있도록 왼쪽은 절대 가리지 않는다. */}
        {modalOpen && (
          <ConditionRuleModal
            initial={
              modalTarget !== null
                ? { 최종청구품명: rightRows[modalTarget]?.최종청구품명 ?? "", 조건: rightRows[modalTarget]?.조건 ?? { or: [] } }
                : null
            }
            코드옵션={코드옵션}
            품목옵션={품목옵션}
            작업명옵션={작업명옵션}
            onSave={handleModalSave}
            onCancel={handleModalCancel}
          />
        )}
      </div>
    </div>
  );
}
