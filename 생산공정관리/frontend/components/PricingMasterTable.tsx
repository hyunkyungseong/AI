"use client";

import { memo } from "react";
import type { 단가행 } from "@/components/Dashboard";

type Props = {
  rows: 단가행[];
  selected: Set<number>;
  onToggleRow: (id: number) => void;
  onToggleAll: (checked: boolean) => void;
  onEdit: (row: 단가행) => void;
};

type RowProps = {
  row: 단가행;
  checked: boolean;
  onToggle: (id: number) => void;
  onEdit: (row: 단가행) => void;
};

const td = "px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300";

// ClientMasterTable.tsx와 동일한 React.memo 행 + SKILL-16 박스 스크롤 패턴. 업무명·작업명이
// 빈 문자열이면 "(기본단가)"로 대체 표시(데이터 자체는 빈 문자열/서버에선 NULL로 유지).
const Row = memo(function Row({ row: r, checked, onToggle, onEdit }: RowProps) {
  return (
    <tr className="border-t border-gray-100 dark:border-gray-800">
      <td className="px-3 py-1.5">
        <input type="checkbox" checked={checked} onChange={() => onToggle(r.id)} aria-label={`단가 ${r.id} 선택`} />
      </td>
      <td className="px-3 py-1.5 text-gray-900 dark:text-gray-100">{r.업무명 || "(기본단가)"}</td>
      <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{r.작업명 || "(기본단가)"}</td>
      <td className={td}>{r.출력단가.toLocaleString()}</td>
      <td className={td}>{r.봉입단가.toLocaleString()}</td>
      <td className={td}>{r.추가봉입단가.toLocaleString()}</td>
      <td className={td}>{r.동봉물삽입단가.toLocaleString()}</td>
      <td className={td}>{r.각대대봉투봉입단가.toLocaleString()}</td>
      <td className={td}>{r.용지제작단가.toLocaleString()}</td>
      <td className={td}>{r.봉투제작단가.toLocaleString()}</td>
      <td className={td}>{r.삽지제작단가.toLocaleString()}</td>
      <td className={td}>{r.각대대봉투단가.toLocaleString()}</td>
      <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{r.비고}</td>
      <td className="px-3 py-1.5">
        <button
          type="button"
          onClick={() => onEdit(r)}
          className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          수정
        </button>
      </td>
    </tr>
  );
});

export default function PricingMasterTable({ rows, selected, onToggleRow, onToggleAll, onEdit }: Props) {
  const 전체선택됨 = rows.length > 0 && rows.every((r) => selected.has(r.id));

  return (
    <div className="max-h-[60vh] overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
      <table className="whitespace-nowrap text-sm">
        <thead className="sticky top-0 z-[5] bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-3 py-2">
              <input
                type="checkbox"
                checked={전체선택됨}
                onChange={(e) => onToggleAll(e.target.checked)}
                aria-label="전체 선택"
              />
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">업무명</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">작업명</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">출력단가(원)</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">봉입단가(원)</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">추가봉입단가(원)</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">동봉물삽입단가(원)</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">수작업 단가(원)</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">용지제작단가(원)</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">봉투제작단가(원)</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">삽지제작단가(원)</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">각대대봉투단가(원)</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">비고</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Row key={r.id} row={r} checked={selected.has(r.id)} onToggle={onToggleRow} onEdit={onEdit} />
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={14} className="px-3 py-6 text-center text-xs text-gray-400">
                등록된 단가가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
