"use client";

import { Suspense, use, useState } from "react";
import LogoutButton from "./LogoutButton";
import Tab1Summary from "./Tab1Summary";
import Tab2Clients from "./Tab2Clients";
import Tab3Staff from "./Tab3Staff";
import Tab4, { type Tab4SubTabId } from "./Tab4";
import ClientMasterSection, { type ClientMasterSubTabId } from "./ClientMasterSection";

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
  // 우편요금(2026-08-22) — 마케팅 담당자가 의뢰서 단위로 직접 입력·관리(우체국 발송 비용).
  // 거래명세서 요청 시 자동으로 미리보기 원본에 반영된다. 상세: `.claude/plans/plan_우편요금관리.md`.
  우편요금: number;
};

// 탭4 "발행요청목록"·"발행완료" 전용 — GET /발행목록 응답 매핑. 미발행행에 거래명세서번호·발송여부만 추가된
// 구조라 미발행행과 필드가 대부분 겹치지만, useInvoiceFilters(rows: 미발행행[])에 그대로 넘기면
// base5 등 반환값 타입이 미발행행으로 좁혀져 거래명세서번호·발송여부에 접근할 수 없으므로
// lib/useIssuedFilters.ts를 별도로 둔다(SKILL-10 — 필드셋 다르면 제네릭화 대신 명시적 복제).
export type 발행행 = 미발행행 & {
  거래명세서번호: string;
  발송여부: 0 | 1;
  편집여부: 0 | 1;
  // 거래처 승인 대기 게이트(2026-08-12) — 꺼지면(0) 발행요청목록에서 "거래처 승인 대기 중"으로
  // 표시되고 경영지원부가 발행할 수 없다(POST /거래명세서발행이 409로 거부).
  발행가능: 0 | 1;
  // "편집됨" 배지 표시 전용(2026-08-13) — 편집여부(부분취소 게이트, 조건식만 적용돼도 항상 1이 될
  // 수 있어 보수적으로 원본 기준 유지)와 분리: 실제 거래명세서_수정이력이 1건이라도 있어야 true.
  수정이력있음: boolean;
  // 편집으로 합계가 얼마나 바뀌었는지(2026-08-14) — 배지 색상(증가=빨강/감소=파랑) 결정용,
  // 거래명세서번호 단위 값. 변동 없으면(또는 로그 없으면) 0.
  합계증감: number;
  // "청구공급가액" 열 전용(2026-08-14) — 실제 확정 저장된 공급가액(override 우선), 거래명세서번호
  // 단위 값이라 그룹 내 모든 라인이 항상 동일.
  확정공급가액: number;
  // 역발행(2026-08-24) — 고객사가 거래명세서를 우리 쪽으로 역으로 발행하는 거래처인지, 거래처마스터
  // 조회 값을 매번 붙여서 내려준다. 거래처 단위 값이라 그룹 내 모든 라인이 항상 동일.
  역발행: boolean;
};

// 탭5 "거래처 마스터" 전용 — GET /거래처마스터 응답 매핑. 거래처명이 PK라 생성 후 변경 불가
// (단가마스터·거래명세서·운영통계자료가 거래처명을 FK 없이 문자열로만 참조하기 때문 — [4-D] 참고).
export type 거래처행 = {
  거래처명: string;
  사업자등록번호: string;
  수신이메일: string;
  비고: string;
  // 역발행(2026-08-24) — 체크돼 있으면 이 거래처로 새 거래명세서를 만들 때 자동으로 "승인대기"
  // 상태(발행가능=0)로 시작한다.
  역발행: boolean;
  등록일: string;
  수정일: string;
};

