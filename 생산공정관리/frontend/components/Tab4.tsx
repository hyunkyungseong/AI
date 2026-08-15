"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Tab4Invoice from "./Tab4Invoice";
import Tab4IssuedList from "./Tab4IssuedList";
import Tab4EditHistory from "./Tab4EditHistory";
import type { 운영통계행, 미발행행, 발행행 } from "./Dashboard";

export type Tab4SubTabId = "unissued" | "pending" | "issued" | "history";

// 탭4 "거래명세서 관리" 오케스트레이터 — 서브탭 3개(미발행목록/발행요청목록/발행완료)를
// Dashboard.tsx 최상위 탭과 동일한 상시마운트+hidden 패턴으로 관리한다.
// invoice(미발행행[])·issued(발행행[]) state를 여기서 소유(controlled) — 자식들은 전부 이 배열을
// props로만 받아서, "미발행 목록에서 요청" → "발행요청목록에 즉시 반영" 같은 화면 간 정합성을
// 새로고침 없이 유지한다(router.refresh()는 자식의 useState(initialProp) 패턴과 충돌해 채택 안 함).
//
// 하위탭(subTab) 자체는 2026-08-12(같은 날) GNB 개편으로 Dashboard.tsx 상단 2번째 줄로
// 끌어올려져 controlled prop으로 바뀌었다(예전엔 이 컴포넌트가 자체 useState+<nav>로 소유).
export default function Tab4({
  rows,
  invoiceRows,
  issuedRows,
  active,
  subTab,
  setSubTab,
}: {
  rows: 운영통계행[];
  invoiceRows: 미발행행[];
  issuedRows: 발행행[];
  active: boolean; // "거래명세서 관리" 최상위 탭이 지금 보이는 중인지(Dashboard.tsx)
  subTab: Tab4SubTabId;
  setSubTab: (id: Tab4SubTabId) => void;
}) {
  const [invoice, setInvoice] = useState(invoiceRows);
  const [issued, setIssued] = useState(issuedRows);

  // "거래명세서 관리" 탭을 다시 클릭할 때마다 미발행 목록을 서버에서 새로 받아온다(2026-08-09,
  // 사용자 요청) — 예상공급가액은 서버(billing.py)가 단가마스터 기준으로 계산해 내려주는 값인데,
  // 이 화면은 페이지를 처음 열 때 딱 한 번만 받아온 뒤로는 다시 안 받아오고 있어서, "단가관리"
  // 탭에서 방금 등록한 단가가 미발행 목록의 "단가 미등록" 표시에 실시간 반영되지 않는 문제가 있었음.
  // 최초 마운트 시(기본 탭이 "summary"라 active=false로 시작)에는 이미 서버에서 막 받아온 최신
  // 데이터라 다시 부를 필요 없음 — false→true로 "새로 켜질 때"만 트리거한다.
  const 이전active = useRef(active);
  useEffect(() => {
    const 방금까지비활성 = !이전active.current;
    이전active.current = active;
    if (!active || !방금까지비활성) return;
    (async () => {
      try {
        const res = await fetch("/api/invoice-list");
        if (!res.ok) return;
        const data: 미발행행[] = await res.json();
        setInvoice(data);
      } catch {
        // 새로고침 실패는 조용히 무시 — 화면에 이미 떠 있는 기존 데이터를 그대로 유지한다
        // (백그라운드 갱신이라 사용자 작업을 막는 오류 표시까지는 불필요).
      }
    })();
  }, [active]);

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
      // 거래명세서 요청 확정 직후 발행요청목록 탭으로 자동 이동(2026-08-12 사용자 요청) — 방금
      // 만든 건을 그 탭의 다운로드 아이콘으로 바로 받아볼 수 있어서, 성공 배너에 별도 다운로드
      // 버튼을 두는 것보다 낫다는 판단.
      setSubTab("pending");
    },
    [작업일자내림차순, setSubTab]
  );

  const handleReturnToUnissued = useCallback(
    (반환: 미발행행[]) => {
      setInvoice((prev) => 작업일자내림차순([...prev, ...반환]));
    },
    [작업일자내림차순]
  );

  return (
    <div className="flex flex-1 flex-col">
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
        <div className={subTab === "history" ? "flex flex-1" : "hidden"}>
          <Tab4EditHistory active={subTab === "history"} />
        </div>
      </div>
    </div>
  );
}
