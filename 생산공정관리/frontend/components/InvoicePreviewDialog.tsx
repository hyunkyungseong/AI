"use client";

import { useEffect } from "react";

export type 미리보기품목 = {
  품목: string;
  작업명: string;
  수량: number;
  단가: number;
  금액: number;
};

export type 미리보기결과 = {
  거래처명: string;
  업무명: string;
  품목: 미리보기품목[];
  총합계: number;
};

type Props = {
  open: boolean;
  data: 미리보기결과 | null;
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

const th = "px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300";
const thRight = "px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300";
const td = "px-3 py-1.5 text-gray-900 dark:text-gray-100";
const tdRight = "px-3 py-1.5 text-right tabular-nums text-gray-900 dark:text-gray-100";

// 미발행 목록 "거래명세서 요청" 클릭 시 즉시 저장하지 않고 먼저 품목·합계를 보여주는 미리보기
// 팝업(2026-07-20 신규, [4단계] 종료 후 보류돼 있던 요청). ConfirmDialog.tsx의 모달 뼈대(오버레이·
// ESC 닫기)를 재사용하되 내용만 불릿 목록 대신 품목 표로 교체 — 여기서 "확정"을 눌러야
// Tab4Invoice.tsx가 실제 POST /api/invoice-request를 보낸다(이 컴포넌트는 표시만 담당, 상태 없음).
export default function InvoicePreviewDialog({ open, data, submitting, onConfirm, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, submitting, onClose]);

  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">거래명세서 미리보기</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {data.거래처명} · {data.업무명}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          아직 저장되지 않았습니다 — 내용을 확인한 뒤 아래 &quot;확정&quot;을 눌러야 실제로 요청됩니다.
        </p>

        <div className="mt-3 overflow-auto rounded-md border border-gray-200 dark:border-gray-800">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
              <tr>
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
                    {row.품목}
                    {row.작업명 && (
                      <span className="text-gray-500 dark:text-gray-400">({row.작업명})</span>
                    )}
                  </td>
                  <td className={tdRight}>{row.수량.toLocaleString()}</td>
                  <td className={tdRight}>{row.단가.toLocaleString()}</td>
                  <td className={tdRight}>{Math.round(row.금액).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 font-semibold dark:border-gray-700">
                <td className={td} colSpan={3}>
                  합계
                </td>
                <td className={tdRight}>{data.총합계.toLocaleString()}원</td>
              </tr>
            </tfoot>
          </table>
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
            onClick={onConfirm}
            disabled={submitting}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            {submitting ? "요청 중..." : "확정"}
          </button>
        </div>
      </div>
    </div>
  );
}
