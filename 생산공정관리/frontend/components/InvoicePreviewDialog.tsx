"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import ConditionRuleModal from "./ConditionRuleModal";
import type { 규칙조건 } from "./ConditionRuleModal";
import ConfirmDialog from "./ConfirmDialog";
import { 적용_규칙, 평가_조건 } from "@/lib/billingRules";
import type { 원본품목 } from "@/lib/billingRules";

export type 미리보기품목 = 원본품목;

export type 규칙적용행_API = {
  최종청구품명: string;
  코드: string | null;
  수량: number;
  단가: number | null;
  금액: number;
  조?: string;
  // 거래명세서 Excel 구분(B열)·규격(H열)·비고(N열) 직접 입력(2026-08-11)
  구분표시?: string;
  규격?: string;
  비고?: string;
};

export type 저장된규칙 = {
  순서: number;
  최종청구품명: string;
  조건: 규칙조건;
  조?: string;
  구분표시?: string;
  규격?: string;
  비고?: string;
};

// 통합조건식 불일치 정보(2026-08-08 다중업무명 규칙조회 재설계) — 선택된 업무명 집합이 기존
// 통합조건식과 정확히 일치하지 않을 때(부족: 등록된 업무명 중 일부가 지금 선택에서 빠짐, 초과:
// 지금 선택이 등록된 업무명보다 많음) 서버가 내려준다. 이게 있으면 확정 버튼이 막히고, 사용자가
// 아래 배너에서 선택을 해야 한다.
export type 통합조건식_불일치 = { 상황: "부족" | "초과"; 기존업무명조합: string; 차이_업무명: string[] };

// 출력비·봉입비가 장수·봉입건수 대신 자재사용량 기준으로 청구되므로(2026-08-17), 원본(장수/봉입건수)과
// 실제 자재사용량이 다른 작업을 안내하는 용도(billing.자재수량_불일치_목록()) — 계산에는 영향 없음,
// 화면 안내 전용.
export type 수량불일치행 = {
  작업명: string;
  거래처명: string;
  업무명: string;
  장수: number;
  용지사용량: number;
  봉입건수: number;
  봉투사용량: number;
  사유: string;
};

// 단가미등록(2026-08-22, billing.build_품목행()의 미등록수집) — 실제 생산 실적(수량)은 있는데
// 단가(기본단가·자재단가 전부)가 하나도 등록 안 돼 있어 왼쪽 원본 표에 줄 자체가 생기지 않는 품목.
// 미분류(원본에는 있지만 오른쪽으로 안 옮겨진 경우)와 달리 원본 표에도 안 보여서 사용자가 알아챌
// 방법이 없어, 별도로 감지해 확정을 막는다.
export type 단가미등록행 = {
  품목: string;
  작업: string;
  수량: number;
};

export type 미리보기결과 = {
  거래처명: string;
  업무명_목록: string[];
  // "통합"(통합조건식 정확 일치, 최우선 적용됨) | "불일치"(부족/초과, 아래에서 선택 필요) |
  // "개별"(관련 통합조건식 없음, 선택된 각 업무명의 개별조건식을 병합해 적용).
  규칙출처: "통합" | "불일치" | "개별";
  업무명조합_사용중: string | null;
  통합조건식_불일치: 통합조건식_불일치 | null;
  품목: 미리보기품목[];
  규칙적용결과: 규칙적용행_API[];
  미분류: 미리보기품목[];
  총합계: number;
  // 실제로 청구된 작업명들 기준으로 판정한 부가세 취급 — "포함"이면 세액을 더하지 않음(2026-07-28).
  // 작업명끼리 포함/별도가 섞여 있으면 null이 되고 부가세오류에 안내 문구가 담긴다(2026-08-04).
  부가세구분: "포함" | "별도" | null;
  부가세오류?: string | null;
  // 조별표지(2026-08-30) — 이 거래처가 통합 명세서 대신 "요청내용" 표지에 조별로 나눠 보여주는
  // 대상이면 true. 서버가 통합시트명을 자동으로 무시하므로, 화면도 그 입력칸을 감춰 혼란을 줄인다.
  조별표지?: boolean;
  수량불일치?: 수량불일치행[];
  단가미등록?: 단가미등록행[];
  규칙목록?: 저장된규칙[]; // POST /거래명세서미리보기 응답에 이미 포함되어 내려옴(2026-08-01,
  // 별도 왕복 없이 한 번의 응답으로 끝내도록 단순화)
};

export type 확정품목 = {
  코드: string | null;
  품목: string;
  수량: number;
  단가: number | null;
  금액: number;
  조?: string;
  구분표시?: string;
  규격?: string;
  비고?: string;
  // 조건식(규칙) 없이 "새 행 추가"로 직접 타이핑한 행이면 true(2026-08-12) — 서버가 이 값이 true인
  // 품명만 거래명세서품명이력에 저장한다(규칙 품명은 이미 청구품목규칙으로 따로 재사용되므로 중복 방지).
  수동입력?: boolean;
};
export type 확정규칙 = {
  순서: number;
  최종청구품명: string;
  조건: 규칙조건;
  조?: string;
  구분표시?: string;
  규격?: string;
  비고?: string;
};
// 부족/초과 배너에서 사용자가 "제외/추가하고 확정"을 선택했을 때만 채워짐 — 신규업무명조합은
// 서버가 요청.업무명_목록으로부터 재계산하므로 여기선 기존업무명조합만 넘긴다(2026-08-08).
export type 통합조건식_해결 = { 기존업무명조합: string };

type 편집행 = {
  key: string;
  최종청구품명: string;
  코드: string | null;
  수량: number;
  단가: number | null;
  금액: number;
  조건: 규칙조건 | null; // null이면 수동으로 추가/복사한 행(규칙 아님)
  조?: string; // 조별 분할발급(2026-07-29) — 없으면 거래명세서 1건(하위호환)
  // 거래명세서 Excel 구분(B열)·규격(H열)·비고(N열) 직접 입력(2026-08-11) — 없으면 미지정
  구분표시?: string;
  규격?: string;
  비고?: string;
};

type Props = {
  open: boolean;
  data: 미리보기결과 | null;
  submitting: boolean;
  onConfirm: (edited: {
    품목_최종: 확정품목[];
    규칙: 확정규칙[];
    통합조건식_해결?: 통합조건식_해결 | null;
    통합시트명?: string;
    상단업무명?: string;
    조상단업무명맵?: Record<string, string>;
    // 공급가액·부가세 직접 입력(override, 2026-08-13, 마케팅팀 요청 — 원단위 절사·반올림 차이 보정).
    공급가액_직접입력?: number;
    세액_직접입력?: number;
  }) => void;
  onClose: () => void;
};

// 좌우 표 컬럼 간 여백(2026-08-12 사용자 요청 — 필드가 다닥다닥 붙어 읽기 불편함) — px-3에서 넓힘.
const th = "px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300";
const thRight = "px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300";
const td = "px-4 py-1.5 text-gray-900 dark:text-gray-100";
const tdRight = "px-4 py-1.5 text-right tabular-nums text-gray-900 dark:text-gray-100";
// 수량·금액 칸 — 천단위 콤마 표시(2026-08-09) 적용 시 값이 더 길어져서(예: "3,585,816") 기존
// w-24보다 조금 더 넓힘.
const numInput =
  "w-28 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-right text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";
// 단가 칸 전용(2026-08-09) — 최대 "십진수 4자리+소수 2자리"(예: 1234.56) 정도만 들어가면 되어
// numInput보다 좁게 별도 상수로 분리.
const numInputNarrow =
  "w-16 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-right text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

