"use client";

import FilterSidebar from "./FilterSidebar";
import StatCard from "./StatCard";
import DeptBarChart from "./DeptBarChart";
import GroupedBarChart from "./GroupedBarChart";
import { useFilters } from "@/lib/useFilters";
import { 사업부색상 } from "@/lib/colors";
import type { 운영통계행 } from "./Dashboard";

function 최근완료월(): string {
  const today = new Date();
  let y = today.getFullYear();
  let m = today.getMonth(); // 0-인덱스 이번달 값 = 1-인덱스 직전월 값과 같음 (1월만 예외)
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

function prevMonthStr(ym: string, n: number): string {
  let [y, m] = ym.split("-").map(Number);
  m -= n;
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

function sumBy(rows: 운영통계행[], 연월: string) {
  return rows.reduce(
    (acc, r) => {
      if (r.연월 === 연월) {
        acc.출력페이지 += r.출력페이지 ?? 0;
        acc.장수 += r.장수 ?? 0;
        acc.건수 += r.건수 ?? 0;
        acc.확정청구페이지 += r.확정청구페이지 ?? 0;
      }
      return acc;
    },
    { 출력페이지: 0, 장수: 0, 건수: 0, 확정청구페이지: 0 }
  );
}

function pct(cur: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

// 탭1 — 작업 현황 요약. 자체 useFilters(rows)를 호출해 탭2와 완전히 독립된 필터 상태를 가짐.
export default function Tab1Summary({ rows }: { rows: 운영통계행[] }) {
  const filters = useFilters(rows);
  const { 사업부, 종료일, 담당자, 거래처, 업무명, base1, base5, 기본종료일, 자동대체됨 } = filters;

  // 기준월(전월·전년동월 비교 기준)은 조회기간의 종료일에서 산출
  const 기준월 = 종료일 ? 종료일.slice(0, 7) : 최근완료월();
  const 전월str = prevMonthStr(기준월, 1);
  const [연, 월] = 기준월.split("-");
  const 전년동월str = `${Number(연) - 1}-${월}`;

  // 전월·전년 비교는 날짜 범위가 아니라 사업부·담당자·거래처·업무명 필터만 반영
  // (날짜 범위까지 적용하면 비교 대상 월의 데이터가 통째로 잘려나가 항상 0이 되어버림)
  const 비교base = base1.filter(
    (r) =>
      (담당자.length === 0 || 담당자.includes(r.마케팅담당자)) &&
      (거래처.length === 0 || 거래처.includes(r.거래처명)) &&
      (업무명.length === 0 || 업무명.includes(r.업무명))
  );

  const 현재 = sumBy(비교base, 기준월);
  const 전월 = sumBy(비교base, 전월str);
  const 전년 = sumBy(비교base, 전년동월str);

  const dm = sumBy(
    rows.filter((r) => r.사업부 === "DM사업부"),
    기준월
  );
  const ns = sumBy(
    rows.filter((r) => r.사업부 === "N사업부"),
    기준월
  );

  const 전월비교 = [
    { 항목: "출력페이지", 이전: 전월.출력페이지, 현재: 현재.출력페이지 },
    { 항목: "봉입건수", 이전: 전월.건수, 현재: 현재.건수 },
  ];
  const 전년비교 = [
    { 항목: "출력페이지", 이전: 전년.출력페이지, 현재: 현재.출력페이지 },
    { 항목: "봉입건수", 이전: 전년.건수, 현재: 현재.건수 },
  ];
  const 사업부출력 = [
    { 사업부: "DM사업부", 값: dm.출력페이지 },
    { 사업부: "N사업부", 값: ns.출력페이지 },
  ];
  const 사업부봉입 = [
    { 사업부: "DM사업부", 값: dm.건수 },
    { 사업부: "N사업부", 값: ns.건수 },
  ];

  return (
    <>
      <FilterSidebar filters={filters} />

      <main className="flex-1 space-y-6 p-6">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          작업 현황 요약 [{사업부.length ? 사업부.join(", ") : "전체"}]
        </h1>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          기준월 {기준월} · 전월 {전월str} · 전년동월 {전년동월str} · 조회 데이터 {base5.length.toLocaleString()}행
          {자동대체됨 && 종료일 === 기본종료일 && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">(선택 가능한 최근 데이터가 있는 월로 자동 대체됨)</span>
          )}
        </p>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="출력페이지 (장비기준)"
            value={현재.출력페이지}
            deltaPct={pct(현재.출력페이지, 전월.출력페이지)}
            deltaLabel={`전월(${전월str}) 대비`}
          />
          <StatCard
            label="출력자재사용량 (장)"
            value={현재.장수}
            deltaPct={pct(현재.장수, 전월.장수)}
            deltaLabel={`전월(${전월str}) 대비`}
          />
          <StatCard
            label="봉입건수"
            value={현재.건수}
            deltaPct={pct(현재.건수, 전월.건수)}
            deltaLabel={`전월(${전월str}) 대비`}
          />
          <StatCard
            label="청구페이지"
            value={현재.확정청구페이지}
            deltaPct={pct(현재.확정청구페이지, 전월.확정청구페이지)}
            deltaLabel={`전월(${전월str}) 대비`}
          />
        </section>

        {사업부.length === 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">사업부별 비교 ({기준월})</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <DeptBarChart
                title="사업부별 출력페이지"
                data={사업부출력}
                colorMap={사업부색상}
              />
              <DeptBarChart
                title="사업부별 봉입건수"
                data={사업부봉입}
                colorMap={사업부색상}
              />
            </div>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2">
          <GroupedBarChart
            title={`전월 대비 (${전월str} → ${기준월})`}
            data={전월비교}
            이전라벨={전월str}
            현재라벨={`기준월(${기준월})`}
            color이전="#eb6834"
            color현재="#2a78d6"
          />
          <GroupedBarChart
            title={`전년동월 대비 (${전년동월str} → ${기준월})`}
            data={전년비교}
            이전라벨={전년동월str}
            현재라벨={`기준월(${기준월})`}
            color이전="#008300"
            color현재="#2a78d6"
          />
        </section>
      </main>
    </>
  );
}
