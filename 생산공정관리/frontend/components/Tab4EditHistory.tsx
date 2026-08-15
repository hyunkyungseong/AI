"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import InvoiceHistoryDialog from "./InvoiceHistoryDialog";
import { 필드표시, 차이표시, 차이색상 } from "@/lib/auditLog";

type 수정이력행 = {
  거래명세서번호: string;
  거래처명: string | null;
  담당자: string | null;
  업무명: string | null;  // 2026-08-14, 취소된 건도 남도록 거래명세서_수정이력에 비정규화 저장된 값
  필드명: string;
  이전값: number | null;
  이후값: number | null;
  비고: string | null;
  수정자: string;
  수정일시: string;
};

const th = "px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300";
const thRight = "px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300";
const td = "px-3 py-1.5 text-gray-900 dark:text-gray-100";
const tdRight = "px-3 py-1.5 text-right tabular-nums text-gray-900 dark:text-gray-100";

// "거래명세서 관리" 신규 하위탭(2026-08-13, 마케팅팀 요청) — 전체 거래명세서에 걸친 공급가액·
// 부가세·품목 수정 이력을 한 화면에서 검색·조회. 개별 건 상세는 기존 "편집됨" 배지 팝업
// (InvoiceHistoryDialog.tsx)이 담당하고, 이 탭은 특정 건을 미리 몰라도 "누가 언제 무엇을
// 조정했는지" 전체를 훑어보는 용도 — 행을 클릭하면 그 거래명세서번호로 같은 팝업을 바로 연다.
export default function Tab4EditHistory({ active }: { active: boolean }) {
  const [rows, setRows] = useState<수정이력행[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [검색어, set검색어] = useState("");
  const [historyTarget, setHistoryTarget] = useState<string | null>(null);

  function 다시조회() {
    let 취소됨 = false;
    fetch("/api/invoice-edit-history")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.detail ?? "수정 이력을 불러오지 못했습니다");
        if (!취소됨) setRows(json);
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
  }

  useEffect(다시조회, []);

  // 다른 서브탭에서 방금 확정한 수정 내역이 바로 안 보인다는 실사용 피드백(2026-08-13) — "거래명세서
  // 관리" 최상위 탭이 재진입 시 새로고침하는 것과 동일한 패턴(Tab4.tsx SKILL-34)을, 이 서브탭이
  // "비활성→활성" 전환될 때도 적용한다. 최초 마운트는 위 effect가 이미 처리하므로 여기서는
  // false→true로 "새로 켜질 때"만 트리거.
  const 이전active = useRef(active);
  useEffect(() => {
    const 방금까지비활성 = !이전active.current;
    이전active.current = active;
    if (!active || !방금까지비활성) return;
    setLoading(true);
    return 다시조회();
  }, [active]);

  const 필터된행 = useMemo(() => {
    const q = 검색어.trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.거래명세서번호.includes(q) ||
        (r.거래처명 ?? "").includes(q) ||
        (r.업무명 ?? "").includes(q) ||
        r.수정자.includes(q)
    );
  }, [rows, 검색어]);

  return (
    <div className="flex flex-1 flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={검색어}
          onChange={(e) => set검색어(e.target.value)}
          placeholder="거래명세서번호·거래처명·수정자로 검색"
          className="w-72 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
        <span className="text-xs text-gray-500 dark:text-gray-400">{필터된행.length}건</span>
      </div>

      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="sticky top-0 z-[5] bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className={th}>거래명세서번호</th>
                <th className={th}>거래처명</th>
                <th className={th}>업무명</th>
                <th className={th}>담당자</th>
                <th className={th}>필드</th>
                <th className={thRight}>이전값</th>
                <th className={thRight}>이후값</th>
                <th className={th}>수정자</th>
                <th className={th}>수정일시</th>
              </tr>
            </thead>
            <tbody>
              {필터된행.map((r, i) => (
                <tr
                  key={i}
                  onClick={() => setHistoryTarget(r.거래명세서번호)}
                  className="cursor-pointer border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60"
                >
                  <td className={td}>{r.거래명세서번호}</td>
                  <td className={td}>{r.거래처명 ?? "—"}</td>
                  <td className={td}>{r.업무명 ?? "—"}</td>
                  <td className={td}>{r.담당자 ?? "—"}</td>
                  <td className={td}>{필드표시(r.필드명, r.비고)}</td>
                  <td className={tdRight}>{r.이전값 === null ? "—" : Math.round(r.이전값).toLocaleString()}</td>
                  <td className={tdRight}>
                    {r.이후값 === null ? "—" : Math.round(r.이후값).toLocaleString()}
                    <span className={`ml-1 ${차이색상(r.필드명, r.이전값, r.이후값)}`}>
                      {차이표시(r.필드명, r.이전값, r.이후값)}
                    </span>
                  </td>
                  <td className={td}>{r.수정자}</td>
                  <td className={td}>{r.수정일시}</td>
                </tr>
              ))}
              {필터된행.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-xs text-gray-400">
                    수정 이력이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {historyTarget && (
        <InvoiceHistoryDialog key={historyTarget} 거래명세서번호={historyTarget} onClose={() => setHistoryTarget(null)} />
      )}
    </div>
  );
}