// 수량·금액 입력칸에 천단위 콤마를 보여주기 위한 표시/파싱 헬퍼(2026-08-09) — <input type="number">는
// 콤마 문자열을 값으로 받아들이지 못해 type="text"로 바꾸고 이 두 함수로 왕복 변환한다.
function 콤마표시(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString() : "";
}
function 콤마숫자파싱(s: string): number {
  const n = Number(s.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

let 신규행_카운터 = 0;

function 원본행_recompute(rows: 편집행[], 원본목록: 원본품목[]): 편집행[] {
  const 규칙행 = rows.filter((r) => r.조건 !== null);
  if (규칙행.length === 0) return rows;
  const { 결과 } = 적용_규칙(
    원본목록,
    규칙행.map((r) => ({ 최종청구품명: r.최종청구품명, 조건: r.조건 as 규칙조건 }))
  );
  let ri = 0;
  return rows.map((r) => {
    if (r.조건 === null) return r;
    const res = 결과[ri++];
    return { ...r, 최종청구품명: res.최종청구품명, 코드: res.코드 || null, 수량: res.수량, 단가: res.단가, 금액: res.금액 };
  });
}

// 미발행 목록 "거래명세서 요청" 클릭 시 즉시 저장하지 않고 먼저 품목·합계를 보여주는 미리보기
// 팝업(2026-07-20 최초 작성). 좌/우 2단 편집 화면으로 전면 개편(2026-07-22, [거래명세서편집_규칙엔진]) —
// 왼쪽은 시스템 자동계산 원본(읽기 전용), 오른쪽은 저장된 청구품목규칙을 적용해 만든 고객사
// 청구 명세서 초안으로, 셀 클릭 시 조건식 편집 모달이 뜨고 수량·단가·금액 직접 수정·새 행 추가도
// 가능하다. "확정"을 눌러야 Tab4Invoice.tsx가 실제 POST /api/invoice-request를 보낸다.
// data가 바뀔 때마다 rightRows를 되돌려야 하는데, "부모가 매번 새 key를 줘서 이 컴포넌트를
// 통째로 재마운트한다"는 전제로 useState 초기값에서 한 번만 계산한다(Tab4Invoice가
// key={previewSeq}로 미리보기를 새로 열 때마다 강제 재마운트) — set-state-in-effect 린트
// 문제를 피하기 위한 구조, ConditionRuleModal과 동일한 패턴(2026-07-22).
function 초기_rightRows(data: 미리보기결과 | null): 편집행[] {
  if (!data) return [];
  const 규칙목록 = data.규칙목록 ?? [];
  if (규칙목록.length === 0 || data.규칙적용결과.length === 0) return [];
  return data.규칙적용결과.map((r, i) => ({
    key: `rule-init-${i}`,
    최종청구품명: r.최종청구품명,
    코드: r.코드,
    수량: r.수량,
    단가: r.단가,
    금액: r.금액,
    조건: 규칙목록[i]?.조건 ?? null,
    조: 규칙목록[i]?.조,
    구분표시: 규칙목록[i]?.구분표시,
    규격: 규칙목록[i]?.규격,
    비고: 규칙목록[i]?.비고,
  }));
}

export default function InvoicePreviewDialog({ open, data, submitting, onConfirm, onClose }: Props) {
  const [rightRows, setRightRows] = useState<편집행[]>(() => 초기_rightRows(data));
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState<number | null>(null); // null = 새 규칙 행 추가
  // 통합조건식 부족/초과 배너에서 사용자가 "제외/추가하고 확정"을 선택하면 채워짐(2026-08-08) —
  // 채워지기 전엔 확정 버튼이 막힌다. data가 바뀌면(새 미리보기) key로 컴포넌트가 재마운트되므로
  // 별도 리셋 로직 없이 항상 null로 시작한다(ConditionRuleModal과 동일한 재마운트 전제).
  const [resolution, setResolution] = useState<통합조건식_해결 | null>(null);
  // 조건식 저장 시 다른 규칙과 겹치는 항목이 있으면 저장 전에 확인받기 위한 대기 상태(2026-08-08
  // 사용자 요청) — 겹치는 항목이 없으면 이 상태를 거치지 않고 바로 저장된다. 규칙별로 몇 건씩
  // 겹치는지도 함께 보여줘야 사용자가 어느 규칙과 부딪히는지 바로 알 수 있다(2026-08-08 추가 요청).
  const [overlapConfirm, setOverlapConfirm] = useState<{
    result: { 최종청구품명: string; 조건: 규칙조건; 조?: string; 구분표시?: string; 규격?: string; 비고?: string };
    규칙별건수: [string, number][];
  } | null>(null);
  // 미분류(조건식 미매칭) 원본 항목이 있는 채로 확정하면 그 금액이 통째로 청구서에서 누락된다
  // (2026-08-17 실사례 96,960원 누락). 확정 클릭 시 바로 제출하지 않고 이 state로 안내창을 띄워
  // "그래도 확정" / "미리보기로 돌아가기"를 받는다 — overlapConfirm과 동일한 대기 패턴.
  const [미분류확인대기, set미분류확인대기] = useState(false);
  // 단가미등록(2026-08-22) — 미분류와 같은 이유("실제 청구 금액이 사용자 모르게 빠짐")로 확정을
  // 막는다. 원본 표에도 줄이 안 생기는 경우라 미분류처럼 원본에서 체크 표시로 보여줄 수 없어,
  // 이 경고창이 사용자가 이 문제를 알 수 있는 유일한 경로다.
  const [단가미등록확인대기, set단가미등록확인대기] = useState(false);
  // 복사 직후 자동으로 연 편집창의 대상 행 인덱스(2026-08-08) — 이 상태에서 편집을 취소하면
  // "복사 자체가 없었던 일"이 되도록 방금 끼워넣은 복사본을 되돌린다. 저장하면(겹침 확인을
  // 거치더라도) null로 되돌아가 더 이상 취소 대상이 아니게 된다.
  const [복사대기중, set복사대기중] = useState<number | null>(null);
  // 이 거래처가 가장 최근에 확정했을 때 "새 행 추가"(조건식 없는 수동 입력 행)로 넣었던 품명 목록
  // (2026-08-12, 서버가 이미 "가장 최근 확정분" 기준으로 걸러서 내려줌 — 취소된 확정도 포함).
  // 선택 UI 없이, 이 값이 도착하면 곧바로
  // 오른쪽 표에 행으로 자동 추가한다(사용자 확정 — 체크박스로 고르던 이전 방식을 대체).
  // data가 바뀌면(새 미리보기) 부모가 key로 이 컴포넌트를 통째로 재마운트하므로,
  // InvoiceHistoryDialog.tsx와 동일하게 "처음 한 번"만 도는 effect로 충분 — setState·행 추가는
  // fetch 콜백 안에서만 호출해 set-state-in-effect 린트를 피한다.
  const [품명이력후보, set품명이력후보] = useState<string[]>([]);
  // 작업구분(조)이 2개 이상일 때 맨 앞에 붙는 "통합 명세서" 시트의 시트명·상단 업무명(B12) —
  // 사용자가 자유롭게 고쳐 쓸 수 있는 입력값(2026-08-12). 아래 effect가 이 거래처+업무명조합의
  // 마지막 저장값을 불러와 기본 제안하고, 없으면 "통합명세서"/업무명_목록 조인 문구를 기본으로 둔다.
  const [통합시트명, set통합시트명] = useState("");
  const [상단업무명, set상단업무명] = useState("");
  // 개별 조 시트 B12에 표시할 조별 상단 업무명(2026-08-30) — {조: 값} 형태, 조별표지 여부와
  // 무관하게 조가 2개 이상이면 항상 그룹 헤더에 입력칸으로 노출된다(통합상단업무명과는 별개).
  const [조상단업무명맵, set조상단업무명맵] = useState<Record<string, string>>({});
  // 공급가액·부가세 직접 입력(override, 2026-08-13) — 손대기 전엔 입력칸이 지금 자동계산값을
  // 그대로 보여주며(값을 다시 처음부터 입력하지 않고 그 자리에서 바로 고칠 수 있도록, 2026-08-13
  // 사용자 피드백) 품목 수정에 따라 계속 갱신되고, 한 번이라도 고치면(수동=true) 그 값에 고정된다
  // — "자동값 사용" 버튼으로 다시 자동추적 상태로 되돌릴 수 있다. 수량·단가·금액 입력칸과 동일하게
  // type="text"+콤마표시/콤마숫자파싱 왕복 변환을 쓴다(2026-08-09 SKILL 패턴) — type="number"는
  // 빈 값 상태에서 위/아래 화살표를 누르면 -1로 튀는 문제가 있어 피한다.
  const [공급가액조정_수동, set공급가액조정_수동] = useState(false);
  const [공급가액조정값, set공급가액조정값] = useState(0);
  const [세액조정_수동, set세액조정_수동] = useState(false);
  const [세액조정값, set세액조정값] = useState(0);

  // 지난달 이 거래처의 "새 행 추가" 확정 품명을 미리보기 오픈 시 자동으로 행으로 반영(2026-08-12
  // 사용자 확정 — 체크박스로 고르던 방식을 대체). addManualRow()와 동일한 형태(수량·단가 0, 조건
  // 없음)로 추가 — 수량·단가·금액은 매번 다를 수 있어 함께 저장/재사용하지 않고 그때그때 채우도록
  // 둔다(사용자 확인). 원치 않는 행은 표의 "삭제" 버튼으로 지우면 된다. 아래 effect보다 먼저
  // 선언해야 한다 — 린트(react-hooks)가 "사용 전 선언" 순서를 요구함.
  function addRowsFromHistory(품명목록: { 품명: string; 조?: string | null }[]) {
    setRightRows((prev) => [
      ...prev,
      ...품명목록.map(({ 품명, 조 }) => ({
        key: `history-${신규행_카운터++}`,
        최종청구품명: 품명,
        코드: null,
        수량: 0,
        단가: 0,
        금액: 0,
        조건: null,
        조: 조 ?? undefined,
      })),
    ]);
  }

  useEffect(() => {
    const 거래처명 = data?.거래처명;
    if (!거래처명) return;
    let 취소됨 = false;
    fetch(`/api/invoice-item-names?거래처명=${encodeURIComponent(거래처명)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((json: { 품명: string; 조?: string | null }[]) => {
        if (취소됨 || !Array.isArray(json) || json.length === 0) return;
        set품명이력후보(json.map((r) => r.품명));
        addRowsFromHistory(json);
      })
      .catch(() => {});
    return () => {
      취소됨 = true;
    };
  }, [data?.거래처명]);

  useEffect(() => {
    const 거래처명 = data?.거래처명;
    if (!거래처명) return;
    let 취소됨 = false;
    const qs = new URLSearchParams({ 거래처명 });
    (data?.업무명_목록 ?? []).forEach((u) => qs.append("업무명_목록", u));
    fetch(`/api/integrated-sheet-defaults?${qs.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (취소됨) return;
        set통합시트명(json?.통합시트명 || "통합명세서");
        set상단업무명(json?.상단업무명 || (data?.업무명_목록 ?? []).join(", "));
      })
      .catch(() => {});
    return () => {
      취소됨 = true;
    };
  }, [data?.거래처명, data?.업무명_목록]);

  // 개별 조 시트 B12에 표시할 조별 상단 업무명(2026-08-30) — 위 통합시트기본값과 동일한 방식으로
  // 이 거래처+업무명조합의 조마다 마지막 저장값을 한 번에 조회해 프리필한다. 조가 없거나 저장된
  // 값이 없는 조는 빈 문자열(입력 안 하면 기존처럼 자동 업무명 사용).
  useEffect(() => {
    const 거래처명 = data?.거래처명;
    if (!거래처명) return;
    let 취소됨 = false;
    const qs = new URLSearchParams({ 거래처명 });
    (data?.업무명_목록 ?? []).forEach((u) => qs.append("업무명_목록", u));
    fetch(`/api/group-title-defaults?${qs.toString()}`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((json: Record<string, string>) => {
        if (취소됨) return;
        set조상단업무명맵(json && typeof json === "object" ? json : {});
      })
      .catch(() => {});
    return () => {
      취소됨 = true;
    };
  }, [data?.거래처명, data?.업무명_목록]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting && !modalOpen) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, submitting, modalOpen, onClose]);

  // 왼쪽 원본 표에서 "이미 오른쪽 표(어느 규칙)에 반영된 항목"을 체크 표시로 구분하기 위한 정보 —
  // 미분류(안 걸린 항목)의 여집합을 참조 동등성(원본 배열 항목 그대로 필터링돼 참조가 같음)으로
  // 구한다(2026-07-24 사용자 요청: "선택된 항목은 체크가 되어 식별이 쉬웠으면 좋겠어"). 미분류
  // 목록 자체는 왼쪽 체크 표시와 정보가 겹쳐 화면에서 제거했지만(2026-07-29 사용자 요청 — 항목이
  // 많을 때 목록이 길어져 오른쪽 표 영역을 밀어내는 레이아웃 문제도 함께 있었음), 체크 계산에는
  // 여전히 필요해 미분류Set만 남기고 계산 로직은 그대로 둔다.
  const 매칭Set = useMemo(() => {
    if (!data) return new Set<원본품목>();
    const 규칙행 = rightRows.filter((r) => r.조건 !== null);
    if (규칙행.length === 0) return new Set<원본품목>();
    const { 미분류 } = 적용_규칙(
      data.품목,
      규칙행.map((r) => ({ 최종청구품명: r.최종청구품명, 조건: r.조건 as 규칙조건 }))
    );
    const 미분류Set = new Set(미분류);
    return new Set(data.품목.filter((r) => !미분류Set.has(r)));
  }, [data, rightRows]);

  const 미분류행 = useMemo(() => {
    if (!data) return [];
    return data.품목.filter((r) => !매칭Set.has(r));
  }, [data, 매칭Set]);

  const 미분류합계 = useMemo(() => 미분류행.reduce((s, r) => s + r.금액, 0), [미분류행]);

  // 확정 시 안내창에 "무엇이 얼마나 빠지는지" 보여주기 위한 그룹핑 — 왼쪽 표 헤더 표기
  // (품목(작업명) 자재명)와 동일한 라벨로 묶어 사용자가 왼쪽 표에서 바로 대조할 수 있게 한다.
  const 미분류그룹 = useMemo(() => {
    const map = new Map<string, { 건수: number; 금액: number }>();
    for (const r of 미분류행) {
      const key = `${r.품목}${r.작업명 ? `(${r.작업명})` : ""}${r.자재명 ? ` ${r.자재명}` : ""}`;
      const cur = map.get(key) ?? { 건수: 0, 금액: 0 };
      cur.건수 += 1;
      cur.금액 += r.금액;
      map.set(key, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].금액 - a[1].금액);
  }, [미분류행]);

  // 단가미등록(2026-08-22) — 서버가 이미 (품목,작업,수량) 단위로 내려주므로 여기서는 표시용으로만
  // 품목+작업 기준으로 합친다. 단가 자체가 없어서 생긴 문제라 미분류그룹과 달리 "금액"은 계산할 수
  // 없다(단가가 있었다면 애초에 원본 표에 줄이 생겼을 것) — 수량만 보여준다.
  const 단가미등록행 = useMemo(() => data?.단가미등록 ?? [], [data]);
  const 단가미등록그룹 = useMemo(() => {
    const map = new Map<string, { 건수: number; 수량: number }>();
    for (const r of 단가미등록행) {
      const key = `${r.품목}(${r.작업})`;
      const cur = map.get(key) ?? { 건수: 0, 수량: 0 };
      cur.건수 += 1;
      cur.수량 += r.수량;
      map.set(key, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].수량 - a[1].수량);
  }, [단가미등록행]);

  const 오른쪽합계 = useMemo(() => rightRows.reduce((s, r) => s + (Number.isFinite(r.금액) ? r.금액 : 0), 0), [rightRows]);

  // 거래처가 "포함"(단가에 부가세가 이미 포함된 계약)이면 부가세를 추가로 더하지 않는다 —
  // 실제 다운로드되는 Excel(billing.write_거래명세서_excel)과 같은 기준으로 미리보기 화면도
  // 공급가액/부가세/합계를 보여줘서 화면과 파일의 숫자가 어긋나지 않게 한다(2026-07-28).
  // 부가세구분이 null이면(작업명별 부가세 처리 방식이 섞여 판정 불가, 2026-08-04) 세액을 0으로
  // 표시만 하고, 아래 부가세오류 배너 + "확정" 버튼 비활성화로 실제 발급 자체를 막는다.
  const 세액_왼쪽 = data?.부가세구분 === "별도" ? Math.round((data?.총합계 ?? 0) * 0.1) : 0;
  const 세액_오른쪽 = data?.부가세구분 === "별도" ? Math.round(오른쪽합계 * 0.1) : 0;
  // "공급가액"·"부가세" 두 행에 실제로 표시할 값(2026-08-12 사용자 요청, billing.부가세_표시분리()와
  // 동일한 규칙) — "합계" 행(아래, 위 세액_왼쪽/세액_오른쪽 기준)은 그대로 원래 총액이지만, 이 두 값은
  // "포함"이어도 단가에 이미 녹아있는 부가세를 역산해 공급가액·부가세로 나눠 보여준다(총액÷11).
  // 예전엔 "포함"이면 부가세 칸을 0으로, 공급가액 칸엔 총액을 그대로 찍어 얼마가 포함돼 있는지
  // 안 보였음. "별도"는 원래부터 공급가액=총액(순수 공급가) 그대로였으므로 값이 안 바뀐다.
  const 표시_세액_왼쪽 =
    data?.부가세구분 === "포함" ? Math.round((data?.총합계 ?? 0) / 11) : 세액_왼쪽;
  const 표시_공급가액_왼쪽 =
    (data?.총합계 ?? 0) - (data?.부가세구분 === "포함" ? 표시_세액_왼쪽 : 0);
  const 표시_세액_오른쪽 =
    data?.부가세구분 === "포함" ? Math.round(오른쪽합계 / 11) : 세액_오른쪽;
  const 표시_공급가액_오른쪽 =
    오른쪽합계 - (data?.부가세구분 === "포함" ? 표시_세액_오른쪽 : 0);

  // 조건 편집 패널의 값 입력칸에서 오타 없이 원본 값을 골라 쓸 수 있도록, 지금 원본(왼쪽) 표에
  // 실제로 등장하는 코드·품목·작업명 목록을 추출(2026-07-22, 사용자 피드백: "직접 키인은 오타 위험").
  const 코드옵션 = useMemo(() => Array.from(new Set(data?.품목.map((r) => r.코드) ?? [])).sort(), [data]);
  // 지금 미리보기의 원본 품목명 + 이 거래처로 과거에 실제 청구했던 최종 품명(품명이력후보)을
  // 합쳐서 하나의 후보 풀로 — 조건식 편집창의 "최종 청구 품명" 자동완성도 같은 풀을 공유한다
  // (2026-08-12).
  const 품목옵션 = useMemo(
    () => Array.from(new Set([...(data?.품목.map((r) => r.품목) ?? []), ...품명이력후보])).sort(),
    [data, 품명이력후보]
  );
  const 작업명옵션 = useMemo(
    () => Array.from(new Set((data?.품목.map((r) => r.작업명).filter(Boolean) as string[]) ?? [])).sort(),
    [data]
  );
  // 단가는 숫자 입력(type="number")과 짝이라 toLocaleString()의 천단위 콤마를 넣으면 입력값
  // 파싱이 깨짐 — 그냥 문자열로만 변환(2026-07-28, 조건식 "단가" 필드 추가).
  const 단가옵션 = useMemo(
    () => Array.from(new Set(data?.품목.map((r) => r.단가) ?? [])).sort((a, b) => a - b).map(String),
    [data]
  );
  // 자재명옵션(2026-08-15, 단가마스터 자재명 정규화) — 단가마스터_자재단가로 자재 단위 단가가 적용된
  // 행만 자재명이 채워지므로, 등장한 값만 골라 후보로 제공.
  const 자재명옵션 = useMemo(
    () => Array.from(new Set((data?.품목.map((r) => r.자재명).filter(Boolean) as string[]) ?? [])).sort(),
    [data]
  );
  // 조 입력칸 datalist — 이 미리보기에서 이미 쓰인 조 이름 + 원본 표의 작업명(조 이름을 보통
  // 작업명과 같게 짓는 경우가 많아 후보로 함께 제안, 2026-07-29).
  const 조옵션 = useMemo(() => {
    const 쓰인조 = rightRows.map((r) => r.조).filter((v): v is string => !!v);
    return Array.from(new Set([...쓰인조, ...작업명옵션])).sort();
  }, [rightRows, 작업명옵션]);

  // 오른쪽 표를 조 단위로 그룹 표시(2026-07-29, 조별 분할발급) — 등장한 조가 2개 이상일 때만
  // 그룹 헤더·소계를 보여준다(조를 안 쓰는 기존 사용자에게는 화면이 그대로 보이도록).
  const 조_그룹목록 = useMemo(() => {
    const 맵 = new Map<string, number[]>();
    const 순서: string[] = [];
    rightRows.forEach((r, i) => {
      const key = r.조?.trim() || "";
      if (!맵.has(key)) {
        맵.set(key, []);
        순서.push(key);
      }
      맵.get(key)!.push(i);
    });
    return 순서.map((조) => ({ 조, indices: 맵.get(조)! }));
  }, [rightRows]);
  // 다운로드 시 시트가 실제로 여러 개로 쪼개지는지("N개짜리 통합 엑셀") 안내하는 배너 전용 —
  // 조가 2개 이상 등장해야(=시트가 2개 이상 생겨야) 의미가 있다.
  const 분할표시 = 조_그룹목록.length > 1;
  // 표를 작업구분 단위로 묶어 보여줄지(그룹 헤더+소계+"작업구분 복사" 버튼 표시 여부, 2026-08-09) —
  // 조가 1개만 등장했어도(예: 지금 등록된 4개 항목이 전부 "SC제일은행" 하나뿐) 그 그룹을 통째로
  // 복사해 새 작업구분을 만드는 용도로 헤더가 필요하므로, 분할표시(2개 이상)와 달리 실제 작업구분
  // 값이 하나라도 붙어 있으면(빈 문자열 "미지정" 제외) 표시한다. 조를 아예 안 쓰는 기존 화면은
  // 여전히 그대로 플랫 목록으로 보인다.
  const 그룹표시 = 조_그룹목록.some(({ 조 }) => 조.trim() !== "");

  if (!open || !data) return null;

  function openModalForNewRule() {
    setModalTarget(null);
    setModalOpen(true);
  }
  function openModalForRow(idx: number) {
    setModalTarget(idx);
    setModalOpen(true);
  }
  function handleModalCancel() {
    if (복사대기중 !== null) {
      // 복사 직후 열린 편집창을 취소하면 방금 끼워넣은 복사본도 함께 되돌린다 — "복사했다가
      // 바로 취소"가 화면에 쓸모없는 0건짜리 중복 행을 남기지 않도록.
      const idx = 복사대기중;
      setRightRows((prev) => prev.filter((_, i) => i !== idx));
      set복사대기중(null);
    }
    setModalOpen(false);
    setModalTarget(null);
  }
  function applyModalSave(result: {
    최종청구품명: string;
    조건: 규칙조건;
    조?: string;
    구분표시?: string;
    규격?: string;
    비고?: string;
  }) {
    set복사대기중(null);
    setRightRows((prev) => {
      let next: 편집행[];
      if (modalTarget === null) {
        next = [
          ...prev,
          {
            key: `rule-new-${신규행_카운터++}`,
            최종청구품명: result.최종청구품명,
            코드: null,
            수량: 0,
            단가: null,
            금액: 0,
            조건: result.조건,
            조: result.조,
            구분표시: result.구분표시,
            규격: result.규격,
            비고: result.비고,
          },
        ];
      } else {
        next = prev.map((r, i) =>
          i === modalTarget
            ? {
                ...r,
                최종청구품명: result.최종청구품명,
                조건: result.조건,
                조: result.조,
                구분표시: result.구분표시,
                규격: result.규격,
                비고: result.비고,
              }
            : r
        );
      }
      return 원본행_recompute(next, data!.품목);
    });
    setModalOpen(false);
    setModalTarget(null);
  }

  // 이 조건이 다른 규칙(지금 편집 중인 행 제외)이 이미 차지한 원본 항목과 겹치는지 먼저 확인한다
  // (2026-08-08 사용자 요청). 순서가 빠른 규칙이 우선 적용되는 구조(적용_규칙())라, 겹치는 항목은
  // 이 조건식이 실제로는 가져가지 못한다 — 사용자가 모르고 저장하면 "왜 이 항목이 안 잡히지"
  // 하고 헷갈릴 수 있어 저장 전에 알려주고 계속할지 확인받는다.
  function handleModalSave(result: {
    최종청구품명: string;
    조건: 규칙조건;
    조?: string;
    구분표시?: string;
    규격?: string;
    비고?: string;
  }) {
    // 조건 그룹이 하나도 없으면("전체 합산" 규칙, ConditionRuleModal.tsx 안내 문구 참고) 정의상
    // 모든 항목과 매칭되는 게 정상 동작이라 겹침 확인 대상이 아니다(2026-08-09) — 순서상 나중에
    // 두면 "이미 다른 규칙이 가져간 나머지"만 실제로 가져가는 용도로 쓰이므로, 겹친다는 경고 자체가
    // 항상 뜨게 되어 의미가 없다.
    if (result.조건.or.length === 0) {
      applyModalSave(result);
      return;
    }
    const 다른규칙들 = rightRows.filter((r, i) => i !== modalTarget && r.조건 !== null);
    // 원본 항목마다 "먼저 등록된 규칙부터 검사해 처음 매칭되는 규칙 하나에만 배정"(적용_규칙()과
    // 동일한 우선순위 규칙)으로 어느 규칙 소유인지 판정 — 이래야 지금 저장하려는 새 조건과 겹칠 때
    // 어느 규칙과 부딪히는지 규칙명까지 짚어줄 수 있다(2026-08-08 사용자 요청).
    const 소유자 = new Array<number | null>(data!.품목.length).fill(null);
    다른규칙들.forEach((rule, ri) => {
      data!.품목.forEach((row, i) => {
        if (소유자[i] !== null) return;
        if (평가_조건(row, rule.조건 as 규칙조건)) 소유자[i] = ri;
      });
    });

    const 규칙별건수맵 = new Map<string, number>();
    data!.품목.forEach((row, i) => {
      if (소유자[i] === null) return;
      if (!평가_조건(row, result.조건)) return;
      const 이름 = 다른규칙들[소유자[i]!].최종청구품명 || "(품명 없음)";
      규칙별건수맵.set(이름, (규칙별건수맵.get(이름) ?? 0) + 1);
    });

    if (규칙별건수맵.size > 0) {
      setOverlapConfirm({ result, 규칙별건수: Array.from(규칙별건수맵.entries()) });
      return;
    }
    applyModalSave(result);
  }

  function addManualRow() {
    // 단가를 null이 아니라 0으로 시작 — null은 "규칙으로 합쳐진 원본 행들의 단가가 서로 달라 표시
    // 불가"한 경우 전용이고(원본행_recompute 참고), 새로 추가하는 행은 그런 모호함이 없으므로
    // 처음부터 단가 입력칸이 바로 보여야 한다(2026-07-22, 사용자 요청).
    setRightRows((prev) => [
      ...prev,
      { key: `manual-${신규행_카운터++}`, 최종청구품명: "", 코드: null, 수량: 0, 단가: 0, 금액: 0, 조건: null, 조: undefined },
    ]);
  }
  function copyFromLeft() {
    setRightRows(
      data!.품목.map((row, i) => ({
        key: `copy-${i}`,
        최종청구품명: row.작업명 ? `${row.품목}(${row.작업명})` : row.품목,
        코드: row.코드,
        수량: row.수량,
        단가: row.단가,
        금액: row.금액,
        조건: null,
      }))
    );
  }
  function removeRow(idx: number) {
    setRightRows((prev) => 원본행_recompute(prev.filter((_, i) => i !== idx), data!.품목));
  }
  // 행 복사(2026-08-08 사용자 요청) — 원본 바로 아래에 똑같은 행을 하나 더 끼워 넣는다. 조건식
  // 행이면 지금 막 만든 복사본이 원본과 조건이 완전히 같아서(먼저 등록된 규칙이 우선 적용되는
  // 구조상) 당장은 0건이 매칭되므로, 바로 편집창을 열어 조건을 조정하도록 유도한다 — 저장 시
  // 겹침 확인(handleModalSave)이 그대로 적용되어 다른 규칙과도 안 겹치는지 다시 한번 확인해준다.
  // 수동 입력 행(조건 없음)은 겹침 개념이 없어 값만 그대로 복제하고 편집창은 열지 않는다.
  function copyRow(idx: number) {
    const 원본행 = rightRows[idx];
    const key = `copy-${신규행_카운터++}`;
    setRightRows((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, { ...원본행, key });
      return next;
    });
    if (원본행.조건 !== null) {
      setModalTarget(idx + 1);
      set복사대기중(idx + 1);
      setModalOpen(true);
    }
  }
  // 작업구분(조) 그룹 전체 복사(2026-08-08 사용자 요청) — 항목 하나씩 복사하지 않고, 같은
  // 작업구분에 묶인 조건식 여러 개를 한 번에 복제해 새 작업구분(예: 다른 은행)의 틀을 빨리
  // 만들 수 있게 한다. 복사본들에는 원본과 겹치지 않는 새 작업구분 이름을 붙여 하나의 새
  // 그룹으로 바로 묶여 보이게 하되, 조건 자체는 원본 그대로라 지금은 전부 0건으로 계산된다
  // (행 복사와 같은 이유) — 각 항목은 기존처럼 품명을 눌러 조건을 하나씩 조정하면 되고, 그때
  // 겹침 확인(handleModalSave)도 그대로 적용된다. 항목이 많아 편집창을 N번 연달아 띄우는 대신
  // 표에서 바로 0건임을 보여주는 쪽을 택함(원본행_recompute로 즉시 반영).
  function copyGroup(조: string, indices: number[]) {
    const 새조 = `${조 || "미지정"}-복사`;
    const 복사행목록 = indices.map((i) => ({ ...rightRows[i], key: `copy-${신규행_카운터++}`, 조: 새조 }));
    setRightRows((prev) => {
      const next = [...prev];
      next.splice(indices[indices.length - 1] + 1, 0, ...복사행목록);
      return 원본행_recompute(next, data!.품목);
    });
  }
  // 오른쪽 표(고객사 청구 명세서) 행 순서 변경(2026-07-24 사용자 요청) — 순서는 재계산과 무관한
  // 단순 배열 위치 교환이라 원본행_recompute 호출 불필요(수량·단가·금액은 그대로 유지).
  function moveRow(idx: number, direction: -1 | 1) {
    setRightRows((prev) => {
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }
  // 수량·단가 칸을 고치면 금액을 자동으로 다시 계산한다(2026-07-22, 사용자 요청: "수량과 단가
  // 표기 후 금액란도 자동으로 계산해주고") — 단가가 "—"(병합돼 단일 단가가 없는 경우, null)이면
  // 자동 계산할 기준이 없으므로 그때는 지금처럼 금액을 직접 입력하게 둔다. 금액 칸 자체는 여전히
  // 직접 수정 가능 — 그 다음에 수량·단가를 다시 건드리면 그 시점 값으로 재계산된다.
  function updateField(idx: number, patch: Partial<편집행>) {
    setRightRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const next = { ...r, ...patch };
        if (("수량" in patch || "단가" in patch) && next.단가 !== null) {
          next.금액 = next.수량 * next.단가;
        }
        return next;
      })
    );
  }

  // 오른쪽 표 한 행의 JSX — 조를 안 쓰는 화면(플랫 목록)과 조별로 묶어 보여주는 화면(2026-07-29)
  // 양쪽에서 그대로 재사용한다(전자는 rightRows를 그대로, 후자는 조_그룹목록의 indices로 호출).
  function renderRightRow(i: number) {
    const row = rightRows[i];
    return (
      <tr key={row.key} className="border-t border-gray-100 dark:border-gray-800">
        <td className={td}>
          {row.조건 !== null ? (
            <button
              type="button"
              onClick={() => openModalForRow(i)}
              className="text-left text-blue-700 hover:underline dark:text-blue-400"
              title="조건식 편집"
            >
              {row.최종청구품명 || "(품명 없음)"}
            </button>
          ) : (
            <input
              type="text"
              list="품명이력옵션"
              value={row.최종청구품명}
              onChange={(e) => updateField(i, { 최종청구품명: e.target.value })}
              className={`w-full rounded border border-gray-300 bg-white px-1.5 py-0.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100`}
              placeholder="품명"
            />
          )}
        </td>
        <td className={td}>
          <input
            type="text"
            list="조옵션-표"
            value={row.조 ?? ""}
            onChange={(e) => updateField(i, { 조: e.target.value || undefined })}
            className="w-36 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            placeholder="—"
          />
        </td>
        <td className={tdRight}>
          <input
            type="text"
            inputMode="decimal"
            value={콤마표시(row.수량)}
            onChange={(e) => updateField(i, { 수량: 콤마숫자파싱(e.target.value) })}
            className={numInput}
          />
        </td>
        <td className={tdRight}>
          {row.단가 === null ? (
            <span className="text-gray-400" title="병합된 항목의 단가가 서로 달라 표시할 수 없습니다">
              —
            </span>
          ) : (
            <input
              type="number"
              value={row.단가}
              onChange={(e) => updateField(i, { 단가: Number(e.target.value) })}
              className={numInputNarrow}
            />
          )}
        </td>
        <td className={tdRight}>
          <input
            type="text"
            inputMode="decimal"
            value={콤마표시(Math.round(row.금액))}
            onChange={(e) => updateField(i, { 금액: 콤마숫자파싱(e.target.value) })}
            className={numInput}
          />
        </td>
        <td className={td}>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => moveRow(i, -1)}
              disabled={i === 0}
              title="위로 이동"
              aria-label="위로 이동"
              className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 dark:text-gray-400 dark:hover:text-gray-100"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => moveRow(i, 1)}
              disabled={i === rightRows.length - 1}
              title="아래로 이동"
              aria-label="아래로 이동"
              className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 dark:text-gray-400 dark:hover:text-gray-100"
            >
              ▼
            </button>
            <button
              type="button"
              onClick={() => copyRow(i)}
              title="이 행 복사"
              aria-label="이 행 복사"
              className="text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
            >
              복사
            </button>
            <button type="button" onClick={() => removeRow(i)} className="text-xs text-red-600 hover:underline dark:text-red-400">
              삭제
            </button>
          </div>
        </td>
      </tr>
    );
  }

  // 조정 입력칸이 비활성화돼야 하는지(조가 여러 개인데 통합시트명을 아직 안 정한 경우) —
  // 백엔드(POST /거래명세서요청)도 동일 조건으로 override를 무효화하므로 프론트도 같은 기준으로
  // disabled 처리해 혼란을 주지 않는다.
  const 조정입력가능 = !분할표시 || 통합시트명.trim() !== "";
  // 입력칸에 항상 지금 보이는 값 그대로(손 안 댔으면 자동계산값, 손댔으면 그 값) — 확정 시에도
  // 이 값을 그대로 보낸다("보이는 대로 저장"). 서버가 자동계산값과 같으면 override로 취급하지
  // 않으므로(편집여부·감사이력 판정), 손 안 댄 값을 그대로 보내도 안전하다.
  const 공급가액_표시값 = 공급가액조정_수동 ? 공급가액조정값 : Math.round(표시_공급가액_오른쪽);
  const 세액_표시값 = 세액조정_수동 ? 세액조정값 : 표시_세액_오른쪽;

  function handleConfirmClick() {
    if (단가미등록행.length > 0) {
      set단가미등록확인대기(true);
      return;
    }
    if (미분류행.length > 0) {
      set미분류확인대기(true);
      return;
    }
    applyConfirm();
  }

  function applyConfirm() {
    const 품목_최종: 확정품목[] = rightRows.map((r) => ({
      코드: r.코드,
      품목: r.최종청구품명,
      수량: r.수량,
      단가: r.단가,
      금액: r.금액,
      조: r.조,
      구분표시: r.구분표시,
      규격: r.규격,
      비고: r.비고,
      수동입력: r.조건 === null,
    }));
    const 규칙: 확정규칙[] = rightRows
      .filter((r) => r.조건 !== null)
      .map((r, i) => ({
        순서: i + 1,
        최종청구품명: r.최종청구품명,
        조건: r.조건 as 규칙조건,
        조: r.조,
        구분표시: r.구분표시,
        규격: r.규격,
        비고: r.비고,
      }));
    onConfirm({
      품목_최종,
      규칙,
      통합조건식_해결: resolution,
      ...(분할표시 && !data?.조별표지 ? { 통합시트명, 상단업무명 } : {}),
      ...(조정입력가능 ? { 공급가액_직접입력: 공급가액_표시값, 세액_직접입력: 세액_표시값 } : {}),
      조상단업무명맵: Object.fromEntries(
        Object.entries(조상단업무명맵).filter(([, v]) => v.trim() !== "")
      ),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2">
      {/* 화면을 최대한 넓게 써야 편집이 편하다는 사용자 요청(2026-08-16)으로 여백을 줄이고 상한을
          늘림 — 이전 h-[92vh] w-[96vw] max-w-[1600px]에서 확대. */}
      <div className="relative flex h-[98vh] w-[99vw] max-w-[2400px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">거래명세서 미리보기 · 편집</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {data.거래처명} · {data.업무명_목록.join(", ")}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          아직 저장되지 않았습니다 — 오른쪽 표를 확인·수정한 뒤 &quot;확정&quot;을 눌러야 실제로
          요청됩니다. 오른쪽 품명 칸을 클릭하면 조건식으로 왼쪽 항목을 자동으로 묶을 수 있습니다.
        </p>
        {data.부가세오류 && (
          <p className="mt-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {data.부가세오류}
          </p>
        )}
        {/* 출력비·봉입비가 장수·봉입건수 대신 자재사용량 기준으로 청구됨(2026-08-17) — 원본이
            서로 다른 작업이 있으면(생산공정관리시스템 입력 단계 휴먼 에러로 확인됨) 안내만 하고
            계산·확정은 그대로 진행(자재사용량 기준 금액이 이미 반영돼 있음). */}
        {data.수량불일치 && data.수량불일치.length > 0 && (
          <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <p className="font-medium">
              ⚠ 장수·봉입건수와 실제 자재사용량이 다른 작업이 있습니다 — 자재사용량 기준으로
              청구됩니다(생산공정관리시스템 입력 오류로 추정, 다음 작업 등록 시 확인해 주세요).
            </p>
            {/* 경고 항목이 많으면 목록이 무한정 늘어나 아래 취소·확정 버튼까지 화면 밖으로 밀어내던
                문제(2026-08-29, 실사용 제보) — 목록만 높이 제한 + 자체 스크롤로 분리. */}
            <ul className="mt-1 max-h-32 list-disc space-y-0.5 overflow-y-auto pl-4">
              {data.수량불일치.map((x, i) => (
                <li key={i}>
                  {x.작업명}: {x.사유}
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* 단가미등록(2026-08-22) — 미분류와 달리 원본 표에 줄 자체가 안 생겨 왼쪽 표만 봐서는
            사용자가 알아챌 방법이 없다. 확정 시 아래 ConfirmDialog로 한 번 더 막지만, 미리보기
            단계에서도 눈에 띄도록 상단에 배너로 미리 알려준다(수량불일치와 같은 자리, 다만 실제
            금액이 빠지는 문제라 더 눈에 띄는 빨간색 사용). */}
        {data.단가미등록 && data.단가미등록.length > 0 && (
          <div className="mt-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            <p className="font-medium">
              ⚠ 단가가 등록되지 않아 원본 표에 빠진 품목이 있습니다 — 단가마스터에 단가를 등록하면
              반영됩니다. 확정 시 다시 한번 확인창이 뜹니다.
            </p>
            {/* 경고 항목이 많으면 목록이 무한정 늘어나 아래 취소·확정 버튼까지 화면 밖으로 밀어내던
                문제(2026-08-29, 실사용 제보) — 목록만 높이 제한 + 자체 스크롤로 분리. */}
            <ul className="mt-1 max-h-32 list-disc space-y-0.5 overflow-y-auto pl-4">
              {단가미등록그룹.map(([이름, v]) => (
                <li key={이름}>
                  {이름} — {v.수량.toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.통합조건식_불일치 && (
          <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {resolution ? (
              <p>
                선택한 대로 반영할 준비가 되었습니다 — &quot;확정&quot;을 누르면 통합조건식이
                지금 선택한 업무명 기준으로 갱신됩니다.
              </p>
            ) : data.통합조건식_불일치.상황 === "부족" ? (
              <>
                <p>
                  이 통합조건식은 원래 [{data.통합조건식_불일치.차이_업무명.join(", ")}]도
                  포함하는데 지금 선택에서 빠져 있습니다.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setResolution({ 기존업무명조합: data.통합조건식_불일치!.기존업무명조합 })}
                    className="rounded border border-amber-400 bg-white px-2 py-1 font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-gray-900 dark:text-amber-300 dark:hover:bg-amber-950"
                  >
                    [{data.통합조건식_불일치.차이_업무명.join(", ")}] 제외하고 확정
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    닫고 선택 화면에서 [{data.통합조건식_불일치.차이_업무명.join(", ")}] 추가하기
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>
                  [{data.통합조건식_불일치.차이_업무명.join(", ")}]를 이 통합조건식에
                  추가하시겠습니까?
                </p>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setResolution({ 기존업무명조합: data.통합조건식_불일치!.기존업무명조합 })}
                    className="rounded border border-amber-400 bg-white px-2 py-1 font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-gray-900 dark:text-amber-300 dark:hover:bg-amber-950"
                  >
                    [{data.통합조건식_불일치.차이_업무명.join(", ")}] 추가하고 확정
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* 2026-08-12엔 왼쪽(읽기 전용)을 좁게(40:60)로 뒀었는데, 이후 왼쪽 표에 자재명이 추가되며
            내용이 길어져 오히려 왼쪽이 좁고 오른쪽이 남는다는 피드백(2026-08-16)으로 50:50으로 조정. */}
        <div className="mt-3 grid flex-1 grid-cols-[1fr_1fr] gap-4 overflow-hidden">
          {/* 왼쪽: 원본(읽기 전용) */}
          <div className="flex flex-col overflow-hidden">
            <h3 className="mb-1 flex items-baseline gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
              <span>시스템 자동계산 원본</span>
              <span className="font-normal text-gray-400 dark:text-gray-500">
                총 {data.품목.length.toLocaleString()}건 | 선택 {매칭Set.size.toLocaleString()}건 | 미선택{" "}
                {(data.품목.length - 매칭Set.size).toLocaleString()}건
              </span>
            </h3>
            <div className="min-h-0 flex-1 overflow-auto rounded-md border border-gray-200 dark:border-gray-800">
              <table className="w-full whitespace-nowrap text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className={th} title="오른쪽 표에 반영된 항목">✓</th>
                    <th className={th}>코드</th>
                    <th className={th}>품목(작업명) 자재명</th>
                    <th className={thRight}>수량</th>
                    <th className={thRight}>단가</th>
                    <th className={thRight}>금액</th>
                  </tr>
                </thead>
                <tbody>
                  {data.품목.map((row, i) => (
                    <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                      <td className={td}>
                        {매칭Set.has(row) && (
                          <span className="text-green-600 dark:text-green-400" title="오른쪽 표에 반영됨">
                            ✓
                          </span>
                        )}
                      </td>
                      <td className={td}>{row.코드}</td>
                      <td className={td}>
                        {row.품목}
                        {row.작업명 && <span className="text-gray-500 dark:text-gray-400">({row.작업명})</span>}
                        {/* 자재명(자재단가 분할)과 공정비고(공정단가 등록 시 입력한 메모, 2026-08-24)는
                            한 품목에 동시에 붙지 않아(자재단가 항목 vs 공정단가 항목) 같은 자리·스타일을
                            공유한다 — 사용자 요청: "자재명과 완전히 같은 자리·스타일". */}
                        {(row.자재명 || row.공정비고) && (
                          <span
                            className="text-blue-600 dark:text-blue-400"
                            title={row.자재명 ? "자재단가로 분할된 항목" : "공정단가 등록 시 입력한 비고"}
                          >
                            {" "}
                            · {row.자재명 || row.공정비고}
                          </span>
                        )}
                      </td>
                      <td className={tdRight}>{row.수량.toLocaleString()}</td>
                      <td className={tdRight}>{row.단가.toLocaleString()}</td>
                      <td className={tdRight}>{Math.round(row.금액).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 dark:border-gray-700">
                    <td className={td} colSpan={5}>
                      공급가액
                    </td>
                    <td className={tdRight}>{Math.round(표시_공급가액_왼쪽).toLocaleString()}원</td>
                  </tr>
                  <tr className="dark:border-gray-700">
                    <td className={td} colSpan={5}>
                      부가세
                      {data.부가세구분 === "포함" && <span className="text-gray-400">(단가 포함)</span>}
                      {data.부가세구분 === null && <span className="text-red-600 dark:text-red-400">(판정 불가)</span>}
                    </td>
                    <td className={tdRight}>{표시_세액_왼쪽.toLocaleString()}원</td>
                  </tr>
                  <tr className="border-t border-gray-200 font-semibold dark:border-gray-700">
                    <td className={td} colSpan={5}>
                      합계
                    </td>
                    <td className={tdRight}>{Math.round(data.총합계 + 세액_왼쪽).toLocaleString()}원</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 오른쪽: 규칙 적용 결과 + 수동 편집 */}
          <div className="flex flex-col overflow-hidden">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">고객사 청구 명세서</h3>
              <div className="flex gap-2">
                {rightRows.length === 0 && (
                  <button type="button" onClick={copyFromLeft} className="text-xs text-gray-600 hover:underline dark:text-gray-300">
                    좌측 그대로 시작
                  </button>
                )}
                <button type="button" onClick={openModalForNewRule} className="text-xs text-gray-600 hover:underline dark:text-gray-300">
                  + 조건 규칙 추가
                </button>
                <button type="button" onClick={addManualRow} className="text-xs text-gray-600 hover:underline dark:text-gray-300">
                  + 새 행 추가
                </button>
              </div>
            </div>

            {분할표시 && data?.조별표지 && (
              <div className="mb-1 space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  작업구분이 {조_그룹목록.length}개 등장했습니다 — 이 거래처는 &ldquo;조별표지&rdquo; 대상이라
                  통합 명세서를 만들지 않습니다. 다운로드하면 &ldquo;요청내용&rdquo; 표지에 작업구분별 부분합이
                  나눠 표시되고, 작업구분별 시트 {조_그룹목록.length}개를 받습니다.
                </p>
              </div>
            )}
            {분할표시 && !data?.조별표지 && (
              <div className="mb-1 space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  작업구분이 {조_그룹목록.length}개 등장했습니다 — 확정하면 거래명세서 1건이 발급되고,
                  다운로드하면 맨 앞에 전체를 합친 통합 명세서 시트 1개 + 작업구분별 시트{" "}
                  {조_그룹목록.length}개, 총 {조_그룹목록.length + 1}개짜리 통합 엑셀을 받습니다.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={통합시트명}
                    onChange={(e) => set통합시트명(e.target.value)}
                    placeholder="통합 시트명 (예: 통합명세서)"
                    className="w-40 rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                  />
                  <input
                    type="text"
                    value={상단업무명}
                    onChange={(e) => set상단업무명(e.target.value)}
                    placeholder="통합 시트 상단 업무명"
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                  />
                </div>
              </div>
            )}
            <datalist id="조옵션-표">
              {조옵션.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
            <datalist id="품명이력옵션">
              {품명이력후보.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
            <div className="min-h-0 flex-1 overflow-auto rounded-md border border-gray-200 dark:border-gray-800">
              <table className="w-full whitespace-nowrap text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className={th}>품명</th>
                    <th className={th}>작업구분</th>
                    <th className={thRight}>수량</th>
                    <th className={thRight}>단가</th>
                    <th className={thRight}>금액</th>
                    <th className={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {rightRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                        저장된 규칙이 없습니다. &quot;조건 규칙 추가&quot;로 새로 만들거나 &quot;좌측
                        그대로 시작&quot;을 눌러 편집을 시작하세요.
                      </td>
                    </tr>
                  )}
                  {!그룹표시 && rightRows.map((_, i) => renderRightRow(i))}
                  {그룹표시 &&
                    조_그룹목록.map(({ 조, indices }) => {
                      const 그룹공급가액 = indices.reduce((s, i) => s + (rightRows[i].금액 || 0), 0);
                      return (
                        <Fragment key={조 || "미지정"}>
                          <tr className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60">
                            <td colSpan={6} className="px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                              <div className="flex items-center justify-between gap-2">
                                <span className="shrink-0">
                                  작업구분: {조 || "미지정"} ({indices.length}건)
                                </span>
                                {조 && (
                                  <input
                                    type="text"
                                    value={조상단업무명맵[조] ?? ""}
                                    onChange={(e) =>
                                      set조상단업무명맵((prev) => ({ ...prev, [조]: e.target.value }))
                                    }
                                    placeholder="시트 상단 업무명 — 비워두면 자동"
                                    title="이 작업구분 시트 상단(B12)에 표시할 업무명을 직접 입력합니다. 비워두면 자동으로 계산된 업무명이 표시됩니다."
                                    className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-normal text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                  />
                                )}
                                <button
                                  type="button"
                                  onClick={() => copyGroup(조, indices)}
                                  title="이 작업구분에 속한 항목 전체를 새 작업구분으로 복사합니다 — 조건은 원본과 같아 지금은 0건으로 보이니, 각 항목의 품명을 눌러 조건과 작업구분명을 수정해 주세요"
                                  className="shrink-0 font-normal text-gray-500 hover:text-gray-800 hover:underline dark:text-gray-400 dark:hover:text-gray-100"
                                >
                                  작업구분 복사
                                </button>
                              </div>
                            </td>
                          </tr>
                          {indices.map((i) => renderRightRow(i))}
                          <tr className="border-t border-gray-100 bg-gray-50/60 text-xs dark:border-gray-800 dark:bg-gray-800/30">
                            <td className={td} colSpan={4}>
                              소계
                            </td>
                            <td className={tdRight}>{Math.round(그룹공급가액).toLocaleString()}원</td>
                            <td className={td}></td>
                          </tr>
                        </Fragment>
                      );
                    })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 dark:border-gray-700">
                    <td className={td} colSpan={4}>
                      공급가액
                    </td>
                    <td className={tdRight}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={콤마표시(공급가액_표시값)}
                        onChange={(e) => {
                          set공급가액조정_수동(true);
                          set공급가액조정값(콤마숫자파싱(e.target.value));
                        }}
                        disabled={!조정입력가능}
                        className={numInput + " disabled:cursor-not-allowed disabled:opacity-50"}
                      />
                    </td>
                    <td className={td}>
                      {공급가액조정_수동 && (
                        <button
                          type="button"
                          onClick={() => {
                            set공급가액조정_수동(false);
                            set세액조정_수동(false);
                          }}
                          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                        >
                          자동값 사용
                        </button>
                      )}
                    </td>
                  </tr>
                  <tr className="dark:border-gray-700">
                    <td className={td} colSpan={4}>
                      부가세
                      {data.부가세구분 === "포함" && <span className="text-gray-400">(단가 포함)</span>}
                      {data.부가세구분 === null && <span className="text-red-600 dark:text-red-400">(판정 불가)</span>}
                    </td>
                    <td className={tdRight}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={콤마표시(세액_표시값)}
                        onChange={(e) => {
                          set세액조정_수동(true);
                          set세액조정값(콤마숫자파싱(e.target.value));
                        }}
                        disabled={!조정입력가능}
                        className={numInput + " disabled:cursor-not-allowed disabled:opacity-50"}
                      />
                    </td>
                    <td className={td}></td>
                  </tr>
                  {!조정입력가능 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-1 text-xs text-amber-600 dark:text-amber-400">
                        {data?.조별표지
                          ? "이 거래처는 조별표지 대상이라 통합 명세서가 없어 공급가액·부가세를 조정할 수 없습니다(작업구분이 1개일 때만 조정 가능)."
                          : "통합시트명을 먼저 입력해야 공급가액·부가세를 조정할 수 있습니다(조가 여러 개일 때는 통합시트에만 조정이 반영됩니다)."}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-gray-200 font-semibold dark:border-gray-700">
                    <td className={td} colSpan={4}>
                      합계
                    </td>
                    <td className={tdRight}>
                      {/* 항상 바로 위 두 줄(공급가액·부가세) 표시값의 합 — 화면에 보이는 세 줄이 서로 어긋나지 않도록. */}
                      {(공급가액_표시값 + 세액_표시값).toLocaleString()}
                      원
                    </td>
                    <td className={td}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={submitting || rightRows.length === 0 || !!data.부가세오류 || (!!data.통합조건식_불일치 && !resolution)}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            {submitting ? "요청 중..." : "확정"}
          </button>
        </div>

        {/* 조건 편집 패널 — 전체화면 모달이 아니라 오른쪽에 도킹된 패널로 띄운다(2026-07-22, 사용자
            피드백: "조건식 화면이 고정이다 보니 원본 내역을 확인할 수 없음") — 왼쪽 원본 표를 계속
            보면서 조건을 만들 수 있도록 왼쪽은 절대 가리지 않는다. */}
        {modalOpen && (
          <ConditionRuleModal
            initial={
              modalTarget !== null
                ? {
                    최종청구품명: rightRows[modalTarget]?.최종청구품명 ?? "",
                    조건: rightRows[modalTarget]?.조건 ?? { or: [] },
                    조: rightRows[modalTarget]?.조,
                    구분표시: rightRows[modalTarget]?.구분표시,
                    규격: rightRows[modalTarget]?.규격,
                    비고: rightRows[modalTarget]?.비고,
                  }
                : null
            }
            코드옵션={코드옵션}
            품목옵션={품목옵션}
            단가옵션={단가옵션}
            작업명옵션={작업명옵션}
            자재명옵션={자재명옵션}
            조옵션={조옵션}
            onSave={handleModalSave}
            onCancel={handleModalCancel}
          />
        )}

        <ConfirmDialog
          open={!!overlapConfirm}
          title="겹치는 항목 안내"
          message="이 조건은 아래 규칙이 이미 가져간 항목과도 일치합니다. 먼저 등록된 규칙이 우선 적용되므로, 저장하면 이 조건식은 그 항목들을 제외한 나머지만 가져갑니다. 의도하신 게 맞다면 계속 진행해 주세요."
          items={overlapConfirm?.규칙별건수.map(([이름, 건수]) => `${이름} — ${건수}건`) ?? []}
          confirmLabel="계속 진행"
          cancelLabel="조건 다시 보기"
          onConfirm={() => {
            if (overlapConfirm) applyModalSave(overlapConfirm.result);
            setOverlapConfirm(null);
          }}
          onClose={() => setOverlapConfirm(null)}
        />

        <ConfirmDialog
          open={단가미등록확인대기}
          title="단가가 등록되지 않은 품목이 있습니다"
          message={`실제 생산 실적은 있지만 단가(기본단가·자재별 단가 모두)가 등록되지 않아 ${단가미등록행.length.toLocaleString()}건이 청구서에서 빠집니다. 단가마스터에 단가를 등록한 뒤 다시 시도하거나, 그래도 진행할 수 있습니다.`}
          items={[
            ...단가미등록그룹.slice(0, 15).map(([이름, v]) => `${이름} — 수량 ${v.수량.toLocaleString()}(${v.건수}건)`),
            ...(단가미등록그룹.length > 15 ? [`외 ${단가미등록그룹.length - 15}개 항목 더`] : []),
          ]}
          confirmLabel="그래도 확정"
          cancelLabel="미리보기로 돌아가기"
          danger
          dangerText="누락된 금액은 이후 별도로 청구해야 합니다."
          onConfirm={() => {
            set단가미등록확인대기(false);
            if (미분류행.length > 0) {
              set미분류확인대기(true);
              return;
            }
            applyConfirm();
          }}
          onClose={() => set단가미등록확인대기(false)}
        />

        <ConfirmDialog
          open={미분류확인대기}
          title="미분류 항목이 있습니다"
          message={`왼쪽 원본 중 ${미분류행.length.toLocaleString()}건(${미분류합계.toLocaleString()}원)이 아직 오른쪽 표에 반영되지 않았습니다. 이대로 확정하면 이 금액은 청구서에서 빠집니다. 그래도 진행하시겠습니까?`}
          items={[
            ...미분류그룹.slice(0, 15).map(([이름, v]) => `${이름} — ${v.건수.toLocaleString()}건, ${v.금액.toLocaleString()}원`),
            ...(미분류그룹.length > 15 ? [`외 ${미분류그룹.length - 15}개 항목 더`] : []),
          ]}
          confirmLabel="그래도 확정"
          cancelLabel="미리보기로 돌아가기"
          danger
          dangerText="누락된 금액은 이후 별도로 청구해야 합니다."
          onConfirm={() => {
            set미분류확인대기(false);
            applyConfirm();
          }}
          onClose={() => set미분류확인대기(false)}
        />
      </div>
    </div>
  );
}
