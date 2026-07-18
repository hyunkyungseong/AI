"use client";

import { useState } from "react";
import LogoutButton from "./LogoutButton";
import Tab1Summary from "./Tab1Summary";
import Tab2Clients from "./Tab2Clients";
import Tab3Staff from "./Tab3Staff";

export type 운영통계행 = {
  연월: string;
  날짜: string;
  사업부: string;
  거래처명: string;
  마케팅담당자: string;
  등록자: string;
  업무명: string;
  출력페이지: number;
  장수: number;
  건수: number;
  확정청구페이지: number;
  시간대: number | null;
};

const TABS = [
  { id: "summary", label: "작업 현황 요약" },
  { id: "clients", label: "거래처별 현황" },
  { id: "staff", label: "담당자별 현황" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// 탭마다 Tab1Summary·Tab2Clients를 항상 둘 다 마운트해두고 CSS(hidden)로만 숨김 처리.
// 언마운트하면 각 탭이 들고 있는 useFilters() 상태(필터 선택값)가 날아가버리기 때문.
export default function Dashboard({ rows }: { rows: 운영통계행[] }) {
  const [tab, setTab] = useState<TabId>("summary");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3 dark:border-gray-800">
        <nav className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                "rounded-md px-3 py-1.5 text-sm font-medium " +
                (tab === t.id
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800")
              }
            >
              {t.label}
            </button>
          ))}
        </nav>
        <LogoutButton />
      </header>

      <div className="flex flex-1">
        <div className={tab === "summary" ? "flex flex-1" : "hidden"}>
          <Tab1Summary rows={rows} />
        </div>
        <div className={tab === "clients" ? "flex flex-1" : "hidden"}>
          <Tab2Clients rows={rows} />
        </div>
        <div className={tab === "staff" ? "flex flex-1" : "hidden"}>
          <Tab3Staff rows={rows} />
        </div>
      </div>
    </div>
  );
}