// "거래처 마스터" 탭의 "단가관리" 하위 메뉴 전용 — GET /단가마스터 응답 매핑. 업무명·작업명은
// NULL이면 빈 문자열로 매핑(빈 문자열 = "기본단가", 표시는 PricingMasterTable.tsx가 렌더링
// 시점에 처리). 수정 시 업무명·작업명은 변경 불가(거래처명이 [4-D]에서 그랬던 것과 동일한 이유
// 없이도, 백엔드 PUT 바디 자체에 이 필드들이 없어 애초에 불가능 — id가 유일한 불변 식별자).
// 단가마스터_자재단가 한 행 — 같은 (거래처+업무명+작업명)의 코드(F/E/삽지비=M)라도 실제 사용된
// 자재에 따라 단가가 다른 업무를 지원(2026-08-15, 단가마스터 자재명 정규화). 매칭자재가 여러 개면
// 그 자재들이 전부 같은 단가를 공유(95903 사례처럼 "여러 자재코드가 한 가격")한다는 뜻.
export type 자재단가_매칭 = { 자재코드: number | null; 자재명: string | null };
export type 자재단가행 = {
  id: number;
  단가마스터_id: number;
  코드: "출력비" | "출력자재비" | "봉입비" | "봉입자재비" | "삽지비";
  단가: number;
  표시명: string | null;
  // 인쇄면(2026-08-22, "출력비" 코드 행 전용) — 이 자재(용지 종류)의 단면/양면. null이면 상위
  // 단가행.인쇄면 값으로 폴백(자재별로 따로 설정 안 한 기존 방식과 동일).
  인쇄면: "단면" | "양면" | null;
  비고: string | null;
  매칭자재: 자재단가_매칭[];
};

// 단가마스터_공정단가 한 행(2026-08-21, 공정별 단가 청구) — 당사 생산공정관리시스템이 5월분부터
// 내려주는 공정 세분화 컬럼(압착·주소출력·중철·제본·무광코팅·유광코팅·에폭시·날개접지) 단가.
// 봉입·수작업은 기존 봉입단가·각대대봉투봉입단가를 그대로 재사용해 이 목록의 대상이 아니다.
export type 공정단가행 = {
  id: number;
  단가마스터_id: number;
  공정코드: "압착" | "주소출력" | "중철" | "제본" | "무광코팅" | "유광코팅" | "에폭시" | "날개접지";
  단가: number;
  비고: string | null;
};

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
  용지제작무상: boolean; // 고객사가 자재를 직접 제공해 무상인 경우(2026-08-25) — 단가미등록 감지에서 제외
  봉투제작무상: boolean;
  삽지제작무상: boolean;
  각대대봉투단가: number;
  각대대봉투봉입단가: number;
  부가세구분: "포함" | "별도";
  // 인쇄면(2026-08-17) — 청구페이지 원본이 없어 출력비를 용지 자재사용량으로 대체 계산할 때 몇
  // 배로 환산할지 결정하는 값(단면=1배/양면=2배). 기본값 양면(실사용 데이터 절대다수 패턴).
  // 자재단가목록의 개별 인쇄면이 설정돼 있으면 그 자재는 이 값 대신 자재별 값을 우선 사용한다.
  인쇄면: "단면" | "양면";
  // 청구단위(2026-08-22) — 위 인쇄면 배율을 "페이지 수" 기준으로 적용할지, 인쇄면과 무관하게
  // 물리적 "장 수" 그대로 청구할지. 기본값 페이지기준(기존 유일한 동작과 동일).
  청구단위: "페이지기준" | "장수기준";
  비고: string;
  등록일: string;
  수정일: string;
  자재단가목록: 자재단가행[];
  공정단가목록: 공정단가행[];
};

// 2026-08-12(같은 날) GNB 개편 — 최상위 탭 5개를 대분류 3개(통계 분석/거래명세서 관리/거래처
// 마스터)로 묶고, 대분류 클릭 시 상단 2번째 줄에 하위탭이 나타나는 2단 구조로 변경. 거래명세서
// 관리·거래처 마스터는 원래도 화면 안쪽에 자체 하위탭 줄이 있었는데(Tab4.tsx·ClientMasterSection.tsx),
// 이번에 그 하위탭도 여기 상단 2번째 줄로 끌어올려 통계 분석과 동일한 모양으로 통일했다.
type StatsSubId = "summary" | "clients" | "staff";
type InvoiceSubId = Tab4SubTabId;
type MasterSubId = ClientMasterSubTabId;
type GroupId = "stats" | "invoice" | "clients-master";

