"use client";

import { useEffect, useState } from "react";
import { 필드표시, 차이표시, 차이색상 } from "@/lib/auditLog";

type 이력행 = { 코드: string | null; 품목: string; 작업명: string | null; 수량: number; 단가: number | null; 금액: number };
// 감사이력 한 줄(2026-08-13, 마케팅팀 요청 — 누가/언제 공급가액·부가세·품목을 바꿨는지).
// 품목 필드(수량/단가/금액/품목추가/품목삭제)는 비고에 그 품목명이, 총계 필드(공급가액/세액)는
// 비고 없이 필드명만 채워진다(2026-08-13, `_품목_변경_이력()` 참고) — 화면 표시는 `필드표시()` 참고.
type 수정이력행 = {
  필드명: string;
  이전값: number | null;
  이후값: number | null;
  비고: string | null;
  수정자: string;
  수정일시: string;
};
// 공급가액·세액을 원본(자동계산)·최종(실제 확정) 두 값으로 따로 받는다(2026-08-14 버그 수정 —
// 총계 override(2026-08-13) 도입 후 최종 쪽이 원본과 달라질 수 있는데, 예전엔 세액 하나만 양쪽에
// 그대로 재사용해 "최종" 표가 실제 저장된 값이 아니라 원본과 똑같은 숫자를 보여주고 있었음).
// 존재함=false면 그 거래명세서번호가 취소·삭제된 뒤라 원본/최종 스냅샷은 이미 사라졌지만(FK CASCADE로
// 함께 삭제됨), 감사이력(수정이력)만은 독립 테이블이라 남아있는 경우(2026-08-14).
type 이력응답 = {
  존재함: boolean;
  편집여부: boolean;
  원본세액: number;
  최종세액: number;
  원본공급가액: number;
  최종공급가액: number;
  원본: 이력행[];
  최종: 이력행[];
  수정이력: 수정이력행[];
};

type Props = {
  거래명세서번호: string;
  onClose: () => void;
};

const th = "px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300";
const thRight = "px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300";
const td = "px-3 py-1.5 text-gray-900 dark:text-gray-100";
const tdRight = "px-3 py-1.5 text-right tabular-nums text-gray-900 dark:text-gray-100";

function 표(제목: string, rows: 이력행[], 공급가액: number, 세액: number) {
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
            <tr className="border-t border-gray-200 dark:border-gray-700">
              <td className={td} colSpan={4}>
                공급가액
              </td>
              <td className={tdRight}>{Math.round(공급가액).toLocaleString()}원</td>
            </tr>
            <tr className="dark:border-gray-700">
              <td className={td} colSpan={4}>
                부가세
              </td>
              <td className={tdRight}>{Math.round(세액).toLocaleString()}원</td>
            </tr>
            <tr className="border-t border-gray-200 font-semibold dark:border-gray-700">
              <td className={td} colSpan={4}>
                합계
              </td>
              <td className={tdRight}>{Math.round(공급가액 + 세액).toLocaleString()}원</td>
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
  // 수정이력이 많으면 무제한으로 자라나 아래 원본/최종 비교 표를 화면 밖으로 밀어내던 문제
  // (2026-08-17 사용자 제보) — 기본은 접어두고 사용자가 클릭해야 펼쳐지게 함.
  const [수정이력펼침, set수정이력펼침] = useState(false);

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
          왼쪽은 저장된 조건식이 적용된 원본(확정 당시 기준), 오른쪽은 확정 당시 실제로 청구된 최종 내용입니다(읽기 전용).
        </p>

        {loading && <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">불러오는 중...</p>}
        {error && <p className="mt-6 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {data && !loading && !error && data.수정이력.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => set수정이력펼침((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:underline dark:text-gray-300"
            >
              <span>{수정이력펼침 ? "▼" : "▶"}</span>
              수정이력 ({data.수정이력.length}건)
            </button>
            {수정이력펼침 && (
              <div className="mt-1 max-h-56 overflow-auto rounded-md border border-gray-200 dark:border-gray-800">
                <table className="w-full whitespace-nowrap text-sm">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className={th}>필드</th>
                      <th className={thRight}>이전값</th>
                      <th className={thRight}>이후값</th>
                      <th className={th}>수정자</th>
                      <th className={th}>수정일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.수정이력.map((h, i) => (
                      <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                        <td className={td}>{필드표시(h.필드명, h.비고)}</td>
                        <td className={tdRight}>{h.이전값 === null ? "—" : Math.round(h.이전값).toLocaleString()}</td>
                        <td className={tdRight}>
                          {h.이후값 === null ? "—" : Math.round(h.이후값).toLocaleString()}
                          <span className={`ml-1 ${차이색상(h.필드명, h.이전값, h.이후값)}`}>
                            {차이표시(h.필드명, h.이전값, h.이후값)}
                          </span>
                        </td>
                        <td className={td}>{h.수정자}</td>
                        <td className={td}>{h.수정일시}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {data && !loading && !error && (
          <>
            {!data.존재함 ? (
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                이 거래명세서는 취소되어 품목 비교는 볼 수 없지만, 수정 이력은 위에 남아있습니다.
              </p>
            ) : data.원본.length === 0 && data.최종.length === 0 ? (
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                이 거래명세서는 저장된 편집 이력이 없습니다(이 기능 이전에 발행됐거나 원본 그대로 발행된 건일 수 있습니다).
              </p>
            ) : (
              <div className="mt-3 grid flex-1 grid-cols-2 gap-4 overflow-hidden">
                {표("원본(조건식 적용)", data.원본, data.원본공급가액, data.원본세액)}
                {표("최종(확정된 내용)", data.최종, data.최종공급가액, data.최종세액)}
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
