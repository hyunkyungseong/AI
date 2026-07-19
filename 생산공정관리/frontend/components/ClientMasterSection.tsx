"use client";

import { useState } from "react";
import ClientMaster from "./ClientMaster";
import PricingMaster from "./PricingMaster";
import type { 거래처행, 단가행, 운영통계행 } from "./Dashboard";

const SUB_TABS = [
  { id: "clients", label: "거래처관리" },
  { id: "pricing", label: "단가관리" },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

// "거래처 마스터" 최상위 탭의 하위 메뉴 허브 — Tab4.tsx(거래명세서 관리의 3개 하위 메뉴)와
// 동일한 상시마운트+hidden 패턴. 애초 [4-A] 설계 때는 거래처 마스터·단가 관리를 각각 독립
// 최상위 탭으로 분리하기로 했었으나(권한 관리 대비), 같은 거래처를 다루는 밀접한 화면이라
// 하위 메뉴로 묶는 편이 낫다고 재확정(2026-07-19) — 권한 분리가 필요해지면 하위 메뉴 단위로도
// 얼마든지 숨김 처리 가능하므로 최상위 분리가 필수는 아니라고 판단.
export default function ClientMasterSection({
  clientRows,
  pricingRows,
  taskRows,
}: {
  clientRows: 거래처행[];
  pricingRows: 단가행[];
  taskRows: 운영통계행[];
}) {
  const [subTab, setSubTab] = useState<SubTabId>("clients");

  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex gap-1 border-b border-gray-200 px-4 py-2 dark:border-gray-800">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={
              "rounded-md px-3 py-1 text-sm font-medium " +
              (subTab === t.id
                ? "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800")
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex flex-1">
        <div className={subTab === "clients" ? "flex flex-1" : "hidden"}>
          <ClientMaster rows={clientRows} />
        </div>
        <div className={subTab === "pricing" ? "flex flex-1" : "hidden"}>
          <PricingMaster rows={pricingRows} clientRows={clientRows} taskRows={taskRows} />
        </div>
      </div>
    </div>
  );
}
