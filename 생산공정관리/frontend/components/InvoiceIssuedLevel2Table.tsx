"use client";

import { memo } from "react";
import type { 발행행 } from "@/components/Dashboard";

// 레벨2 선택 키 — 조별 분할발급(2026-07-29)으로 같은 의뢰서번호가 서로 다른 거래명세서번호
// 아래 중복 표시될 수 있어(사용자 확정: "의뢰서를 거래명세서별로 각각 표시") 의뢰서번호 단독으로는
// React key·선택 Set 둘 다 충돌한다 — 반드시 거래명세서번호까지 합친 복합키를 쓴다.
export function 레벨2키(r: { 거래명세서번호: string; 의뢰서번호: string }): string {
  return `${r.거래명세서번호}::${r.의뢰서번호}`;
}

type Props = {
  rows: 발행행[]; // 레벨1에서 선택된 그룹으로 이미 스코프된 상태로 전달됨
  selected: Set<string>;
  onToggleRow: (key: string) => void;
  onToggleAll: (checked: boolean) => void;
};

type RowProps = {
  row: 발행행;
  index: number;
  checked: boolean;
  onToggle: (key: string) => void;
};

// InvoiceSelectionTable.tsx와 컬럼(거래명세서번호 추가)·그레인(레벨1 그룹이 아니라 의뢰서 단위)이
// 달라 SKILL-10대로 명시적으로 복제 — React.memo Row 패턴은 동일하게 적용.
const Row = memo(function Row({ row: r, index, checked, onToggle }: RowProps) {
  return (
    <tr className="border-t border-gray-100 dark:border-gray-800">
      <td className="px-3 py-1.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(레벨2키(r))}
          aria-label={`${r.의뢰서번호} 선택`}
        />
      </td>
      <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{index + 1}</td>
      <td className="px-3 py-1.5 text-gray-900 dark:text-gray-100">{r.거래명세서번호}</td>
      <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{r.담당자}</td>
      <td className="px-3 py-1.5 text-gray-900 dark:text-gray-100">{r.의뢰서번호}</td>
      <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{r.사업부}</td>
      <td className="px-3 py-1.5 text-gray-900 dark:text-gray-100">
        {r.거래처명}
        {r.역발행 && (
          <span className="ml-1.5 rounded border border-purple-300 px-1 text-xs text-purple-700 dark:border-purple-700 dark:text-purple-400">
            역발행
          </span>
        )}
      </td>
      <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{r.업무명}</td>
      <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{r.업무명상세}</td>
      <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{r.작업일자}</td>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
        {r.청구페이지.toLocaleString()}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
        {r.장수.toLocaleString()}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
        {r.봉입건수.toLocaleString()}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
        {r.용지수량.toLocaleString()}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
        {r.봉투수량.toLocaleString()}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
        {r.삽지수량.toLocaleString()}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
        {r.예상공급가액 === null ? "—" : `${r.예상공급가액.toLocaleString()}원`}
      </td>
    </tr>
  );
});

export default function InvoiceIssuedLevel2Table({ rows, selected, onToggleRow, onToggleAll }: Props) {
  const 전체선택됨 = rows.length > 0 && rows.every((r) => selected.has(레벨2키(r)));

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
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">No</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">거래명세서번호</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">담당자</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">의뢰서번호</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">사업부</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">거래처명</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">업무명</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">업무명상세</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">작업일자</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">청구페이지</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">장수</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">봉입건수</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">용지수량</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">봉투수량</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">삽지수량</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">예상공급가액</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <Row key={레벨2키(r)} row={r} index={i} checked={selected.has(레벨2키(r))} onToggle={onToggleRow} />
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={17} className="px-3 py-6 text-center text-xs text-gray-400">
                레벨1에서 항목을 선택하면 여기에 의뢰서 목록이 표시됩니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
