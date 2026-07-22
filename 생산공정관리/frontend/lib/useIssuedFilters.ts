import { useMemo, useState } from "react";
import { uniqSorted, usePrunedSelection } from "./useFilters";
import type { 발행행 } from "@/components/Dashboard";

// 탭4 "발행요청목록"·"발행완료" 전용 필터 훅 — useInvoiceFilters.ts와 완전히 동일한 로직이지만
// 타입만 발행행으로 바꾼 명시적 복제본. useInvoiceFilters(rows: 미발행행[])에 발행행[]를 그대로
// 넘기는 것 자체는 컴파일되지만(구조적 서브타입), 반환되는 base5 등의 타입이 미발행행으로 고정되어
// 거래명세서번호·발송여부에 접근하면 TS 에러가 나기 때문에 복제한다(SKILL-10 전례).
//
// 시작일 기본값은 빈 칸(전체 표시) — 예전엔 "이 목록의 가장 이른 작업일자"를 자동으로 채웠으나
// useState 초기값은 처음 마운트 시점 한 번만 계산되고 이후 rows가 늘어나도(예: 새로 발행 완료된
// 의뢰서가 더 이른 날짜를 가진 경우) 재계산되지 않아, 레벨1 요약(필터 적용됨)과 레벨2 상세
// (예전엔 필터 미적용)가 서로 다른 건수를 집계하는 버그로 이어졌다(2026-07-22 실사용 중 발견).
// 사용자 요청(2026-07-22)에 따라 필터를 사용자가 직접 지정하는 방식으로 단순화 — 기본은 항상 전체.
export function useIssuedFilters(rows: 발행행[]) {
  const [사업부, set사업부] = useState<string[]>([]);
  const [시작일, set시작일] = useState("");
  const [종료일, set종료일] = useState("");
  const [담당자, set담당자] = useState<string[]>([]);
  const [거래처, set거래처] = useState<string[]>([]);
  const [업무명, set업무명] = useState<string[]>([]);

  const base1 = useMemo(
    () => (사업부.length ? rows.filter((r) => 사업부.includes(r.사업부)) : rows),
    [rows, 사업부]
  );
  const base2 = useMemo(
    () => base1.filter((r) => (!시작일 || r.작업일자 >= 시작일) && (!종료일 || r.작업일자 <= 종료일)),
    [base1, 시작일, 종료일]
  );

  const 담당자옵션 = useMemo(() => uniqSorted(base2.map((r) => r.담당자)), [base2]);
  const 유효담당자 = usePrunedSelection(담당자, 담당자옵션, set담당자);
  const base3 = useMemo(
    () => (유효담당자.length ? base2.filter((r) => 유효담당자.includes(r.담당자)) : base2),
    [base2, 유효담당자]
  );

  const 거래처옵션 = useMemo(() => uniqSorted(base3.map((r) => r.거래처명)), [base3]);
  const 유효거래처 = usePrunedSelection(거래처, 거래처옵션, set거래처);
  const base4 = useMemo(
    () => (유효거래처.length ? base3.filter((r) => 유효거래처.includes(r.거래처명)) : base3),
    [base3, 유효거래처]
  );

  const 업무명옵션 = useMemo(() => uniqSorted(base4.map((r) => r.업무명)), [base4]);
  const 유효업무명 = usePrunedSelection(업무명, 업무명옵션, set업무명);
  const base5 = useMemo(
    () => (유효업무명.length ? base4.filter((r) => 유효업무명.includes(r.업무명)) : base4),
    [base4, 유효업무명]
  );

  function 필터초기화() {
    set사업부([]);
    set시작일("");
    set종료일("");
    set담당자([]);
    set거래처([]);
    set업무명([]);
  }

  return {
    사업부,
    set사업부,
    시작일,
    set시작일,
    종료일,
    set종료일,
    담당자,
    set담당자,
    거래처,
    set거래처,
    업무명,
    set업무명,
    담당자옵션,
    거래처옵션,
    업무명옵션,
    base5,
    필터초기화,
  };
}
