"use client";

import { memo } from "react";
import type { 레벨1그룹 } from "@/lib/issuedGrouping";

type Props = {
  groups: 레벨1그룹[];
  selected: Set<string>;
  onToggleRow: (key: string) => void;
  onToggleAll: (checked: boolean) => void;
};

type RowProps = {
  group: 레벨1그룹;
  index: number;
  checked: boolean;
  onToggle: (key: string) => void;
};

// InvoiceSelectionTable.tsx의 React.memo Row 패턴 재사용 — 체크박스 하나 토글할 때 전체 행이
// 다시 그려지는 성능 문제를 막기 위해 각 행에 checked(boolean) 스칼라만 전달한다([4-B]에서 실측 검증됨).
const Row = memo(function Row({ group: g, index, checked, onToggle }: RowProps) {
  return (
    <tr className="border-t border-gray-100 dark:border-gray-800">
      <td className="px-3 py-1.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(g.key)}
          aria-label={`${g.거래명세서번호} ${g.업무명} 선택`}
        />
      </td>
      <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{index + 1}</td>
      <td className="px-3 py-1.5 text-gray-900 dark:text-gray-100">{g.거래명세서번호}</td>
      <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{g.사업부}</td>
      <td className="px-3 py-1.5 text-gray-900 dark:text-gray-100">{g.거래처명}</td>
      <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{g.업무명}</td>
      <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{g.담당자}</td>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
        {g.의뢰서건수.toLocaleString()}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
        {g.청구페이지.toLocaleString()}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
        {g.장수.toLocaleString()}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
        {g.봉입건수.toLocaleString()}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
        {g.용지수량.toLocaleString()}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
        {g.봉투수량.toLocaleString()}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
        {g.삽지수량.toLocaleString()}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
        {g.예상공급가액 === null ? (
          <span className="text-amber-600 dark:text-amber-400">단가 미등록</span>
        ) : (
          `${g.예상공급가액.toLocaleString()}원`
        )}
      </td>
    </tr>
  );
});

export default function InvoiceIssuedLevel1Table({ groups, selected, onToggleRow, onToggleAll }: Props) {
  const 전체선택됨 = groups.length > 0 && groups.every((g) => selected.has(g.key));

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
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">사업부</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">거래처명</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">업무명</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">담당자</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">의뢰서건수</th>
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
          {groups.map((g, i) => (
            <Row key={g.key} group={g} index={i} checked={selected.has(g.key)} onToggle={onToggleRow} />
          ))}
          {groups.length === 0 && (
            <tr>
              <td colSpan={15} className="px-3 py-6 text-center text-xs text-gray-400">
                조건에 맞는 항목이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
