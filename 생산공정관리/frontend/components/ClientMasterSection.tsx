"use client";

import { useEffect, useRef, useState } from "react";
import ClientMaster from "./ClientMaster";
import PricingMaster from "./PricingMaster";
import StaffMaster from "./StaffMaster";
import type { 거래처행, 단가행, 운영통계행 } from "./Dashboard";
// prop 이름은 부모(Dashboard.tsx)가 넘겨주는 초기값이라 계속 clientRows로 받되, 아래에서
// useState로 감싸 이 컴포넌트가 "진짜 소유자"가 되도록 한다(2026-08-09) — "거래처관리"
// 하위 탭에서 신규 등록해도 "단가관리" 하위 탭(형제 컴포넌트)이 그 새 거래처를 못 보던 버그 수정.
//
// + 같은 날 추가: 여러 담당자가 각자 다른 PC에서 이 화면을 동시에 쓰기 때문에, 같은 화면 안
// 상태 공유만으로는 "다른 사람이 다른 PC에서 방금 등록한 거래처·단가"까지는 못 잡는다(사용자
// 확인) — "거래처 마스터" 최상위 탭을 다시 클릭할 때마다 서버에서 둘 다 새로 받아온다
// (Tab4.tsx의 invoice 재조회와 동일한 패턴).

export type ClientMasterSubTabId = "clients" | "pricing" | "staff";

// "거래처 마스터" 최상위 탭의 하위 메뉴 허브 — Tab4.tsx(거래명세서 관리의 3개 하위 메뉴)와
// 동일한 상시마운트+hidden 패턴. 애초 [4-A] 설계 때는 거래처 마스터·단가 관리를 각각 독립
// 최상위 탭으로 분리하기로 했었으나(권한 관리 대비), 같은 거래처를 다루는 밀접한 화면이라
// 하위 메뉴로 묶는 편이 낫다고 재확정(2026-07-19) — 권한 분리가 필요해지면 하위 메뉴 단위로도
// 얼마든지 숨김 처리 가능하므로 최상위 분리가 필수는 아니라고 판단.
//
// 하위탭(subTab) 자체는 2026-08-12(같은 날) GNB 개편으로 Dashboard.tsx 상단 2번째 줄로
// 끌어올려져 controlled prop으로 바뀌었다(예전엔 이 컴포넌트가 자체 useState+<nav>로 소유).
// setSubTab은 여기선 필요 없음(내부에서 스스로 하위탭을 바꾸는 동작이 없음, 전환은 Dashboard.tsx가 담당) — Tab4.tsx와 달리 subTab만 받는다.
export default function ClientMasterSection({
  clientRows: initialClientRows,
  pricingRows: initialPricingRows,
  taskRows,
  active,
  subTab,
}: {
  clientRows: 거래처행[];
  pricingRows: 단가행[];
  taskRows: 운영통계행[];
  active: boolean; // "거래처 마스터" 최상위 탭이 지금 보이는 중인지(Dashboard.tsx)
  subTab: ClientMasterSubTabId;
}) {
  const [clientRows, setClientRows] = useState<거래처행[]>(initialClientRows);
  const [pricingRows, setPricingRows] = useState<단가행[]>(initialPricingRows);
  // PricingMaster는 아직 ClientMaster처럼 rows/setRows를 끌어올리지 않고 자체 로컬 사본을 쓰므로
  // (내부 필터·선택 상태가 얽혀 있어 이번 범위에서는 안 건드림), 새로고침 시엔 key를 바꿔 통째로
  // 재마운트해서 최신 pricingRows로 다시 초기화한다(ClientFormDialog의 formKey와 동일한 관례).
  const [pricingKey, setPricingKey] = useState(0);

  const 이전active = useRef(active);
  useEffect(() => {
    const 방금까지비활성 = !이전active.current;
    이전active.current = active;
    if (!active || !방금까지비활성) return;
    (async () => {
      try {
        const [clientRes, pricingRes] = await Promise.all([fetch("/api/client-list"), fetch("/api/pricing-list")]);
        if (clientRes.ok) setClientRows(await clientRes.json());
        if (pricingRes.ok) {
          setPricingRows(await pricingRes.json());
          setPricingKey((k) => k + 1);
        }
      } catch {
        // 새로고침 실패는 조용히 무시 — 기존 화면 그대로 유지(백그라운드 갱신이라 오류 표시 불필요).
      }
    })();
  }, [active]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1">
        <div className={subTab === "clients" ? "flex flex-1" : "hidden"}>
          <ClientMaster rows={clientRows} setRows={setClientRows} taskRows={taskRows} />
        </div>
        <div className={subTab === "pricing" ? "flex flex-1" : "hidden"}>
          <PricingMaster key={pricingKey} rows={pricingRows} clientRows={clientRows} taskRows={taskRows} />
        </div>
        <div className={subTab === "staff" ? "flex flex-1" : "hidden"}>
          <StaffMaster clientRows={clientRows} taskRows={taskRows} />
        </div>
      </div>
    </div>
  );
}
