import { useMemo, useState } from "react";
import type { 운영통계행 } from "@/components/Dashboard";

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 이번 달은 아직 진행 중(종료되지 않음)이므로, 기준월은 항상 "가장 최근에 끝난 달"(직전월)로 계산
function 최근완료월(): string {
  const today = new Date();
  let y = today.getFullYear();
  let m = today.getMonth(); // 0-인덱스 이번달 값 = 1-인덱스 직전월 값과 같음 (1월만 예외)
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return toISODate(new Date(y, m, 0));
}

export function uniqSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "ko"));
}

function defaultRange(rows: 운영통계행[]) {
  const 연월목록 = uniqSorted(rows.map((r) => r.연월));
  const 목표월 = 최근완료월();
  const 최신연월 = 연월목록[연월목록.length - 1] ?? 목표월;
  const 자동대체됨 = !연월목록.includes(목표월);
  const 기준월 = 자동대체됨 ? 최신연월 : 목표월;

  const 시작일 = `${기준월}-01`;
  const 종료일 = lastDayOfMonth(기준월);

  return { 시작일, 종료일, 자동대체됨 };
}

// 상위 필터가 바뀌어 옵션 목록이 좁아지면, 더 이상 유효하지 않은 선택값을 화면에 그리기 전에 걸러낸다.
// useEffect로 커밋 후 지우는 대신 렌더링 중 바로 조정하는 방식(React 공식 권장 패턴,
// react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes) —
// 깜빡임 없이 즉시 반영되고, "setState in effect" 린트 경고도 발생하지 않는다.
export function usePrunedSelection(selected: string[], options: string[], setSelected: (next: string[]) => void): string[] {
  const [prevOptions, setPrevOptions] = useState(options);
  if (options !== prevOptions) {
    setPrevOptions(options);
    const pruned = selected.filter((v) => options.includes(v));
    if (pruned.length !== selected.length) {
      setSelected(pruned);
      return pruned;
    }
  }
  return selected;
}

// 필터 값(문자열로 직렬화한 key)이 바뀌면 콜백을 실행 — 주로 체크박스 선택(Set) 상태 초기화에
// 사용. 화면에 안 보이는 이전 선택이 남아 집계표만 안 맞아 보이는 혼선을 막기 위함
// (2026-07-24 사용자 제보). usePrunedSelection과 동일한 "렌더링 중 조정" 패턴이라
// useEffect 기반과 달리 깜빡임·"setState in effect" 린트 경고가 없다.
export function useResetOnFilterChange(filterKey: string, onReset: () => void): void {
  const [prevKey, setPrevKey] = useState(filterKey);
  if (filterKey !== prevKey) {
    setPrevKey(filterKey);
    onReset();
  }
}

// 사업부 → 조회기간 → 담당자 → 거래처 → 업무명 캐스케이딩 필터 상태.
// 탭마다 이 훅을 한 번씩 호출하면 자동으로 독립된 필터 상태를 갖게 됨(공유 안 함).
export function useFilters(rows: 운영통계행[]) {
  const init = useMemo(() => defaultRange(rows), [rows]);

  const [사업부, set사업부] = useState<string[]>([]);
  const [시작일, set시작일] = useState(init.시작일);
  const [종료일, set종료일] = useState(init.종료일);
  const [담당자, set담당자] = useState<string[]>([]);
  const [거래처, set거래처] = useState<string[]>([]);
  const [업무명, set업무명] = useState<string[]>([]);

  const base1 = useMemo(
    () => (사업부.length ? rows.filter((r) => 사업부.includes(r.사업부)) : rows),
    [rows, 사업부]
  );
  const base2 = useMemo(
    () => base1.filter((r) => (!시작일 || r.날짜 >= 시작일) && (!종료일 || r.날짜 <= 종료일)),
    [base1, 시작일, 종료일]
  );
  const 담당자옵션 = useMemo(() => uniqSorted(base2.map((r) => r.마케팅담당자)), [base2]);
  const 유효담당자 = usePrunedSelection(담당자, 담당자옵션, set담당자);
  const base3 = useMemo(
    () => (유효담당자.length ? base2.filter((r) => 유효담당자.includes(r.마케팅담당자)) : base2),
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
    set시작일(init.시작일);
    set종료일(init.종료일);
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
    base1,
    base5,
    기본시작일: init.시작일,
    기본종료일: init.종료일,
    자동대체됨: init.자동대체됨,
    필터초기화,
  };
}
