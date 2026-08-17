"use client";

import { useCallback, useMemo, useState } from "react";
import PricingMasterTable from "./PricingMasterTable";
import PricingFormDialog from "./PricingFormDialog";
import ConfirmDialog from "./ConfirmDialog";
import type { 거래처행, 단가행, 운영통계행, 자재단가행 } from "@/components/Dashboard";

type 배너 = { type: "success" | "warning" | "error"; text: string };

const 배너색상: Record<배너["type"], string> = {
  success: "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  warning: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  error: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
};

function 정렬(rows: 단가행[]): 단가행[] {
  return [...rows].sort(
    (a, b) =>
      a.거래처명.localeCompare(b.거래처명) || a.업무명.localeCompare(b.업무명) || a.작업명.localeCompare(b.작업명)
  );
}

// "단가관리" 하위 화면 오케스트레이터 — ClientMaster.tsx와 동일한 골격(로컬 state 단독 소유,
// 성공 시 로컬 배열만 갱신, formKey 리마운트로 폼 초기화). 차이점: 거래처를 하나 먼저 선택해야
// 그 거래처의 단가만 보이고 추가할 수 있다(Streamlit 원본과 동일한 스코프 — 전체를 한 표에 다
// 보여주면 항목이 너무 많아짐). 선택/삭제는 id(number) 기준(거래처명은 PK가 아니라 중복 가능).
export default function PricingMaster({
  rows: initialRows,
  clientRows,
  taskRows,
}: {
  rows: 단가행[];
  clientRows: 거래처행[];
  taskRows: 운영통계행[];
}) {
  const [prices, setPrices] = useState<단가행[]>(initialRows);
  const [selectedClient, setSelectedClient] = useState(() => clientRows[0]?.거래처명 ?? "");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [banner, setBanner] = useState<배너 | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<단가행 | null>(null);
  const [formKey, setFormKey] = useState(0);
  // 방금 "새 단가 추가"를 저장하고 바로 수정모드로 넘어온 경우에만 true — 자재별 단가를 등록하라는
  // 안내를 다이얼로그 안에 눈에 띄게 보여주기 위함(2026-08-16 사용자 요청). 다른 경로로 수정을
  // 열면(목록에서 "수정" 클릭) false.
  const [justCreated, setJustCreated] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const scopedPrices = useMemo(
    () => prices.filter((p) => p.거래처명 === selectedClient),
    [prices, selectedClient]
  );
  const selectedRows = useMemo(() => scopedPrices.filter((p) => selected.has(p.id)), [scopedPrices, selected]);

  function handleClientChange(next: string) {
    setSelectedClient(next);
    setSelected(new Set());
    setBanner(null);
  }

  const toggleRow = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) => {
      setSelected(checked ? new Set(scopedPrices.map((p) => p.id)) : new Set());
    },
    [scopedPrices]
  );

  function openCreate() {
    setFormMode("create");
    setEditing(null);
    setJustCreated(false);
    setFormOpen(true);
    setFormKey((k) => k + 1);
  }

  function openEdit(row: 단가행) {
    setFormMode("edit");
    setEditing(row);
    setJustCreated(false);
    setFormOpen(true);
    setFormKey((k) => k + 1);
  }

  function handleCreated(row: 단가행) {
    setPrices((prev) => 정렬([...prev, row]));
    // 창을 닫지 않고 그대로 수정모드로 전환 — 자재별 단가는 이 행의 id가 있어야 등록할 수 있어서
    // (POST /단가마스터/{id}/자재단가), 저장 직후 바로 이어서 등록할 수 있게 함(2026-08-16 사용자
    // 요청 — 예전엔 "저장 → 창 닫힘 → 목록에서 다시 수정 클릭"까지 해야 했음). formKey를 올려
    // 다이얼로그를 리마운트해야 mode="edit"·initial=row로 내부 상태가 새로 초기화된다(openEdit()과
    // 동일한 패턴).
    setFormMode("edit");
    setEditing(row);
    setJustCreated(true);
    setFormKey((k) => k + 1);
    setBanner({ type: "success", text: "단가가 등록되었습니다." });
  }

  function handleUpdated(
    id: number,
    patch: Pick<
      단가행,
      | "출력단가"
      | "봉입단가"
      | "추가봉입단가"
      | "동봉물삽입단가"
      | "용지제작단가"
      | "봉투제작단가"
      | "삽지제작단가"
      | "각대대봉투단가"
      | "각대대봉투봉입단가"
      | "부가세구분"
      | "인쇄면"
      | "비고"
      | "수정일"
    >
  ) {
    setPrices((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setFormOpen(false);
    setBanner({ type: "success", text: "단가가 수정되었습니다." });
  }

  function handleMaterialPricesChanged(id: number, 자재단가목록: 자재단가행[]) {
    setPrices((prev) => prev.map((p) => (p.id === id ? { ...p, 자재단가목록 } : p)));
    // 폼을 열어둔 채로 목록만 갱신되므로(PricingMaterialSection이 자체적으로 서버 반영 후 호출),
    // 다이얼로그에 다시 넘겨줄 editing도 함께 최신화해 재열람 시 최신 목록이 보이게 한다.
    setEditing((prev) => (prev && prev.id === id ? { ...prev, 자재단가목록 } : prev));
  }

  function handleDeleteClick() {
    if (selectedRows.length === 0) {
      setBanner({ type: "warning", text: "선택된 항목이 없습니다." });
      return;
    }
    setConfirmOpen(true);
  }

  async function handleDeleteConfirmed() {
    setConfirmOpen(false);
    setDeleting(true);
    setBanner(null);
    try {
      const res = await fetch("/api/pricing-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedRows.map((r) => r.id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({ type: "error", text: data.detail ?? "삭제 중 오류가 발생했습니다." });
        return;
      }
      const 삭제대상 = selected;
      setPrices((prev) => prev.filter((p) => !삭제대상.has(p.id)));
      setSelected(new Set());
      setBanner({ type: "success", text: "선택한 단가가 삭제되었습니다." });
    } catch {
      setBanner({ type: "error", text: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." });
    } finally {
      setDeleting(false);
    }
  }

  const 항목라벨 = (r: 단가행) => `${r.업무명 || "(기본단가)"} · ${r.작업명 || "(기본단가)"}`;
  const 확인메시지 =
    selectedRows.length === 1
      ? `'${항목라벨(selectedRows[0])}' 단가를 삭제하시겠습니까?`
      : `선택한 ${selectedRows.length}건의 단가를 삭제하시겠습니까?`;

  if (clientRows.length === 0) {
    return (
      <main className="flex flex-1 flex-col p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">먼저 “거래처관리”에서 거래처를 등록해 주세요.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="sticky top-0 z-10 space-y-3 border-b border-gray-200 bg-background px-6 py-4 dark:border-gray-800">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">거래처 마스터 [단가관리]</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {selectedClient} 단가 {scopedPrices.length.toLocaleString()}건
          </p>
        </div>

        {banner && <div className={`rounded-md border px-3 py-2 text-sm ${배너색상[banner.type]}`}>{banner.text}</div>}

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedClient}
            onChange={(e) => handleClientChange(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          >
            {clientRows.map((c) => (
              <option key={c.거래처명} value={c.거래처명}>
                {c.거래처명}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            + 새 단가 추가
          </button>
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={deleting}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          >
            선택 삭제
          </button>
        </div>
      </div>

      <div className="p-6">
        <PricingMasterTable
          rows={scopedPrices}
          selected={selected}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
          onEdit={openEdit}
        />
      </div>

      <PricingFormDialog
        key={formKey}
        open={formOpen}
        mode={formMode}
        justCreated={justCreated}
        거래처명={selectedClient}
        initial={editing}
        taskRows={taskRows}
        onClose={() => setFormOpen(false)}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
        onMaterialPricesChanged={handleMaterialPricesChanged}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="단가 삭제 확인"
        message={확인메시지}
        items={selectedRows.length > 1 ? selectedRows.map(항목라벨) : undefined}
        danger
        dangerText="삭제 후 복구할 수 없습니다."
        onConfirm={handleDeleteConfirmed}
        onClose={() => setConfirmOpen(false)}
      />
    </main>
  );
}
