"use client";

import type { 미발행행 } from "@/components/Dashboard";

type Props = {
  selectedRows: 미발행행[];
  // "선택 유지" 이후 새로 체크한 항목만 별도로 보여줄 때 재사용하기 위한 캡션 커스터마이즈
  // (2026-08-09) — 기본값은 기존 문구 그대로.
  caption?: string;
};

const th = "px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300";
const td = "px-3 py-1.5 text-right tabular-nums font-semibold text-gray-900 dark:text-gray-100";

// 선택된 의뢰서 합계 표 — app.py t4a(878~890행)의 HTML 합계 줄과 동일한 산식이지만, 파이프(|)로
// 한 줄에 나열하면 가독성이 떨어진다는 피드백(2026-07-19)에 따라 표 형태로 변경.
// "거래명세서 요청" 버튼 바로 아래에 세로로 쌓아 배치한다(2026-07-19, 사용자 최종 확정) — 처음엔
// 제목 오른쪽 끝에 우측정렬로 뒀으나 화면 폭이 넓다 보니 너무 멀리 떨어져 눈에 잘 안 띄었고
// (사용자가 "생성이 안 된 줄 알았다"고 할 정도), 버튼 옆 가로 배치도 폭이 부족하면 줄바꿈되며
// 세로 공간을 더 차지하는 문제가 있었음. 버튼 바로 밑에 쌓으면 화면 폭과 무관하게 항상 버튼
// 근처(=사용자가 이미 보고 있는 위치)에 나타나 두 문제를 모두 피한다. "선택 합계" 같은 중복
// 라벨 없이 "선택 N건" 캡션 하나만 붙여 최대한 컴팩트하게 유지한다.
export default function InvoiceSelectionSummaryBar({ selectedRows, caption = "선택" }: Props) {
  const 총청구 = selectedRows.reduce((s, r) => s + r.청구페이지, 0);
  const 총봉입 = selectedRows.reduce((s, r) => s + r.봉입건수, 0);
  const 총장수 = selectedRows.reduce((s, r) => s + r.장수, 0);
  const 총용지 = selectedRows.reduce((s, r) => s + r.용지수량, 0);
  const 총봉투 = selectedRows.reduce((s, r) => s + r.봉투수량, 0);
  const 총삽지 = selectedRows.reduce((s, r) => s + r.삽지수량, 0);
  const 총추가용지 = Math.max(0, 총장수 - 총봉입);
  const 단가미등록있음 = selectedRows.some((r) => r.예상공급가액 === null);
  const 총공급 = selectedRows.reduce((s, r) => s + (r.예상공급가액 ?? 0), 0);
  const 사업부목록 = Array.from(new Set(selectedRows.map((r) => r.사업부)));

  return (
    <section>
      <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
        {caption} {selectedRows.length.toLocaleString()}건
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="whitespace-nowrap text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className={th}>청구페이지</th>
              <th className={th}>봉입건수</th>
              <th className={th}>장수</th>
              <th className={th}>봉투</th>
              <th className={th}>용지</th>
              <th className={th}>추가용지</th>
              <th className={th}>삽지</th>
              <th className={th}>예상공급가액</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100 dark:border-gray-800">
              <td className={td}>{총청구.toLocaleString()}</td>
              <td className={td}>{총봉입.toLocaleString()}</td>
              <td className={td}>{총장수.toLocaleString()}</td>
              <td className={td}>{총봉투.toLocaleString()}</td>
              <td className={td}>{총용지.toLocaleString()}</td>
              <td className={td}>{총추가용지.toLocaleString()}</td>
              <td className={td}>{총삽지.toLocaleString()}</td>
              <td className={td}>
                {단가미등록있음 ? (
                  <span className="text-amber-600 dark:text-amber-400">단가 미등록</span>
                ) : (
                  `${총공급.toLocaleString()}원`
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {단가미등록있음 && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          ⚠️ 선택 항목 중 단가 미등록 의뢰서{" "}
          {selectedRows.filter((r) => r.예상공급가액 === null).length.toLocaleString()}건이 포함되어 있습니다. 아래 표의
          &quot;단가&quot; 열 ⚠️ 미등록 표시로 확인해 주세요.
        </p>
      )}
      {사업부목록.length > 1 && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          ⚠️ 선택 항목의 사업부가 서로 다릅니다({사업부목록.join(", ")}). 사업부를 통일해서 선택해 주세요.
        </p>
      )}
    </section>
  );
}
