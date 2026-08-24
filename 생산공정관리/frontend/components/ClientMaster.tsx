"use client";

import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import ClientMasterTable from "./ClientMasterTable";
import ClientFormDialog from "./ClientFormDialog";
import ConfirmDialog from "./ConfirmDialog";
import type { 거래처행, 운영통계행 } from "@/components/Dashboard";

type 배너 = { type: "success" | "warning" | "error"; text: string };

const 배너색상: Record<배너["type"], string> = {
  success: "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  warning: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  error: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
};

// "거래처 마스터" 탭 오케스트레이터 — rows/setRows는 Dashboard.tsx가 소유한 controlled state
// (2026-08-09, Tab4Invoice.tsx의 rows/setRows와 동일한 패턴으로 변경) — "단가관리" 하위 탭
// (PricingMaster.tsx)도 같은 clientRows를 보고 있어서, 여기서만 로컬 사본을 갱신하면 신규 등록한
// 거래처가 단가관리 화면의 거래처 선택 목록에 안 보이는 버그가 있었다. 생성/수정/삭제 성공 시
// 서버 재조회 없이 이 공용 배열만 갱신한다(Tab4Invoice.tsx가 거래명세서 요청 성공 후 처리하는 방식과 동일).
export default function ClientMaster({
  rows,
  setRows,
  taskRows,
}: {
  rows: 거래처행[];
  setRows: Dispatch<SetStateAction<거래처행[]>>;
  taskRows: 운영통계행[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [banner, setBanner] = useState<배너 | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<거래처행 | null>(null);
  // 열 때마다 증가시켜 ClientFormDialog에 key로 넘김 — 대상이 바뀔 때마다 리마운트시켜
  // 입력값을 초기화한다(useEffect 재동기화 대신 key 기반 리셋 패턴, ClientFormDialog.tsx 참고).
  const [formKey, setFormKey] = useState(0);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selectedRows = useMemo(() => rows.filter((c) => selected.has(c.거래처명)), [rows, selected]);

  const toggleRow = useCallback((거래처명: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(거래처명)) next.delete(거래처명);
      else next.add(거래처명);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) => {
      setSelected(checked ? new Set(rows.map((c) => c.거래처명)) : new Set());
    },
    [rows]
  );

  function openCreate() {
    setFormMode("create");
    setEditing(null);
    setFormOpen(true);
    setFormKey((k) => k + 1);
  }

  function openEdit(row: 거래처행) {
    setFormMode("edit");
    setEditing(row);
    setFormOpen(true);
    setFormKey((k) => k + 1);
  }

  function handleCreated(row: 거래처행) {
    setRows((prev) => [...prev, row].sort((a, b) => a.거래처명.localeCompare(b.거래처명)));
    setFormOpen(false);
    setBanner({ type: "success", text: `'${row.거래처명}' 거래처가 등록되었습니다.` });
  }

  function handleUpdated(
    거래처명: string,
    patch: Pick<거래처행, "사업자등록번호" | "수신이메일" | "비고" | "역발행" | "수정일">
  ) {
    setRows((prev) => prev.map((c) => (c.거래처명 === 거래처명 ? { ...c, ...patch } : c)));
    setFormOpen(false);
    setBanner({ type: "success", text: `'${거래처명}' 거래처가 수정되었습니다.` });
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
      const res = await fetch("/api/client-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 거래처명: selectedRows.map((r) => r.거래처명) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({ type: "error", text: data.detail ?? "삭제 중 오류가 발생했습니다." });
        return;
      }
      const 삭제대상 = selected;
      setRows((prev) => prev.filter((c) => !삭제대상.has(c.거래처명)));
      setSelected(new Set());
      setBanner({ type: "success", text: "선택한 거래처가 삭제되었습니다." });
    } catch {
      setBanner({ type: "error", text: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." });
    } finally {
      setDeleting(false);
    }
  }

  const 확인메시지 =
    selectedRows.length === 1
      ? `'${selectedRows[0].거래처명}' 거래처를 삭제하시겠습니까?`
      : `선택한 ${selectedRows.length}개 거래처를 삭제하시겠습니까?`;

  return (
    <main className="flex flex-1 flex-col">
      <div className="sticky top-0 z-10 space-y-3 border-b border-gray-200 bg-background px-6 py-4 dark:border-gray-800">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">거래처 마스터 [거래처관리]</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">등록된 거래처 {rows.length.toLocaleString()}건</p>
        </div>

        {banner && <div className={`rounded-md border px-3 py-2 text-sm ${배너색상[banner.type]}`}>{banner.text}</div>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            + 신규 거래처 추가
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
        <ClientMasterTable
          rows={rows}
          selected={selected}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
          onEdit={openEdit}
        />
      </div>

      <ClientFormDialog
        key={formKey}
        open={formOpen}
        mode={formMode}
        initial={editing}
        clientRows={rows}
        taskRows={taskRows}
        onClose={() => setFormOpen(false)}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="거래처 삭제 확인"
        message={확인메시지}
        items={selectedRows.length > 1 ? selectedRows.map((r) => r.거래처명) : undefined}
        danger
        dangerText="삭제 후 복구할 수 없습니다."
        onConfirm={handleDeleteConfirmed}
        onClose={() => setConfirmOpen(false)}
      />
    </main>
  );
}
