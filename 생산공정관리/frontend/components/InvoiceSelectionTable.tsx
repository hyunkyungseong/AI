"use client";

import { memo, useRef } from "react";
import type { Ref } from "react";
import type { 미발행행 } from "@/components/Dashboard";
import { useVirtualRows } from "@/lib/useVirtualRows";

type Props = {
  rows: 미발행행[];
  selected: Set<string>;
  onToggleRow: (의뢰서번호: string) => void;
  onToggleAll: (checked: boolean) => void;
};

type RowProps = {
  row: 미발행행;
  index: number;
  checked: boolean;
  onToggle: (의뢰서번호: string) => void;
  rowRef?: Ref<HTMLTableRowElement>;
};

const COL_COUNT = 17;

// 체크박스 하나만 토글해도 미발행 건 전체(수천 건)가 매번 다시 그려지면서 느려지는 문제 방지 —
// 행마다 Set 전체가 아니라 checked(boolean) 하나만 prop으로 받아, React.memo가 바뀐 행 딱 하나만
// 다시 그리고 나머지 수천 행은 그대로 재사용하도록 함(부모의 toggleRow도 useCallback으로 고정 필요).
// rowRef는 가상 스크롤(useVirtualRows)이 실제 행 높이를 실측하기 위해 맨 위 행에만 전달한다.
const Row = memo(function Row({ row: r, index, checked, onToggle, rowRef }: RowProps) {
  return (
    <tr ref={rowRef} className="border-t border-gray-100 dark:border-gray-800">
      <td className="px-3 py-1.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(r.의뢰서번호)}
          aria-label={`${r.의뢰서번호} 선택`}
        />
      </td>
      <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{index + 1}</td>
      <td className="px-3 py-1.5">
        {r.예상공급가액 === null && <span className="text-amber-600 dark:text-amber-400">⚠️ 미등록</span>}
      </td>
      <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{r.담당자}</td>
      <td className="px-3 py-1.5 text-gray-900 dark:text-gray-100">{r.의뢰서번호}</td>
      <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{r.사업부}</td>
      <td className="px-3 py-1.5 text-gray-900 dark:text-gray-100">{r.거래처명}</td>
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

// 프로젝트 최초의 체크박스 선택 그리드 — Streamlit(app.py t4a, SKILL-04)은 data_editor의 key를
// 강제로 리마운트해 선택 상태를 관리했지만, React는 selected(Set<string>) state 하나로 충분하다.
export default function InvoiceSelectionTable({ rows, selected, onToggleRow, onToggleAll }: Props) {
  const 전체선택됨 = rows.length > 0 && rows.every((r) => selected.has(r.의뢰서번호));

  const containerRef = useRef<HTMLDivElement>(null);
  const { range, rowHeight, firstRowRef } = useVirtualRows(containerRef, rows.length);

  return (
    <div ref={containerRef} className="max-h-[60vh] overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
      {/* w-full을 빼서 각 컬럼 너비가 내용 길이에 맞게 자동으로 정해지도록 함(브라우저 기본 table
          auto-layout). whitespace-nowrap은 table에 걸어두면 하위 셀에 그대로 상속되어(CSS 상속 속성)
          줄바꿈 없이 한 줄로 표시되고, 그만큼 넘치는 너비는 부모 div의 스크롤로 가로 스크롤됨.
          thead의 sticky top:0은 이 div 자신을 기준(가장 가까운 스크롤 조상)으로 계산되므로, 이 div가
          실제로 (가로+세로) 스크롤되는 진짜 스크롤 컨테이너여야 정상 동작한다 — max-h + overflow-auto로
          이 div 자체를 높이 제한된 스크롤 박스로 만듦. 예전에는 바깥 페이지(window) 스크롤에 붙이려고
          overflow-x-auto만 걸었으나, 스펙상 그 순간 이미 이 div가 "가장 가까운 스크롤 조상"이 되면서
          thead가 window가 아니라 이 div 기준으로 sticky 계산되고, 정작 이 div 자신은 내부 스크롤이
          없어(overflow-y가 실제로 안 넘침) 헤더가 전혀 안 붙고 제자리에 떠버리는 버그가 있었음
          (2026-07-19 Playwright로 실측 확인 — thead가 항상 wrapper 상단+고정오프셋에 머물고 창
          스크롤을 따라 그대로 흘러감). SKILL-16 확장판 참고. */}
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
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">단가</th>
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
          {range.start > 0 && (
            <tr aria-hidden="true" style={{ height: range.start * rowHeight }}>
              <td colSpan={COL_COUNT} />
            </tr>
          )}
          {rows.slice(range.start, range.end).map((r, i) => {
            const index = range.start + i;
            return (
              <Row
                key={r.의뢰서번호}
                row={r}
                index={index}
                checked={selected.has(r.의뢰서번호)}
                onToggle={onToggleRow}
                rowRef={index === 0 ? firstRowRef : undefined}
              />
            );
          })}
          {range.end < rows.length && (
            <tr aria-hidden="true" style={{ height: (rows.length - range.end) * rowHeight }}>
              <td colSpan={COL_COUNT} />
            </tr>
          )}
          {rows.length === 0 && (
            <tr>
              <td colSpan={COL_COUNT} className="px-3 py-6 text-center text-xs text-gray-400">
                미발행 건이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
