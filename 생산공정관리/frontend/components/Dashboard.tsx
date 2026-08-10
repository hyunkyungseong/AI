"use client";

import { Suspense, use, useState } from "react";
import LogoutButton from "./LogoutButton";
import Tab1Summary from "./Tab1Summary";
import Tab2Clients from "./Tab2Clients";
import Tab3Staff from "./Tab3Staff";
import Tab4 from "./Tab4";
import ClientMasterSection from "./ClientMasterSection";

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
  // 탭4 "미발행 목록" 선택 시 세부내역 표시용 (2026-07-19 추가) — 그 외 탭1~3은 사용하지 않음
  업무의뢰서번호: string;
  업무명상세: string;
  작업내역서상세: string;
  P수: string;
  // "단가관리" 화면의 업무명→작업명 후보 드롭다운 추출용 (2026-07-19 추가) — 백엔드 /summary는
  // 이미 이 컬럼을 반환 중이었고(data_transform.py MARIADB_컬럼), 프론트 타입에만 없었음.
  // 업무명상세와는 다른 별개 컬럼이니 혼동 주의(SKILL.md 단가마스터 조회 키 관련 주의사항 참고).
  작업명: string;
};

// 탭4 "미발행 목록" 전용 — GET /미발행목록(의뢰서 단위 집계+예상공급가액 계산 완료본) 응답 매핑
export type 미발행행 = {
  의뢰서번호: string;
  담당자: string;
  사업부: string;
  거래처명: string;
  업무명: string;
  업무명상세: string;
  작업일자: string;
  청구페이지: number;
  장수: number;
  봉입건수: number;
  용지수량: number;
  봉투수량: number;
  삽지수량: number;
  예상공급가액: number | null;
};

// 탭4 "발행요청목록"·"발행완료" 전용 — GET /발행목록 응답 매핑. 미발행행에 거래명세서번호·발송여부만 추가된
// 구조라 미발행행과 필드가 대부분 겹치지만, useInvoiceFilters(rows: 미발행행[])에 그대로 넘기면
// base5 등 반환값 타입이 미발행행으로 좁혀져 거래명세서번호·발송여부에 접근할 수 없으므로
// lib/useIssuedFilters.ts를 별도로 둔다(SKILL-10 — 필드셋 다르면 제네릭화 대신 명시적 복제).
export type 발행행 = 미발행행 & { 거래명세서번호: string; 발송여부: 0 | 1; 편집여부: 0 | 1 };

// 탭5 "거래처 마스터" 전용 — GET /거래처마스터 응답 매핑. 거래처명이 PK라 생성 후 변경 불가
// (단가마스터·거래명세서·운영통계자료가 거래처명을 FK 없이 문자열로만 참조하기 때문 — [4-D] 참고).
export type 거래처행 = {
  거래처명: string;
  사업자등록번호: string;
  수신이메일: string;
  비고: string;
  등록일: string;
  수정일: string;
};

// "거래처 마스터" 탭의 "단가관리" 하위 메뉴 전용 — GET /단가마스터 응답 매핑. 업무명·작업명은
// NULL이면 빈 문자열로 매핑(빈 문자열 = "기본단가", 표시는 PricingMasterTable.tsx가 렌더링
// 시점에 처리). 수정 시 업무명·작업명은 변경 불가(거래처명이 [4-D]에서 그랬던 것과 동일한 이유
// 없이도, 백엔드 PUT 바디 자체에 이 필드들이 없어 애초에 불가능 — id가 유일한 불변 식별자).
export type 단가행 = {
  id: number;
  거래처명: string;
  업무명: string;
  작업명: string;
  출력단가: number;
  봉입단가: number;
  추가봉입단가: number;
  동봉물삽입단가: number;
  용지제작단가: number;
  봉투제작단가: number;
  삽지제작단가: number;
  각대대봉투단가: number;
  각대대봉투봉입단가: number;
  부가세구분: "포함" | "별도";
  비고: string;
  등록일: string;
  수정일: string;
};

