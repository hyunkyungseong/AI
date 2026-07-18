"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from "recharts";

type Datum = { 사업부: string; 값: number };

type Props = {
  title: string;
  data: Datum[];
  colorMap: Record<string, string>;
};

const numberFormat = (v: unknown) => (typeof v === "number" ? v.toLocaleString() : String(v ?? ""));

export default function DeptBarChart({ title, data, colorMap }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 20, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
          <XAxis dataKey="사업부" tick={{ fontSize: 12, fill: "#898781" }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#898781" }} axisLine={false} tickLine={false} width={56} />
          <Tooltip formatter={numberFormat} />
          <Bar dataKey="값" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.사업부} fill={colorMap[d.사업부] ?? "#2a78d6"} />
            ))}
            <LabelList dataKey="값" position="top" formatter={numberFormat} style={{ fontSize: 11, fill: "#52514e" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
