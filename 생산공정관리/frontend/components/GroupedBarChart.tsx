"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";

type Datum = { 항목: string; 이전: number; 현재: number };

type Props = {
  title: string;
  data: Datum[];
  이전라벨: string;
  현재라벨: string;
  color이전: string;
  color현재: string;
};

const numberFormat = (v: unknown) => (typeof v === "number" ? v.toLocaleString() : String(v ?? ""));

export default function GroupedBarChart({ title, data, 이전라벨, 현재라벨, color이전, color현재 }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 20, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
          <XAxis dataKey="항목" tick={{ fontSize: 12, fill: "#898781" }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#898781" }} axisLine={false} tickLine={false} width={56} />
          <Tooltip formatter={numberFormat} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="이전" name={이전라벨} fill={color이전} radius={[4, 4, 0, 0]}>
            <LabelList dataKey="이전" position="top" formatter={numberFormat} style={{ fontSize: 11, fill: "#52514e" }} />
          </Bar>
          <Bar dataKey="현재" name={현재라벨} fill={color현재} radius={[4, 4, 0, 0]}>
            <LabelList dataKey="현재" position="top" formatter={numberFormat} style={{ fontSize: 11, fill: "#52514e" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
