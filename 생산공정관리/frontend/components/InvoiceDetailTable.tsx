"use client";

import { Fragment } from "react";
import type { 운영통계행 } from "./Dashboard";

type Props = {
  detailRows: 운영통계행[];
  selectedIds: string[];
};

type 소계타입 = { 장수: number; 건수: number; 출력페이지: number; 확정청구페이지: number };

function 소계계산(lines: 운영통계행[]): 소계타입 {
  return lines.reduce(
    (acc, r) => ({
      장수: acc.장수 + r.장수,
      건수: acc.건수 + r.건수,
      출력페이지: acc.출력페이지 + r.출력페이지,
      확정청구페이지: acc.확정청구페이지 + r.확정청구페이지,
    }),
    { 장수: 0, 건수: 0, 출력페이지: 0, 확정청구페이지: 0 }
  );
}

const th = "px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300";
const thRight = "px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300";
const td = "px-3 py-1.5 text-gray-700 dark:text-gray-300";
const tdRight = "px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300";

// 선택된 업무의뢰서의 원본 작업내역 줄 단위 표시 — app.py t4a 904~950행(선택된 업무의뢰서 세부내역)
// 이식. 의뢰서를 2개 이상 선택했을 때만 의뢰서 그룹마다 "▶ 소계" 행을 덧붙여 구분한다(1개만 선택 시
// 어차피 그룹이 하나뿐이라 소계가 필요 없음 — app.py와 동일한 판단 기준).
export default function InvoiceDetailTable({ detailRows, selectedIds }: Props) {
  const idSet = new Set(selectedIds);
  const 라인목록 = detailRows.filter((r) => idSet.has(r.업무의뢰서번호));
  const 소계표시 = selectedIds.length >= 2;

  const 그룹 = new Map<string, 운영통계행[]>();
  for (const id of selectedIds) 그룹.set(id, []);
  for (const r of 라인목록) {
    그룹.get(r.업무의뢰서번호)?.push(r);
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">선택된 업무의뢰서 세부내역</h2>
      <div className="max-h-[60vh] overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="whitespace-nowrap text-sm">
          <thead className="sticky top-0 z-[5] bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className={th}>의뢰서번호</th>
              <th className={th}>거래처명</th>
              <th className={th}>작업일자</th>
              <th className={th}>업무명</th>
              <th className={th}>업무명상세</th>
              <th className={th}>작업내역서상세</th>
              <th className={th}>P수</th>
              <th className={thRight}>장수</th>
              <th className={thRight}>건수</th>
              <th className={thRight}>출력페이지</th>
              <th className={thRight}>청구페이지</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(그룹.entries()).map(([id, lines]) => (
              <Fragment key={id}>
                {lines.map((r, i) => (
                  <tr key={`${id}-${i}`} className="border-t border-gray-100 dark:border-gray-800">
                    <td className={td}>{r.업무의뢰서번호}</td>
                    <td className={td}>{r.거래처명}</td>
                    <td className={td}>{r.날짜}</td>
                    <td className={td}>{r.업무명}</td>
                    <td className={td}>{r.업무명상세}</td>
                    <td className={td}>{r.작업내역서상세}</td>
                    <td className={td}>{r.P수}</td>
                    <td className={tdRight}>{r.장수.toLocaleString()}</td>
                    <td className={tdRight}>{r.건수.toLocaleString()}</td>
                    <td className={tdRight}>{r.출력페이지.toLocaleString()}</td>
                    <td className={tdRight}>{r.확정청구페이지.toLocaleString()}</td>
                  </tr>
                ))}
                {소계표시 &&
                  lines.length > 0 &&
                  (() => {
                    const s = 소계계산(lines);
                    return (
                      <tr className="border-t border-gray-200 bg-gray-50 font-bold dark:border-gray-700 dark:bg-gray-900">
                        <td className={td} colSpan={3} />
                        <td className={td}>▶ 소계</td>
                        <td className={td} colSpan={3} />
                        <td className={tdRight}>{s.장수.toLocaleString()}</td>
                        <td className={tdRight}>{s.건수.toLocaleString()}</td>
                        <td className={tdRight}>{s.출력페이지.toLocaleString()}</td>
                        <td className={tdRight}>{s.확정청구페이지.toLocaleString()}</td>
                      </tr>
                    );
                  })()}
              </Fragment>
            ))}
            {라인목록.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-xs text-gray-400">
                  세부내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