const GROUPS: { id: GroupId; label: string; subTabs: { id: string; label: string }[] }[] = [
  {
    id: "stats",
    label: "통계 분석",
    subTabs: [
      { id: "summary", label: "작업 현황 요약" },
      { id: "clients", label: "거래처별 현황" },
      { id: "staff", label: "담당자별 현황" },
    ],
  },
  {
    id: "invoice",
    label: "거래명세서 관리",
    subTabs: [
      { id: "unissued", label: "미발행 목록" },
      { id: "pending", label: "발행요청목록" },
      { id: "issued", label: "발행완료" },
      { id: "history", label: "수정이력" },
    ],
  },
  {
    id: "clients-master",
    label: "거래처 마스터",
    subTabs: [
      { id: "clients", label: "거래처관리" },
      { id: "pricing", label: "단가관리" },
      { id: "staff", label: "담당자관리" },
    ],
  },
];

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
  subTab,
  setSubTab,
}: {
  summaryPromise: Promise<운영통계행[]>;
  invoicePromise: Promise<미발행행[]>;
  issuedPromise: Promise<발행행[]>;
  active: boolean;
  subTab: InvoiceSubId;
  setSubTab: (id: InvoiceSubId) => void;
}) {
  return (
    <Tab4
      rows={use(summaryPromise)}
      invoiceRows={use(invoicePromise)}
      issuedRows={use(issuedPromise)}
      active={active}
      subTab={subTab}
      setSubTab={setSubTab}
    />
  );
}
function ClientsMasterTab({
  clientRows,
  pricingPromise,
  summaryPromise,
  active,
  subTab,
}: {
  clientRows: 거래처행[];
  pricingPromise: Promise<단가행[]>;
  summaryPromise: Promise<운영통계행[]>;
  active: boolean;
  subTab: MasterSubId;
}) {
  return (
    <ClientMasterSection
      clientRows={clientRows}
      pricingRows={use(pricingPromise)}
      taskRows={use(summaryPromise)}
      active={active}
      subTab={subTab}
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
  const [group, setGroup] = useState<GroupId>("stats");
  // 그룹마다 마지막으로 보던 하위탭을 독립적으로 기억(그룹 전환 시 서로 영향 없음).
  const [statsSub, setStatsSub] = useState<StatsSubId>("summary");
  const [invoiceSub, setInvoiceSub] = useState<InvoiceSubId>("unissued");
  const [masterSub, setMasterSub] = useState<MasterSubId>("clients");

  const activeGroupDef = GROUPS.find((g) => g.id === group)!;
  const currentSubId = group === "stats" ? statsSub : group === "invoice" ? invoiceSub : masterSub;

  function handleSubTabClick(id: string) {
    if (group === "stats") setStatsSub(id as StatsSubId);
    else if (group === "invoice") setInvoiceSub(id as InvoiceSubId);
    else setMasterSub(id as MasterSubId);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3 dark:border-gray-800">
        <nav className="flex gap-1">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroup(g.id)}
              className={
                "rounded-md px-3 py-1.5 text-sm font-medium " +
                (group === g.id
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800")
              }
            >
              {g.label}
            </button>
          ))}
        </nav>
        <LogoutButton />
      </header>

      <nav className="flex gap-1 border-b border-gray-200 px-4 py-2 dark:border-gray-800">
        {activeGroupDef.subTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleSubTabClick(t.id)}
            className={
              "rounded-md px-3 py-1 text-sm font-medium " +
              (currentSubId === t.id
                ? "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800")
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex flex-1">
        <div className={group === "stats" && statsSub === "summary" ? "flex flex-1" : "hidden"}>
          <Suspense fallback={<TabLoading />}>
            <SummaryTab promise={summaryPromise} />
          </Suspense>
        </div>
        <div className={group === "stats" && statsSub === "clients" ? "flex flex-1" : "hidden"}>
          <Suspense fallback={<TabLoading />}>
            <ClientsTab promise={summaryPromise} />
          </Suspense>
        </div>
        <div className={group === "stats" && statsSub === "staff" ? "flex flex-1" : "hidden"}>
          <Suspense fallback={<TabLoading />}>
            <StaffTab promise={summaryPromise} />
          </Suspense>
        </div>
        <div className={group === "invoice" ? "flex flex-1" : "hidden"}>
          <Suspense fallback={<TabLoading />}>
            <InvoiceTab
              summaryPromise={summaryPromise}
              invoicePromise={invoicePromise}
              issuedPromise={issuedPromise}
              active={group === "invoice"}
              subTab={invoiceSub}
              setSubTab={setInvoiceSub}
            />
          </Suspense>
        </div>
        <div className={group === "clients-master" ? "flex flex-1" : "hidden"}>
          <Suspense fallback={<TabLoading />}>
            <ClientsMasterTab
              clientRows={clientRows}
              pricingPromise={pricingPromise}
              summaryPromise={summaryPromise}
              active={group === "clients-master"}
              subTab={masterSub}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
