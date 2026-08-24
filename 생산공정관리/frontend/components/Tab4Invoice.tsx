"use client";

import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import InvoiceFilterSidebar from "./InvoiceFilterSidebar";
import InvoiceSelectionTable from "./InvoiceSelectionTable";
import InvoiceSelectionSummaryBar from "./InvoiceSelectionSummaryBar";
import InvoiceDetailTable from "./InvoiceDetailTable";
import InvoicePreviewDialog from "./InvoicePreviewDialog";
import ConfirmDialog from "./ConfirmDialog";
import type { 미리보기결과, 확정품목, 확정규칙, 통합조건식_해결 } from "./InvoicePreviewDialog";
import { useInvoiceFilters } from "@/lib/useInvoiceFilters";
import { useResetOnFilterChange } from "@/lib/useFilters";
import type { 미발행행, 운영통계행, 발행행 } from "./Dashboard";

type 배너 = { type: "success" | "warning" | "error"; text: string };

const 배너색상: Record<배너["type"], string> = {
  success: "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  warning: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  error: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
};

// 탭4 "미발행 목록" 오케스트레이터 — GET /미발행목록(서버가 미발행 판정+집계+금액계산을
// 전부 끝낸 결과)을 props로 받아 필터·선택·요청 흐름만 담당한다.
// rows/setRows는 Tab4.tsx가 소유한 controlled state — 요청 성공 시 이 배열에서 항목을 빼면서
// 동시에 onIssued로 발행요청목록 쪽에도 즉시 반영되게 한다(새로고침 없이 두 화면이 항상 일치).
export default function Tab4Invoice({
  rows,
  setRows,
  detailRows,
  onIssued,
}: {
  rows: 미발행행[];
  setRows: Dispatch<SetStateAction<미발행행[]>>;
  detailRows: 운영통계행[];
  onIssued: (신규: 발행행[]) => void;
}) {
  const filters = useInvoiceFilters(rows);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // 필터(사업부·기간·담당자·거래처·업무명)가 바뀌면 선택을 유지할지 해제할지 팝업으로 물어봄
  // (2026-07-31, 사용자 요청 — "같은 거래처에서 업무명 A로 체크한 뒤 업무명 B를 필터에 추가하면
  // A의 선택이 사라지는" 불편 해소). selectedRows는 filters.base5가 아니라 rows(전체) 기준으로
  // 계산되므로(아래 참고), 선택을 유지해도 상단 합계가 깨지지 않음 — 선택이 0건이면 잃을 게
  // 없으므로 팝업 없이 조용히 넘어감.
  const [confirmFilterChange, setConfirmFilterChange] = useState(false);
  // "선택 유지"를 누른 시점의 선택 스냅샷(2026-08-09 사용자 요청) — 그 이후 새로 체크한 항목만
  // 별도 통계표로 보여주기 위한 기준점. 한 번도 "선택 유지"를 안 눌렀으면 null(신규 통계표 자체를
  // 안 보여줌). "선택 해제"·거래명세서 요청 성공 시 null로 되돌려 다음 선택 사이클에 이전
  // 기준점이 남아있지 않게 한다.
  const [유지기준선택, set유지기준선택] = useState<Set<string> | null>(null);
  // "선택 유지"로 이미 한 번 확인받은 항목들(2026-08-10 사용자 요청) — 업무명 필터를 바꿔 한 번
  // 물어본 뒤, 이어서 기간 등 다른 필터를 조정할 때 같은 항목을 또 물어보는 게 번거롭다는 피드백.
  // 여기 담긴 id는 "화면에 안 보여도 계속 선택 상태로 둬도 된다"고 이미 승인된 것이므로, 이후
  // 필터가 몇 번을 더 바뀌어도 다시 묻지 않는다 — 선택 사이클이 끝나면(전체 해제·요청 완료)
  // 함께 비운다.
  const [숨김확인됨, set숨김확인됨] = useState<Set<string>>(new Set());
  const filterKey = JSON.stringify([filters.사업부, filters.시작일, filters.종료일, filters.담당자, filters.거래처, filters.업무명]);
  useResetOnFilterChange(filterKey, () => {
    if (selected.size === 0) return;
    // useResetOnFilterChange는 같은 렌더 안에서 filters.base5가 이미 새 필터 기준으로
    // 재계산된 뒤 호출되므로, 지금 선택된 항목이 새 필터에서도 전부 보이는지 바로 확인 가능
    // (2026-08-10 사용자 요청 — 날짜 범위를 조금씩 조정할 때마다 매번 물어보는 게 불편함).
    // 화면에서 사라지는 항목이 없거나, 이미 이전에 "선택 유지"로 확인받은 항목뿐이면
    // 물어볼 필요 없이 조용히 선택 유지.
    const 새필터에보이는ID = new Set(filters.base5.map((r) => r.의뢰서번호));
    const 확인필요 = Array.from(selected).some((id) => !새필터에보이는ID.has(id) && !숨김확인됨.has(id));
    if (!확인필요) return;
    setConfirmFilterChange(true);
  });
  const [banner, setBanner] = useState<배너 | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // 미리보기 팝업(2026-07-20 신규) — "거래명세서 요청" 클릭 시 바로 저장하지 않고 먼저 이 상태를
  // 채워 InvoicePreviewDialog를 띄운다. 실제 저장(POST /api/invoice-request)은 그 팝업의
  // "확정" 클릭(handleConfirmSubmit)에서만 일어난다.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<미리보기결과 | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // 미리보기를 새로 열 때마다 증가시켜 InvoicePreviewDialog에 key로 전달 — 좌우 2단 편집 화면의
  // rightRows 초기값은 useState 초기화 함수에서 한 번만 계산하므로(2026-07-22, set-state-in-effect
  // 린트 회피), 새 미리보기 데이터를 받을 때마다 key를 바꿔 컴포넌트를 통째로 재마운트해야 한다.
  const [previewSeq, setPreviewSeq] = useState(0);

  // 검증·요청 payload는 화면에 보이는 filters.base5가 아니라 rows(전체) 기준으로 계산한다 —
  // "선택 유지"를 택하면 필터 변경 후에도 화면에 안 보이는 항목이 selected에 남아있을 수 있으므로,
  // 요청 처리 자체는 필터와 무관하게 선택된 실제 항목 기준으로 계산하는 게 원칙적으로 맞다.
  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.의뢰서번호)), [rows, selected]);
  // "선택 유지" 이후 새로 체크한 항목만(2026-08-09) — 기준점이 없으면(아직 선택 유지를 안 거쳤으면)
  // 빈 배열이라 아래 렌더링에서 별도 통계표 자체가 안 나타난다.
  const 새로선택된Rows = useMemo(
    () => (유지기준선택 === null ? [] : selectedRows.filter((r) => !유지기준선택.has(r.의뢰서번호))),
    [selectedRows, 유지기준선택]
  );

  // useCallback으로 함수 참조를 고정 — InvoiceSelectionTable의 행 컴포넌트가 React.memo로
  // 리렌더를 건너뛰려면 onToggleRow 등 콜백 props도 매 렌더마다 새로 만들어지면 안 된다.
  const toggleRow = useCallback((의뢰서번호: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(의뢰서번호)) next.delete(의뢰서번호);
      else next.add(의뢰서번호);
      // 체크 해제로 선택이 완전히 0건이 되면 "선택 유지" 기준점·확인기록도 함께 지운다 — 안 그러면
      // 전체 해제 후 다시 선택했을 때 예전 기준점과 비교한 "새로 선택" 표가 엉뚱하게 남는다(2026-08-10 버그).
      if (next.size === 0) {
        set유지기준선택(null);
        set숨김확인됨(new Set());
      }
      return next;
    });
  }, []);

  // 우편요금 입력(2026-08-22, `.claude/plans/plan_우편요금관리.md`) — 매일 발송하는 업무는
  // 영업일마다 우편요금이 달라져 미발행 목록에서 의뢰서 단위로 직접 입력·관리한다. 낙관적으로
  // 화면부터 갱신하고(다른 "선택 유지" 등 로컬 state와 동일한 패턴) 서버에 저장 — 실패하면
  // 다음 새로고침 때 서버 값으로 되돌아간다(간단한 정책, 이 화면의 다른 낙관적 업데이트와 동일).
  const updatePostage = useCallback(
    (의뢰서번호: string, 금액: number) => {
      setRows((prev) => prev.map((r) => (r.의뢰서번호 === 의뢰서번호 ? { ...r, 우편요금: 금액 } : r)));
      fetch("/api/invoice-postage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 의뢰서번호, 금액 }),
      }).catch(() => {});
    },
    [setRows]
  );

  const toggleAll = useCallback(
    (checked: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of filters.base5) {
          if (checked) next.add(r.의뢰서번호);
          else next.delete(r.의뢰서번호);
        }
        if (next.size === 0) {
          set유지기준선택(null);
          set숨김확인됨(new Set());
        }
        return next;
      });
    },
    [filters.base5]
  );

  // "선택 취소"(2026-08-16 사용자 요청) — 지금까지는 선택을 전부 지우려면 체크된 항목을 하나씩
  // 해제하거나 필터를 바꿔 화면에서 사라지게 하는 수밖에 없었음("선택 유지"로 필터 밖 항목도 선택에
  // 남아있을 수 있어 toggleAll(false)만으로는 안 지워짐). 필터와 무관하게 전체 선택을 한 번에 비운다.
  const clearSelection = useCallback(() => {
    setSelected(new Set());
    set유지기준선택(null);
    set숨김확인됨(new Set());
  }, []);

  // "거래명세서 요청" 클릭 → 검증(기존과 동일) → 미리보기 API 호출 → 통과하면 팝업 오픈.
  // 여기서는 아직 아무것도 저장하지 않는다.
  async function handlePreviewClick() {
    if (selectedRows.length === 0) {
      setBanner({ type: "warning", text: "선택된 항목이 없습니다." });
      return;
    }
    const 단가미등록 = selectedRows.filter((r) => r.예상공급가액 === null);
    if (단가미등록.length > 0) {
      setBanner({
        type: "warning",
        text: `단가 미등록 의뢰서 ${단가미등록.length.toLocaleString()}건이 포함되어 있습니다. 표의 "단가" 열 ⚠️ 미등록 표시로 확인해 주세요.`,
      });
      return;
    }
    const 사업부목록 = Array.from(new Set(selectedRows.map((r) => r.사업부)));
    if (사업부목록.length > 1) {
      setBanner({ type: "warning", text: `선택한 의뢰서의 사업부가 서로 다릅니다(${사업부목록.join(", ")}). 사업부를 통일해서 선택해 주세요.` });
      return;
    }
    // 거래처명 혼합 방어 (2026-08-08) — 통합조건식 키가 (거래처명, 업무명조합)이라 거래처명이
    // 뒤섞이면 키 자체가 무의미해진다(서버도 동일하게 최종 방어선으로 검증, 사업부 혼합과 동일 관례).
    const 거래처명목록 = Array.from(new Set(selectedRows.map((r) => r.거래처명)));
    if (거래처명목록.length > 1) {
      setBanner({ type: "warning", text: `선택한 의뢰서의 거래처명이 서로 다릅니다(${거래처명목록.join(", ")}). 거래처를 통일해서 선택해 주세요.` });
      return;
    }

    setPreviewLoading(true);
    setBanner(null);
    try {
      // 업무명_목록 — 다중 업무명 규칙조회(통합조건식) 판정에 서버가 사용(2026-08-08). 서버가
      // 운영통계자료에서 재계산한 값과 다르면 400으로 막아 선택이 최신 상태인지 보장한다.
      const 업무명_목록 = Array.from(new Set(selectedRows.map((r) => r.업무명)));
      const res = await fetch("/api/invoice-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 의뢰서번호_목록: selectedRows.map((r) => r.의뢰서번호), 업무명_목록 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "error", text: data.detail ?? "미리보기 처리 중 오류가 발생했습니다." });
        return;
      }
      // 규칙목록(조건식)은 이 응답에 이미 포함되어 내려온다(2026-08-01, 별도 왕복 없이 한 번의
      // 응답으로 끝내도록 단순화).
      setPreviewData(data);
      setPreviewSeq((s) => s + 1);
      setPreviewOpen(true);
    } catch {
      setBanner({ type: "error", text: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." });
    } finally {
      setPreviewLoading(false);
    }
  }

  // 미리보기 팝업의 "확정" 클릭 시에만 실행 — 편집된 최종 품목·규칙을 받아 payload를 구성해 POST한다.
  // 공급가액은 편집 후 오른쪽 표의 실제 금액 합계 기준(편집 전 예상치가 아님).
  async function handleConfirmSubmit(edited: {
    품목_최종: 확정품목[];
    규칙: 확정규칙[];
    통합조건식_해결?: 통합조건식_해결 | null;
    통합시트명?: string;
    상단업무명?: string;
    공급가액_직접입력?: number;
    세액_직접입력?: number;
  }) {
    // 미리보기 다이얼로그가 이미 부가세오류가 있으면 "확정" 버튼을 막아두지만, 이중 안전장치로
    // 여기서도 한 번 더 막는다(작업명별 부가세 처리 방식이 섞여 판정 불가, 2026-08-04).
    if (previewData?.부가세오류) {
      setBanner({ type: "error", text: previewData.부가세오류 });
      return;
    }
    const 원본공급가액 = edited.품목_최종.reduce((s, r) => s + r.금액, 0);
    let 공급가액: number;
    let 세액: number;
    if (edited.공급가액_직접입력 != null && edited.세액_직접입력 != null) {
      // 공급가액·부가세 직접 입력(override, 2026-08-13, 마케팅팀 요청 — 원단위 절사·반올림 차이 보정).
      공급가액 = edited.공급가액_직접입력;
      세액 = edited.세액_직접입력;
    } else if (previewData?.부가세구분 === "포함") {
      // 단가에 부가세가 이미 포함된 계약은 총액을 역산해 분리한다 — billing.부가세_표시분리()와
      // 동일 규칙(2026-08-12). 예전엔 여기서 세액=0·공급가액=원시합계로 저장해 화면(미리보기)에
      // 보이는 분리 표시값과 실제 저장값이 어긋나 있었음(2026-08-13 발견·수정).
      세액 = Math.round(원본공급가액 / 11);
      공급가액 = 원본공급가액 - 세액;
    } else {
      공급가액 = Math.round(원본공급가액);
      // previewData.부가세구분은 백엔드가 실제로 청구된 작업명들 기준으로 판정해 내려준 값
      // (2026-07-28 신규, 2026-08-04 판정 기준을 거래처 기본단가 행 → 작업명 기준으로 변경).
      세액 = previewData?.부가세구분 === "별도" ? Math.round(공급가액 * 0.1) : 0;
    }
    const payload = {
      거래처명: selectedRows[0].거래처명,
      사업부: selectedRows[0].사업부,
      담당자: Array.from(new Set(selectedRows.map((r) => r.담당자))).join(", "),
      품목: Array.from(new Set(selectedRows.map((r) => r.업무명))).join(", "),
      공급가액,
      세액,
      합계: 공급가액 + 세액,
      의뢰서번호_목록: selectedRows.map((r) => r.의뢰서번호),
      // 2026-08-08 다중업무명 규칙조회 재설계 — 예전엔 대표 업무명 1개(previewData?.업무명)만
      // 규칙 저장 키로 썼는데, 이게 바로 "다른 업무명 규칙이 무시되는" 버그의 원인이었다.
      // 이제 선택된 업무명 전체를 그대로 보내고, 서버가 1개/2개 이상 여부로 개별·통합조건식을
      // 알아서 나눠 저장한다. 업무명조합_사용중·통합조건식_해결은 미리보기 응답/사용자 선택을
      // 그대로 echo — 서버가 어떤 통합조건식을 갱신할지 판단하는 근거로 쓴다.
      업무명_목록: previewData?.업무명_목록 ?? Array.from(new Set(selectedRows.map((r) => r.업무명))),
      업무명조합_사용중: previewData?.업무명조합_사용중 ?? null,
      통합조건식_해결: edited.통합조건식_해결 ?? null,
      품목_최종: edited.품목_최종,
      규칙: edited.규칙,
      // 작업구분(조)이 2개 이상일 때만 InvoicePreviewDialog가 채워 보냄(2026-08-12) — 서버가
      // 최종목록의 조 종류 수로 다시 판정해 조건이 안 맞으면 무시한다.
      통합시트명: edited.통합시트명,
      상단업무명: edited.상단업무명,
      // 공급가액·부가세 직접 입력(override, 2026-08-13) — InvoicePreviewDialog가 조정칸에 값이
      // 있을 때만 채워 보낸다. 서버가 다시 한번 유효성(조 개수·통합시트명)을 검증한다.
      공급가액_직접입력: edited.공급가액_직접입력,
      세액_직접입력: edited.세액_직접입력,
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/invoice-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setPreviewOpen(false);
        setBanner({ type: "error", text: data.detail ?? "요청 처리 중 오류가 발생했습니다." });
        return;
      }
      const 제거대상 = selected;
      setRows((prev) => prev.filter((r) => !제거대상.has(r.의뢰서번호)));
      // 조별 분할발급(2026-07-29)이면 서버가 거래명세서를 여러 건(거래명세서번호_목록) 만들고
      // 전부 같은 의뢰서번호_목록 전체를 공유한다 — 낙관적 업데이트도 의뢰서마다 그 개수만큼
      // 발행행을 만들어야 새로고침 전후로 화면이 똑같이 보인다(1건짜리 발급이면 목록 길이가 1이라
      // 기존과 동일하게 동작).
      const 번호목록: string[] = data.거래명세서번호_목록 ?? [data.거래명세서번호];
      onIssued(
        selectedRows.flatMap((r) =>
          번호목록.map((번호) => ({
            ...r,
            거래명세서번호: 번호,
            발송여부: 0,
            편집여부: data.편집여부 ?? 0,
            // 발행가능은 보통 1로 시작하지만(DB DEFAULT), 역발행 거래처면 서버가 생성 시점에 0으로
            // 시작시킨다(2026-08-24) — 이 낙관적 업데이트는 그 판정을 여기서 알 수 없어 우선 1로
            // 두고, 아래 refreshIssued()가 곧바로 정확한 값(역발행도 포함)으로 덮어쓴다.
            발행가능: 1,
            수정이력있음: Boolean(data.수정이력있음),
            합계증감: Number(data.합계증감 ?? 0),
            확정공급가액: Number(data.확정공급가액 ?? 0),
            // 역발행도 같은 이유(2026-08-24) — 거래처 단위 값이라 여기선 모르고, refreshIssued()가
            // 즉시 정확한 값으로 덮어쓴다.
            역발행: false,
            // 2026-08-23 — `...r`(원래 미발행행)의 예상공급가액은 개별 의뢰서 몫(조건식 미적용)이라
            // 발행요청목록의 거래명세서 단위 값과 스케일이 다르다. null로 두면 Tab4.tsx의
            // handleIssued가 곧바로 refreshIssued()로 정확한 값을 받아와 덮어쓴다.
            예상공급가액: null,
          }))
        )
      );
      setSelected(new Set());
      set유지기준선택(null);
      set숨김확인됨(new Set());
      setPreviewOpen(false);
      setPreviewData(null);
      setBanner({ type: "success", text: `거래명세서 요청이 완료되었습니다. (거래명세서번호: ${data.거래명세서번호})` });
    } catch {
      setPreviewOpen(false);
      setBanner({ type: "error", text: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." });
    } finally {
      setSubmitting(false);
    }
  }

  function handlePreviewClose() {
    if (submitting) return;
    setPreviewOpen(false);
    setPreviewData(null);
  }

  return (
    <>
      <InvoiceFilterSidebar filters={filters} />

      <main className="flex flex-1 flex-col">
        {/* 스크롤해도 제목·요청 버튼·선택 합계가 화면 위쪽에 계속 보이도록 sticky 처리
            (2026-07-19 사용자 요청 — 앞으로 다른 화면에도 같은 패턴 적용 예정) */}
        <div className="sticky top-0 z-10 space-y-3 border-b border-gray-200 bg-background px-6 py-4 dark:border-gray-800">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">거래명세서 관리 [미발행 목록]</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              조회 결과 {filters.base5.length.toLocaleString()}건 (전체 미발행 {rows.length.toLocaleString()}건)
            </p>
          </div>

          {banner && (
            <div className={`rounded-md border px-3 py-2 text-sm ${배너색상[banner.type]}`}>{banner.text}</div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreviewClick}
                disabled={previewLoading}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
              >
                {previewLoading ? "불러오는 중..." : "거래명세서 요청"}
              </button>
              {selectedRows.length > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  선택 취소
                </button>
              )}
            </div>
            {selectedRows.length > 0 && (
              <div className="flex flex-wrap gap-4">
                <InvoiceSelectionSummaryBar selectedRows={selectedRows} />
                {새로선택된Rows.length > 0 && (
                  <InvoiceSelectionSummaryBar selectedRows={새로선택된Rows} caption="새로 선택" />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 p-6">
          <InvoiceSelectionTable
            rows={filters.base5}
            selected={selected}
            onToggleRow={toggleRow}
            onToggleAll={toggleAll}
            onPostageChange={updatePostage}
          />

          {selectedRows.length > 0 && (
            <InvoiceDetailTable detailRows={detailRows} selectedIds={selectedRows.map((r) => r.의뢰서번호)} />
          )}
        </div>
      </main>

      <InvoicePreviewDialog
        key={previewSeq}
        open={previewOpen}
        data={previewData}
        submitting={submitting}
        onConfirm={handleConfirmSubmit}
        onClose={handlePreviewClose}
      />

      <ConfirmDialog
        open={confirmFilterChange}
        title="필터 조건이 변경되었습니다"
        message={`선택된 ${selected.size.toLocaleString()}건을 해제할까요? "선택 유지"를 누르면 화면에 안 보이는 항목도 선택 상태로 계속 유지되며, 합계에도 계속 포함됩니다.`}
        confirmLabel="선택 해제"
        cancelLabel="선택 유지"
        onConfirm={() => {
          setSelected(new Set());
          set유지기준선택(null);
          set숨김확인됨(new Set());
          setConfirmFilterChange(false);
        }}
        onClose={() => {
          // "선택 유지" — 지금 선택 상태를 기준점으로 저장해, 이 이후 새로 체크하는 항목만
          // 별도 통계표로 구분해서 보여준다(2026-08-09 사용자 요청). 지금 선택된 항목 전부를
          // "확인됨"으로 등록해, 이후 필터가 몇 번을 더 바뀌어도 같은 항목은 다시 안 묻는다(2026-08-10).
          set유지기준선택(new Set(selected));
          set숨김확인됨((prev) => new Set([...prev, ...selected]));
          setConfirmFilterChange(false);
        }}
      />
    </>
  );
}
