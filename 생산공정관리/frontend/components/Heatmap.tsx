"use client";

import { Fragment, useState } from "react";

type Props = {
  title: string;
  /** y축 라벨(행), 표시 순서 그대로 */
  rows: string[];
  /** x축 라벨(열), 표시 순서 그대로 — 이 히트맵에서는 0~23시 */
  columns: number[];
  /** rows[i]·columns[j] 조합의 값. 없으면 0으로 간주 */
  values: Record<string, Record<number, number>>;
  /** 시퀀셜 인코딩 기준 색조 (surface 색과 이 색 사이를 값 비율로 보간) */
  hue: string;
  rowLabel?: string;
  colLabel?: string;
  valueLabel?: string;
};

// 라이트 모드 chart surface(dataviz 스킬 palette.md 기준) — 기존 다른 차트 컴포넌트와 동일하게
// 다크모드 별도 색 전환 없이 고정 hex로 통일(DeptBarChart 등 기존 관례)
const SURFACE = "#fcfcfb";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const clamp = Math.min(1, Math.max(0, t));
  const mix = (x: number, y: number) => Math.round(x + (y - x) * clamp);
  return `#${[mix(ar, br), mix(ag, bg), mix(ab, bb)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

// 범용 시퀀셜 히트맵 그리드 — Streamlit px.imshow(시간대별 업무 집중도)에 대응.
// 값은 이 히트맵 자체의 최댓값 기준으로 정규화(Plotly imshow의 차트별 자동 스케일과 동일한 방식).
export default function Heatmap({
  title,
  rows,
  columns,
  values,
  hue,
  rowLabel = "항목",
  colLabel = "구간",
  valueLabel = "값",
}: Props) {
  const [hovered, setHovered] = useState<{ row: string; col: number; value: number } | null>(null);

  const max = Math.max(1, ...rows.flatMap((r) => columns.map((c) => values[r]?.[c] ?? 0)));

  return (
    <div className="relative rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-xs text-gray-400">데이터 없음</p>
      ) : (
        <div className="overflow-x-auto">
          <div
            className="inline-grid gap-[2px]"
            style={{ gridTemplateColumns: `88px repeat(${columns.length}, 22px)` }}
          >
            <div />
            {columns.map((c) => (
              <div key={c} className="pb-1 text-center text-[10px] text-gray-400">
                {c}
              </div>
            ))}

            {rows.map((r) => (
              <Fragment key={r}>
                <div
                  className="flex items-center justify-end truncate pr-2 text-right text-xs text-gray-600 dark:text-gray-300"
                  title={r}
                >
                  {r}
                </div>
                {columns.map((c) => {
                  const v = values[r]?.[c] ?? 0;
                  const t = v / max;
                  return (
                    <div
                      key={c}
                      role="gridcell"
                      tabIndex={0}
                      aria-label={`${r} · ${colLabel} ${c} · ${valueLabel} ${v.toLocaleString()}`}
                      onMouseEnter={() => setHovered({ row: r, col: c, value: v })}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered({ row: r, col: c, value: v })}
                      onBlur={() => setHovered(null)}
                      className="h-[20px] w-[20px] cursor-default outline-none hover:ring-2 hover:ring-gray-400 focus:ring-2 focus:ring-gray-400 dark:hover:ring-gray-500"
                      style={{ backgroundColor: mixHex(SURFACE, hue, t) }}
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {hovered && (
        <div className="pointer-events-none absolute bottom-2 right-2 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {rowLabel} <span className="font-semibold">{hovered.row}</span> · {colLabel} {hovered.col} ·{" "}
          <span className="font-semibold">{hovered.value.toLocaleString()}</span> {valueLabel}
        </div>
      )}
    </div>
  );
}
