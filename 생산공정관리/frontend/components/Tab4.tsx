"use client";

import { useCallback, useState } from "react";
import Tab4Invoice from "./Tab4Invoice";
import Tab4IssuedList from "./Tab4IssuedList";
import type { 운영통계행, 미발행행, 발행행 } from "./Dashboard";

const SUB_TABS = [
  { id: "unissued", label: "미발행 목록" },
  { id: "pending", label: "발행요청목록" },
  { id: "issued", label: "발행완료" },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

// 탭4 "거래명세서 관리" 오케스트레이터 — 서브탭 3개(미발행목록/발행요청목록/발행완료)를
// Dashboard.tsx 최상위 탭과 동일한 상시마운트+hidden 패턴으로 관리한다.
// invoice(미발행행[])·issued(발행행[]) state를 여기서 소유(controlled) — 자식들은 전부 이 배열을
// props로만 받아서, "미발행 목록에서 요청" → "발행요청목록에 즉시 반영" 같은 화면 간 정합성을
// 새로고침 없이 유지한다(router.refresh()는 자식의 useState(initialProp) 패턴과 충돌해 채택 안 함).
export default function Tab4({
  rows,
  invoiceRows,
  issuedRows,
}: {
  rows: 운영통계행[];
  invoiceRows: 미발행행[];
  issuedRows: 발행행[];
}) {
  const [subTab, setSubTab] = useState<SubTabId>("unissued");
  const [invoice, setInvoice] = useState(invoiceRows);
  const [issued, setIssued] = useState(issuedRows);

  // FastAPI(/미발행목록·/발행목록)는 작업일자 내림차순으로 정렬해서 내려주는데, 여기서 단순
  // append만 하면 방금 옮겨온 항목이 정렬 순서를 깨고 배열 맨 끝(화면상 맨 아래)에 붙어버린다.
  // 서버와 동일한 기준으로 다시 정렬해서 위치가 맞게 끼워지도록 한다.
  const 작업일자내림차순 = useCallback(
    <T extends { 작업일자: string }>(rows: T[]): T[] => [...rows].sort((a, b) => b.작업일자.localeCompare(a.작업일자)),
    []
  );

  const handleIssued = useCallback(
    (신규: 발행행[]) => {
      setIssued((prev) => 작업일자내림차순([...prev, ...신규]));
    },
    [작업일자내림차순]
  );

  const handleReturnToUnissued = useCallback(
    (반환: 미발행행[]) => {
      setInvoice((prev) => 작업일자내림차순([...prev, ...반환]));
    },
    [작업일자내림차순]
  );

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
        <div className={subTab === "unissued" ? "flex flex-1" : "hidden"}>
          <Tab4Invoice rows={invoice} setRows={setInvoice} detailRows={rows} onIssued={handleIssued} />
        </div>
        <div className={subTab === "pending" ? "flex flex-1" : "hidden"}>
          <Tab4IssuedList
            mode="대기"
            rows={issued}
            setRows={setIssued}
            detailRows={rows}
            onReturnToUnissued={handleReturnToUnissued}
          />
        </div>
        <div className={subTab === "issued" ? "flex flex-1" : "hidden"}>
          <Tab4IssuedList
            mode="완료"
            rows={issued}
            setRows={setIssued}
            detailRows={rows}
            onReturnToUnissued={handleReturnToUnissued}
          />
        </div>
      </div>
    </div>
  );
}
