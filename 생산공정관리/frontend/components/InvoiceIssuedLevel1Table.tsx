"use client";

import { memo } from "react";
import type { 레벨1그룹 } from "@/lib/issuedGrouping";

type Props = {
  groups: 레벨1그룹[];
  selected: Set<string>;
  onToggleRow: (key: string) => void;
  onToggleAll: (checked: boolean) => void;
  onShowHistory: (no: string) => void;
  showDownload?: boolean;
  // 거래처 승인 대기 게이트(2026-08-12) — 발행요청목록 전용, 발행완료 탭엔 안 보임(이미 발행돼
  // 의미가 없어짐). 꺼두면 경영지원부가 "거래명세서 발행" 처리 시 그 건만 자동 제외된다.
  showPublishGate?: boolean;
  onTogglePublishGate?: (no: string, value: boolean) => void;
};

type RowProps = {
  group: 레벨1그룹;
  index: number;
  checked: boolean;
  onToggle: (key: string) => void;
  onShowHistory: (no: string) => void;
  showDownload?: boolean;
  showPublishGate?: boolean;
  onTogglePublishGate?: (no: string, value: boolean) => void;
};

// 다운로드 열 아이콘(2026-08-12, 사용자 요청 — 한글 텍스트 대신 직관적인 아이콘). 별도 아이콘
// 패키지 없이 인라인 SVG로 그려 의존성을 늘리지 않는다(이 파일에서 헤더·행 셀 두 곳에서만 쓰임).
function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  );
}

// InvoiceSelectionTable.tsx의 React.memo Row 패턴 재사용 — 체크박스 하나 토글할 때 전체 행이
// 다시 그려지는 성능 문제를 막기 위해 각 행에 checked(boolean) 스칼라만 전달한다([4-B]에서 실측 검증됨).
const Row = memo(function Row({
  group: g,
  index,
  checked,
  onToggle,
  onShowHistory,
  showDownload,
  showPublishGate,
  onTogglePublishGate,
}: RowProps) {
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
      {showPublishGate && (
        <td className="px-3 py-1.5">
          <label className="inline-flex items-center gap-1 whitespace-nowrap text-xs">
            <input
              type="checkbox"
              checked={g.발행가능 === 1}
              onChange={(e) => onTogglePublishGate?.(g.거래명세서번호, e.target.checked)}
              aria-label={`${g.거래명세서번호} 발행가능`}
            />
            {g.발행가능 === 0 && (
              <span className="text-amber-600 dark:text-amber-400">승인대기</span>
            )}
          </label>
        </td>
      )}
      {showDownload && (
        <td className="px-3 py-1.5 text-center">
          <a
            href={`/api/invoice-excel/${encodeURIComponent(g.거래명세서번호)}`}
            download
            title="다운로드"
            aria-label={`${g.거래명세서번호} 다운로드`}
            className="inline-flex text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <DownloadIcon className="h-4 w-4" />
          </a>
        </td>
      )}
      <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{index + 1}</td>
      <td className="px-3 py-1.5 text-gray-900 dark:text-gray-100">
        {g.거래명세서번호}
        {g.수정이력있음 && (
          <button
            type="button"
            onClick={() => onShowHistory(g.거래명세서번호)}
            className={`ml-1.5 rounded border px-1 text-xs ${
              g.합계증감 > 0
                ? "border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
                : g.합계증감 < 0
                ? "border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
                : "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
            }`}
            title={
              g.합계증감 !== 0
                ? `원본과 최종 확정 내용 비교 (합계 ${g.합계증감 > 0 ? "+" : ""}${Math.round(g.합계증감).toLocaleString()}원)`
                : "원본과 최종 확정 내용 비교"
            }
          >
            편집됨
          </button>
        )}
      </td>
      <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{g.사업부}</td>
      <td className="px-3 py-1.5 text-gray-900 dark:text-gray-100">{g.거래처명}</td>
      <td className="max-w-[220px] truncate px-3 py-1.5 text-gray-700 dark:text-gray-300" title={g.업무명}>
        {g.업무명}
      </td>
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
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
        {g.확정공급가액.toLocaleString()}원
        {g.예상공급가액 !== null && g.확정공급가액 - g.예상공급가액 !== 0 && (
          <span
            className={`ml-1 ${
              g.확정공급가액 - g.예상공급가액 > 0
                ? "text-red-600 dark:text-red-400"
                : "text-blue-600 dark:text-blue-400"
            }`}
          >
            ({g.확정공급가액 - g.예상공급가액 > 0 ? "+" : ""}
            {(g.확정공급가액 - g.예상공급가액).toLocaleString()})
          </span>
        )}
      </td>
    </tr>
  );
});

// showDownload=true면 체크박스 옆에 거래명세서번호 단위 다운로드 아이콘을 추가한다. 원래(CHANGELOG
// 2026-07-17)는 발행완료 탭 전용이었으나, GET /거래명세서엑셀/{no}가 발송여부와 무관하게 항상
// 동작하는 구조라는 걸 확인하고 2026-08-12부터 발행요청목록(대기) 탭에도 켰다 — 거래처 승인을
// 받으려면 발행 전에도 실제 서식 그대로의 파일을 보여줄 수 있어야 한다는 사용자 요청.
// 체크박스 선택과 무관하게 행마다 바로 내려받을 수 있어, 그룹(거래명세서번호+업무명) 여러 개를 선택했을 때
// "어느 파일을 받는 건지" 모호해지는 문제 없이 항상 명확하다.
export default function InvoiceIssuedLevel1Table({
  groups,
  selected,
  onToggleRow,
  onToggleAll,
  onShowHistory,
  showDownload = false,
  showPublishGate = false,
  onTogglePublishGate,
}: Props) {
  const 전체선택됨 = groups.length > 0 && groups.every((g) => selected.has(g.key));
  const colSpan = 16 + (showDownload ? 1 : 0) + (showPublishGate ? 1 : 0);

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
            {showPublishGate && (
              <th
                className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300"
                title="꺼두면 거래처 승인 대기 중으로 표시되고, 경영지원부가 발행할 수 없습니다"
              >
                발행가능
              </th>
            )}
            {showDownload && (
              <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-300" title="다운로드">
                <DownloadIcon className="mx-auto h-4 w-4" />
                <span className="sr-only">다운로드</span>
              </th>
            )}
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
            <th
              className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300"
              title="실제 확정 저장된 공급가액(괄호는 예상공급가액과의 차이)"
            >
              청구공급가액
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g, i) => (
            <Row
              key={g.key}
              group={g}
              index={i}
              checked={selected.has(g.key)}
              onToggle={onToggleRow}
              onShowHistory={onShowHistory}
              showDownload={showDownload}
              showPublishGate={showPublishGate}
              onTogglePublishGate={onTogglePublishGate}
            />
          ))}
          {groups.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="px-3 py-6 text-center text-xs text-gray-400">
                조건에 맞는 항목이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
