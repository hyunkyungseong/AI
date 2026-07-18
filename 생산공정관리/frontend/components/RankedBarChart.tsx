"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toMillionLabel } from "@/lib/format";

type Datum = { 이름: string; 값: number; 구분: string };

type Props = {
  title: string;
  /** 값 내림차순으로 이미 정렬된 상태로 전달 (1위가 배열 맨 앞) */
  data: Datum[];
  colorMap: Record<string, string>;
};

const numberFormat = (v: unknown) => (typeof v === "number" ? v.toLocaleString() : String(v ?? ""));
const millionFormat = (v: unknown) => (typeof v === "number" ? toMillionLabel(v) : String(v ?? ""));

// 순위형 가로 막대차트 — Streamlit tab2의 "상위 20" 랭킹 차트에 대응.
// colorMap은 탭1(DeptBarChart)과 동일한 팔레트를 넘겨써서, 앱 전체에서 같은 사업부는 항상 같은 색으로 보이게 함.
export default function RankedBarChart({ title, data, colorMap }: Props) {
  // Recharts 수직 막대차트는 데이터 배열의 첫 항목을 맨 위에 그리므로,
  // 이미 내림차순(1위가 배열 맨 앞)으로 전달된 data를 그대로 쓰면 1위가 맨 위에 옴
  const chartData = data;
  const height = Math.max(220, chartData.length * 28);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <div className="flex gap-3">
          {Object.entries(colorMap).map(([label, color]) => (
            <span key={label} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>
      {chartData.length === 0 ? (
        <p className="py-8 text-center text-xs text-gray-400">데이터 없음</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12, fill: "#898781" }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} />
            <YAxis
              type="category"
              dataKey="이름"
              tick={{ fontSize: 12, fill: "#898781" }}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip formatter={numberFormat} />
            <Bar dataKey="값" radius={[0, 4, 4, 0]}>
              {chartData.map((d) => (
                <Cell key={d.이름} fill={colorMap[d.구분] ?? "#2a78d6"} />
              ))}
              <LabelList dataKey="값" position="right" formatter={millionFormat} style={{ fontSize: 11, fill: "#52514e" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
