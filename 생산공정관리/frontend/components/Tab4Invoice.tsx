"use client";

import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import InvoiceFilterSidebar from "./InvoiceFilterSidebar";
import InvoiceSelectionTable from "./InvoiceSelectionTable";
import InvoiceSelectionSummaryBar from "./InvoiceSelectionSummaryBar";
import InvoiceDetailTable from "./InvoiceDetailTable";
import InvoicePreviewDialog from "./InvoicePreviewDialog";
import type { 미리보기결과 } from "./InvoicePreviewDialog";
import { useInvoiceFilters } from "@/lib/useInvoiceFilters";
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
  const [banner, setBanner] = useState<배너 | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // 미리보기 팝업(2026-07-20 신규) — "거래명세서 요청" 클릭 시 바로 저장하지 않고 먼저 이 상태를
  // 채워 InvoicePreviewDialog를 띄운다. 실제 저장(POST /api/invoice-request)은 그 팝업의
  // "확정" 클릭(handleConfirmSubmit)에서만 일어난다.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<미리보기결과 | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // 검증·요청 payload는 화면에 보이는 filters.base5가 아니라 rows(전체) 기준으로 계산한다 —
  // 필터를 바꿔도 이미 체크한 항목의 선택은 유지되므로, 화면에 안 보이는 선택 항목도 포함돼야 한다.
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
        text: `단가 미등록 의뢰서가 포함되어 있습니다: ${단가미등록.map((r) => r.의뢰서번호).join(", ")}`,
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
      setPreviewData(data);
      setPreviewOpen(true);
    } catch {
      setBanner({ type: "error", text: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." });
    } finally {
      setPreviewLoading(false);
    }
  }

  // 미리보기 팝업의 "확정" 클릭 시에만 실행 — 기존 handleRequest()의 payload 구성·POST·후처리를
  // 그대로 옮긴 것으로, 저장 이후 동작(목록 반영·배너)은 이전과 동일하다.
  async function handleConfirmSubmit() {
    const 공급가액 = selectedRows.reduce((s, r) => s + (r.예상공급가액 ?? 0), 0);
    const 세액 = Math.round(공급가액 * 0.1);
    const payload = {
      거래처명: selectedRows[0].거래처명,
      사업부: selectedRows[0].사업부,
      담당자: Array.from(new Set(selectedRows.map((r) => r.담당자))).join(", "),
      품목: Array.from(new Set(selectedRows.map((r) => r.업무명))).join(", "),
      공급가액,
      세액,
      합계: 공급가액 + 세액,
      의뢰서번호_목록: selectedRows.map((r) => r.의뢰서번호),
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
      onIssued(selectedRows.map((r) => ({ ...r, 거래명세서번호: data.거래명세서번호, 발송여부: 0 })));
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
        open={previewOpen}
        data={previewData}
        submitting={submitting}
        onConfirm={handleConfirmSubmit}
        onClose={handlePreviewClose}
      />
    </>
  );
}
