"use client";

import { useMemo } from "react";
import FilterSidebar from "./FilterSidebar";
import RankedBarChart from "./RankedBarChart";
import Heatmap from "./Heatmap";
import { useFilters } from "@/lib/useFilters";
import { 사업부색상, 작업자색상 } from "@/lib/colors";
import type { 운영통계행 } from "./Dashboard";

type 담당자집계 = { 담당자명: string; 구분: string; 출력페이지: number; 봉입건수: number };

const 구분순서: Record<string, number> = { 작업자: 0, DM사업부: 1, N사업부: 2 };
const 막대색상 = { 작업자: 작업자색상, ...사업부색상 };

function 담당자집계하기(rows: 운영통계행[]): 담당자집계[] {
  const 담당자맵 = new Map<string, 담당자집계>();
  for (const r of rows) {
    if (!r.마케팅담당자) continue;
    const acc = 담당자맵.get(r.마케팅담당자) ?? { 담당자명: r.마케팅담당자, 구분: r.사업부, 출력페이지: 0, 봉입건수: 0 };
    acc.출력페이지 += r.출력페이지 ?? 0;
    acc.봉입건수 += r.건수 ?? 0;
    담당자맵.set(r.마케팅담당자, acc);
  }

  const 작업자맵 = new Map<string, 담당자집계>();
  for (const r of rows) {
    if (!r.등록자) continue;
    const 담당자명 = `${r.등록자}(작업자)`;
    const acc = 작업자맵.get(담당자명) ?? { 담당자명, 구분: "작업자", 출력페이지: 0, 봉입건수: 0 };
    acc.출력페이지 += r.출력페이지 ?? 0;
    acc.봉입건수 += r.건수 ?? 0;
    작업자맵.set(담당자명, acc);
  }

  return [...담당자맵.values(), ...작업자맵.values()];
}

function 정렬해서변환(list: 담당자집계[], key: "출력페이지" | "봉입건수") {
  return [...list]
    .sort((a, b) => {
      const 순서차 = (구분순서[a.구분] ?? 99) - (구분순서[b.구분] ?? 99);
      if (순서차 !== 0) return 순서차;
      return b[key] - a[key];
    })
    .map((d) => ({ 이름: d.담당자명, 값: d[key], 구분: d.구분 }));
}

function 시간대집계하기(rows: 운영통계행[], 담당자필드: "마케팅담당자" | "등록자") {
  const values: Record<string, Record<number, number>> = {};
  for (const r of rows) {
    const 이름 = r[담당자필드];
    if (!이름 || r.시간대 == null) continue;
    if (!values[이름]) values[이름] = {};
    values[이름][r.시간대] = (values[이름][r.시간대] ?? 0) + (r.건수 ?? 0);
  }
  const 담당자목록 = Object.keys(values).sort((a, b) => a.localeCompare(b, "ko"));
  return { values, 담당자목록 };
}

const 시간대열 = Array.from({ length: 24 }, (_, i) => i);

// 탭3 — 담당자별 현황. 자체 useFilters(rows)를 호출해 탭1·탭2와 완전히 독립된 필터 상태를 가짐.
// Streamlit tab3(scripts/app.py 443~531행)를 이식: 마케팅담당자+작업자 통합 막대차트 2개(RankedBarChart 재사용)
// + 시간대별(0~23시) 업무 집중도 히트맵(마케팅담당자·작업자 각각)
export default function Tab3Staff({ rows }: { rows: 운영통계행[] }) {
  const filters = useFilters(rows);
  const 필터결과 = filters.base5;

  const has작업자 = useMemo(() => 필터결과.some((r) => r.등록자 && r.등록자.trim() !== ""), [필터결과]);

  const 담당자목록 = useMemo(() => 담당자집계하기(필터결과), [필터결과]);
  const 출력순위 = useMemo(() => 정렬해서변환(담당자목록, "출력페이지"), [담당자목록]);
  const 봉입순위 = useMemo(() => 정렬해서변환(담당자목록, "봉입건수"), [담당자목록]);

  const 마케팅히트맵 = useMemo(() => 시간대집계하기(필터결과, "마케팅담당자"), [필터결과]);
  const 작업자히트맵 = useMemo(() => 시간대집계하기(필터결과, "등록자"), [필터결과]);

  return (
    <>
      <FilterSidebar filters={filters} />

      <main className="flex-1 space-y-6 p-6">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          담당자별 현황 [{filters.사업부.length ? filters.사업부.join(", ") : "전체"}]
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">조회 데이터 {필터결과.length.toLocaleString()}행</p>

        <section className="grid gap-4 md:grid-cols-2">
          <RankedBarChart title="담당자별 출력페이지" data={출력순위} colorMap={막대색상} />
          <RankedBarChart title="담당자별 봉입건수" data={봉입순위} colorMap={막대색상} />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">시간대별 업무 집중도</h2>
          {has작업자 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Heatmap
                title="마케팅담당자 × 시간대 (봉입건수 합계)"
                rows={마케팅히트맵.담당자목록}
                columns={시간대열}
                values={마케팅히트맵.values}
                hue="#2a78d6"
                rowLabel="담당자"
                colLabel="시간대"
                valueLabel="건수"
              />
              <Heatmap
                title="작업자 × 시간대 (봉입건수 합계)"
                rows={작업자히트맵.담당자목록}
                columns={시간대열}
                values={작업자히트맵.values}
                hue="#008300"
                rowLabel="작업자"
                colLabel="시간대"
                valueLabel="건수"
              />
            </div>
          ) : (
            <Heatmap
              title="마케팅담당자 × 시간대 (봉입건수 합계)"
              rows={마케팅히트맵.담당자목록}
              columns={시간대열}
              values={마케팅히트맵.values}
              hue="#2a78d6"
              rowLabel="담당자"
              colLabel="시간대"
              valueLabel="건수"
            />
          )}
        </section>
      </main>
    </>
  );
}
