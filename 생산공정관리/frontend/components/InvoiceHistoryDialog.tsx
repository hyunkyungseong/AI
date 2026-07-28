"use client";

import { useEffect, useState } from "react";

type 이력행 = { 코드: string | null; 품목: string; 작업명: string | null; 수량: number; 단가: number | null; 금액: number };
type 이력응답 = { 편집여부: boolean; 원본: 이력행[]; 최종: 이력행[] };

type Props = {
  거래명세서번호: string;
  onClose: () => void;
};

const th = "px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300";
const thRight = "px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300";
const td = "px-3 py-1.5 text-gray-900 dark:text-gray-100";
const tdRight = "px-3 py-1.5 text-right tabular-nums text-gray-900 dark:text-gray-100";

function 합계(rows: 이력행[]) {
  return rows.reduce((s, r) => s + (Number.isFinite(r.금액) ? r.금액 : 0), 0);
}

function 표(제목: string, rows: 이력행[]) {
  return (
    <div className="flex flex-col overflow-hidden">
      <h3 className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
        {제목} ({rows.length}건)
      </h3>
      <div className="overflow-auto rounded-md border border-gray-200 dark:border-gray-800">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className={th}>코드</th>
              <th className={th}>품목</th>
              <th className={thRight}>수량</th>
              <th className={thRight}>단가</th>
              <th className={thRight}>금액</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                <td className={td}>{row.코드 || "—"}</td>
                <td className={td}>
                  {row.품목}
                  {row.작업명 && <span className="text-gray-500 dark:text-gray-400">({row.작업명})</span>}
                </td>
                <td className={tdRight}>{row.수량.toLocaleString()}</td>
                <td className={tdRight}>{row.단가 === null ? "—" : row.단가.toLocaleString()}</td>
                <td className={tdRight}>{Math.round(row.금액).toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                  내역 없음
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 font-semibold dark:border-gray-700">
              <td className={td} colSpan={4}>
                합계
              </td>
              <td className={tdRight}>{Math.round(합계(rows)).toLocaleString()}원</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// 발행요청목록·발행완료 화면의 "편집됨" 배지 클릭 시 뜨는 읽기 전용 비교 팝업 — 확정 시점에
// POST /거래명세서요청이 거래명세서_품목에 저장해둔 원본(자동계산)·최종(실제 확정) 스냅샷을
// 나란히 보여준다(2026-07-22 신규, 사용자 요청: "원본과 수정본의 차이 이력관리는 어떻게 관리하지?").
// 편집 UI 없음 — InvoicePreviewDialog.tsx의 좌우 2단 레이아웃을 읽기 전용으로만 재사용.
//
// 부모(Tab4IssuedList.tsx)가 거래명세서번호가 바뀔 때마다 이 컴포넌트를 key로 재마운트하는
// 방식으로 호출하므로, 여기서는 마운트 시 한 번 fetch하면 된다(ConditionRuleModal.tsx와 동일한
// "부모가 조건부 렌더링으로 열림/닫힘 제어" 패턴 — set-state-in-effect 린트 회피).
export default function InvoiceHistoryDialog({ 거래명세서번호, onClose }: Props) {
  const [data, setData] = useState<이력응답 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // loading·error 초기값이 이미 true/null이라 여기서 다시 setState할 필요가 없다 — 이 컴포넌트는
    // 거래명세서번호가 바뀔 때마다 부모가 key로 새로 마운트하므로(재사용 안 함) 이 effect는 항상
    // "처음 한 번"만 돈다. (효과 본문에서 곧바로 setState를 부르면 react-hooks/set-state-in-effect
    // 린트에 걸림 — InvoicePreviewDialog.tsx의 초기_rightRows()와 같은 이유)
    let 취소됨 = false;
    fetch(`/api/invoice-history/${encodeURIComponent(거래명세서번호)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.detail ?? "이력을 불러오지 못했습니다");
        if (!취소됨) setData(json);
      })
      .catch((e: Error) => {
        if (!취소됨) setError(e.message);
      })
      .finally(() => {
        if (!취소됨) setLoading(false);
      });
    return () => {
      취소됨 = true;
    };
  }, [거래명세서번호]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex h-[85vh] w-[92vw] max-w-[1400px] flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">원본 vs 최종 비교 — {거래명세서번호}</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          왼쪽은 시스템이 자동계산한 원본, 오른쪽은 확정 당시 실제로 청구된 최종 내용입니다(읽기 전용).
        </p>

        {loading && <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">불러오는 중...</p>}
        {error && <p className="mt-6 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {data && !loading && !error && (
          <>
            {data.원본.length === 0 && data.최종.length === 0 ? (
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                이 거래명세서는 저장된 편집 이력이 없습니다(이 기능 이전에 발행됐거나 원본 그대로 발행된 건일 수 있습니다).
              </p>
            ) : (
              <div className="mt-3 grid flex-1 grid-cols-2 gap-4 overflow-hidden">
                {표("원본(자동계산)", data.원본)}
                {표("최종(확정된 내용)", data.최종)}
              </div>
            )}
          </>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