const TABS = [
  { id: "summary", label: "작업 현황 요약" },
  { id: "clients", label: "거래처별 현황" },
  { id: "staff", label: "담당자별 현황" },
  { id: "invoice", label: "거래명세서 관리" },
  { id: "clients-master", label: "거래처 마스터" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// 로딩 중 표시 — 각 탭의 <Suspense> fallback으로 공용 사용.
function TabLoading() {
  return <div className="flex flex-1 items-center justify-center p-8 text-sm text-gray-400">불러오는 중...</div>;
}

// use()로 Promise를 풀어 기존 Tab 컴포넌트에 그대로 넘기는 얇은 wrapper들.
// Tab1Summary~ClientMasterSection과 그 하위 컴포넌트는 건드리지 않고, 여기서만 스트리밍을 다룬다.
function SummaryTab({ promise }: { promise: Promise<운영통계행[]> }) {
  return <Tab1Summary rows={use(promise)} />;
}
function ClientsTab({ promise }: { promise: Promise<운영통계행[]> }) {
  return <Tab2Clients rows={use(promise)} />;
}
function StaffTab({ promise }: { promise: Promise<운영통계행[]> }) {
  return <Tab3Staff rows={use(promise)} />;
}
function InvoiceTab({
  summaryPromise,
  invoicePromise,
  issuedPromise,
  active,
}: {
  summaryPromise: Promise<운영통계행[]>;
  invoicePromise: Promise<미발행행[]>;
  issuedPromise: Promise<발행행[]>;
  active: boolean;
}) {
  return <Tab4 rows={use(summaryPromise)} invoiceRows={use(invoicePromise)} issuedRows={use(issuedPromise)} active={active} />;
}
function ClientsMasterTab({
  clientRows,
  pricingPromise,
  summaryPromise,
  active,
}: {
  clientRows: 거래처행[];
  pricingPromise: Promise<단가행[]>;
  summaryPromise: Promise<운영통계행[]>;
  active: boolean;
}) {
  return (
    <ClientMasterSection
      clientRows={clientRows}
      pricingRows={use(pricingPromise)}
      taskRows={use(summaryPromise)}
      active={active}
    />
  );
}

// 탭마다 컴포넌트를 항상 다 마운트해두고 CSS(hidden)로만 숨김 처리.
// 언마운트하면 각 탭이 들고 있는 useFilters() 상태(필터 선택값)가 날아가버리기 때문.
// 데이터는 대부분 Promise로 받아 <Suspense>+use()로 스트리밍 — 로그인 직후 첫 화면이
// 5개 API를 전부 기다리지 않고, 지금 보는 탭 데이터가 준비되는 대로 뜨게 하기 위함.
export default function Dashboard({
  clientRows,
  summaryPromise,
  invoicePromise,
  issuedPromise,
  pricingPromise,
}: {
  clientRows: 거래처행[];
  summaryPromise: Promise<운영통계행[]>;
  invoicePromise: Promise<미발행행[]>;
  issuedPromise: Promise<발행행[]>;
  pricingPromise: Promise<단가행[]>;
}) {
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
          <Suspense fallback={<TabLoading />}>
            <SummaryTab promise={summaryPromise} />
          </Suspense>
        </div>
        <div className={tab === "clients" ? "flex flex-1" : "hidden"}>
          <Suspense fallback={<TabLoading />}>
            <ClientsTab promise={summaryPromise} />
          </Suspense>
        </div>
        <div className={tab === "staff" ? "flex flex-1" : "hidden"}>
          <Suspense fallback={<TabLoading />}>
            <StaffTab promise={summaryPromise} />
          </Suspense>
        </div>
        <div className={tab === "invoice" ? "flex flex-1" : "hidden"}>
          <Suspense fallback={<TabLoading />}>
            <InvoiceTab
              summaryPromise={summaryPromise}
              invoicePromise={invoicePromise}
              issuedPromise={issuedPromise}
              active={tab === "invoice"}
            />
          </Suspense>
        </div>
        <div className={tab === "clients-master" ? "flex flex-1" : "hidden"}>
          <Suspense fallback={<TabLoading />}>
            <ClientsMasterTab
              clientRows={clientRows}
              pricingPromise={pricingPromise}
              summaryPromise={summaryPromise}
              active={tab === "clients-master"}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
