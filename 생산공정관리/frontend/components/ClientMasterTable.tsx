"use client";

import { memo } from "react";
import type { 거래처행 } from "@/components/Dashboard";

type Props = {
  rows: 거래처행[];
  selected: Set<string>;
  onToggleRow: (거래처명: string) => void;
  onToggleAll: (checked: boolean) => void;
  onEdit: (row: 거래처행) => void;
};

type RowProps = {
  row: 거래처행;
  checked: boolean;
  onToggle: (거래처명: string) => void;
  onEdit: (row: 거래처행) => void;
};

// InvoiceSelectionTable.tsx의 React.memo 행 패턴 재사용 — 행수가 지금은 적지만(7~10건) 이
// 프로젝트의 표준 표 모양(체크박스 선택+sticky 헤더)과 통일해두기 위함.
const Row = memo(function Row({ row: r, checked, onToggle, onEdit }: RowProps) {
  return (
    <tr className="border-t border-gray-100 dark:border-gray-800">
      <td className="px-3 py-1.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(r.거래처명)}
          aria-label={`${r.거래처명} 선택`}
        />
      </td>
      <td className="px-3 py-1.5 text-gray-900 dark:text-gray-100">{r.거래처명}</td>
      <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{r.사업자등록번호}</td>
      <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{r.수신이메일}</td>
      <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{r.비고}</td>
      <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{r.등록일}</td>
      <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{r.수정일}</td>
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

// SKILL-16 "표 전용 박스 스크롤" 패턴 — max-h + overflow-auto(가로·세로 모두)로 표 자신을 독립
// 스크롤 박스로 만들어 thead가 이 박스 기준 top:0으로 정확히 붙는다(overflow-x-auto만 걸면
// sticky가 window가 아니라 이 div를 기준으로 계산돼 실패하는 버그가 있었음 — SKILL.md 참고).
export default function ClientMasterTable({ rows, selected, onToggleRow, onToggleAll, onEdit }: Props) {
  const 전체선택됨 = rows.length > 0 && rows.every((r) => selected.has(r.거래처명));

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
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">거래처명</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">사업자등록번호</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">수신이메일</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">비고</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">등록일</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">수정일</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Row key={r.거래처명} row={r} checked={selected.has(r.거래처명)} onToggle={onToggleRow} onEdit={onEdit} />
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-6 text-center text-xs text-gray-400">
                등록된 거래처가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
