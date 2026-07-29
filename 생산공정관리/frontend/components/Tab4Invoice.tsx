"use client";

import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import InvoiceFilterSidebar from "./InvoiceFilterSidebar";
import InvoiceSelectionTable from "./InvoiceSelectionTable";
import InvoiceSelectionSummaryBar from "./InvoiceSelectionSummaryBar";
import InvoiceDetailTable from "./InvoiceDetailTable";
import InvoicePreviewDialog from "./InvoicePreviewDialog";
import type { 미리보기결과, 확정품목, 확정규칙 } from "./InvoicePreviewDialog";
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
  // 필터(사업부·기간·담당자·거래처·업무명)가 바뀌면 이전 선택을 자동 초기화 — 화면에 안 보이는
  // 이전 선택이 남아 집계표만 안 맞아 보이는 혼선 방지(2026-07-24 사용자 제보 후 확정: 여러
  // 필터를 오가며 선택을 이어가는 기능보다 "화면과 집계표가 항상 일치"하는 쪽을 우선함).
  const filterKey = JSON.stringify([filters.사업부, filters.시작일, filters.종료일, filters.담당자, filters.거래처, filters.업무명]);
  useResetOnFilterChange(filterKey, () => setSelected(new Set()));
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

  // 검증·요청 payload는 화면에 보이는 filters.base5가 아니라 rows(전체) 기준으로 계산한다 — 위
  // useResetOnFilterChange로 필터가 바뀌면 선택이 항상 초기화되므로 실질적으로는 같은 값이지만,
  // 요청 처리 자체는 필터와 무관하게 선택된 실제 항목 기준으로 계산하는 게 원칙적으로 맞다.
  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.의뢰서번호)), [rows, selected]);

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

    setPreviewLoading(true);
    setBanner(null);
    try {
      const res = await fetch("/api/invoice-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 의뢰서번호_목록: selectedRows.map((r) => r.의뢰서번호) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "error", text: data.detail ?? "미리보기 처리 중 오류가 발생했습니다." });
        return;
      }
      // 이 거래처+업무명에 저장된 재사용 규칙을 함께 불러와 오른쪽 표 초안에 반영
      // (2026-07-22, [거래명세서편집_규칙엔진]) — 규칙적용결과와 순서가 1:1로 대응된다는
      // 전제로 InvoicePreviewDialog가 인덱스로 조건을 매칭한다.
      try {
        const rulesRes = await fetch(
          `/api/billing-rules?거래처명=${encodeURIComponent(data.거래처명)}&업무명=${encodeURIComponent(data.업무명)}`
        );
        if (rulesRes.ok) {
          data.규칙목록 = await rulesRes.json();
        }
      } catch {
        // 규칙 조회 실패는 치명적이지 않음 — 규칙 없이 시작(사용자가 직접 만들면 됨)
      }
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
  async function handleConfirmSubmit(edited: { 품목_최종: 확정품목[]; 규칙: 확정규칙[] }) {
    const 공급가액 = Math.round(edited.품목_최종.reduce((s, r) => s + r.금액, 0));
    // 거래처가 "포함"(단가에 부가세가 이미 포함된 계약)이면 세액을 추가로 더하지 않는다 —
    // previewData.부가세구분은 백엔드가 거래처 기본단가 행을 조회해 내려준 값(2026-07-28).
    const 세액 = previewData?.부가세구분 === "포함" ? 0 : Math.round(공급가액 * 0.1);
    const payload = {
      거래처명: selectedRows[0].거래처명,
      사업부: selectedRows[0].사업부,
      담당자: Array.from(new Set(selectedRows.map((r) => r.담당자))).join(", "),
      품목: Array.from(new Set(selectedRows.map((r) => r.업무명))).join(", "),
      공급가액,
      세액,
      합계: 공급가액 + 세액,
      의뢰서번호_목록: selectedRows.map((r) => r.의뢰서번호),
      업무명: previewData?.업무명 ?? selectedRows[0].업무명,
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
      onIssued(
        selectedRows.map((r) => ({
          ...r,
          거래명세서번호: data.거래명세서번호,
          발송여부: 0,
          편집여부: data.편집여부 ?? 0,
        }))
      );
      setSelected(new Set());
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
            {selectedRows.length > 0 && <InvoiceSelectionSummaryBar selectedRows={selectedRows} />}
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
    </>
  );
}
