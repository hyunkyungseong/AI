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
  const filterKey = JSON.stringify([filters.사업부, filters.시작일, filters.종료일, filters.담당자, filters.거래처, filters.업무명]);
  useResetOnFilterChange(filterKey, () => {
    if (selected.size > 0) setConfirmFilterChange(true);
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
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of filters.base5) {
          if (checked) next.add(r.의뢰서번호);
          else next.delete(r.의뢰서번호);
        }
        return next;
      });
    },
    [filters.base5]
  );

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
  async function handleConfirmSubmit(edited: { 품목_최종: 확정품목[]; 규칙: 확정규칙[]; 통합조건식_해결?: 통합조건식_해결 | null }) {
    // 미리보기 다이얼로그가 이미 부가세오류가 있으면 "확정" 버튼을 막아두지만, 이중 안전장치로
    // 여기서도 한 번 더 막는다(작업명별 부가세 처리 방식이 섞여 판정 불가, 2026-08-04).
    if (previewData?.부가세오류) {
      setBanner({ type: "error", text: previewData.부가세오류 });
      return;
    }
    const 공급가액 = Math.round(edited.품목_최종.reduce((s, r) => s + r.금액, 0));
    // 거래처가 "포함"(단가에 부가세가 이미 포함된 계약)이면 세액을 추가로 더하지 않는다 —
    // previewData.부가세구분은 백엔드가 실제로 청구된 작업명들 기준으로 판정해 내려준 값
    // (2026-07-28 신규, 2026-08-04 판정 기준을 거래처 기본단가 행 → 작업명 기준으로 변경).
    const 세액 = previewData?.부가세구분 === "별도" ? Math.round(공급가액 * 0.1) : 0;
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
          }))
        )
      );
      setSelected(new Set());
      set유지기준선택(null);
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
            <button
              type="button"
              onClick={handlePreviewClick}
              disabled={previewLoading}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
            >
              {previewLoading ? "불러오는 중..." : "거래명세서 요청"}
            </button>
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
          setConfirmFilterChange(false);
        }}
        onClose={() => {
          // "선택 유지" — 지금 선택 상태를 기준점으로 저장해, 이 이후 새로 체크하는 항목만
          // 별도 통계표로 구분해서 보여준다(2026-08-09 사용자 요청).
          set유지기준선택(new Set(selected));
          setConfirmFilterChange(false);
        }}
      />
    </>
  );
}
