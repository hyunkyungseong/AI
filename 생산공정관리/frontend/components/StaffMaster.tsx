"use client";

import { useEffect, useMemo, useState } from "react";
import EditableCombo from "./EditableCombo";
import ConfirmDialog from "./ConfirmDialog";
import type { 거래처행, 운영통계행 } from "@/components/Dashboard";

type 담당거래처매핑 = { id: number; 거래처명: string; 업무명: string | null };
type 담당자행 = { id: number; 이름: string; 전화번호: string | null; 이메일: string | null; 담당거래처: 담당거래처매핑[] };

type 배너 = { type: "success" | "warning" | "error"; text: string };

const 배너색상: Record<배너["type"], string> = {
  success: "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  warning: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  error: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
};

const label = "block text-sm text-gray-700 dark:text-gray-300";
const input =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";
const th = "px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300";
const td = "px-3 py-1.5 text-gray-900 dark:text-gray-100";

// "담당자관리" 하위 탭(2026-08-11 신규) — 거래명세서 Excel 하단 담당자 연락처(이름·전화·이메일)를
// 지금까지의 템플릿 고정 텍스트 대신 자동으로 채우기 위한 마스터 데이터 화면. 사용자 확정 설계:
// "담당자 우선" 구조 — 담당자 1명 밑에 거래처+업무명을 여러 개 등록해두고, 담당자 정보(이름·전화·
// 이메일) 수정은 이 화면 한 곳에서만 하면 연결된 모든 거래처에 자동 반영된다(퇴사·번호 변경 등에
// 거래처마다 일일이 들어가서 고칠 필요가 없도록). 이 탭만 자체적으로 GET /api/staff-list를
// 불러온다(다른 탭처럼 Dashboard.tsx가 초기 데이터를 내려주지 않음 — 신규 화면이라 서버 컴포넌트
// 쪽 배선을 늘리지 않고 범위를 좁게 유지).
export default function StaffMaster({ clientRows, taskRows }: { clientRows: 거래처행[]; taskRows: 운영통계행[] }) {
  const [rows, setRows] = useState<담당자행[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<배너 | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [이름, set이름] = useState("");
  const [전화번호, set전화번호] = useState("");
  const [이메일, set이메일] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null); // null이면 신규 등록 폼
  const [submitting, setSubmitting] = useState(false);

  const [매핑거래처명, set매핑거래처명] = useState("");
  const [매핑업무명, set매핑업무명] = useState("");
  const [매핑등록중, set매핑등록중] = useState(false);

  const [삭제대상, set삭제대상] = useState<{ 종류: "담당자" | "매핑"; id: number; 라벨: string } | null>(null);

  async function 목록새로고침() {
    try {
      const res = await fetch("/api/staff-list");
      if (res.ok) setRows(await res.json());
    } catch {
      setBanner({ type: "error", text: "담당자 목록을 불러오지 못했습니다." });
    } finally {
      setLoading(false);
    }
  }

  // effect 본문에서 이름 있는 함수(목록새로고침)를 직접 호출하면 react-hooks/set-state-in-effect
  // 린트가 "그 함수 내부에서 setState를 한다"는 이유로 걸린다 — ClientMasterSection.tsx의 새로고침
  // effect와 동일하게, 익명 async IIFE로 감싸서 "콜백 안의 setState"로 인식되게 한다.
  useEffect(() => {
    (async () => {
      await 목록새로고침();
    })();
  }, []);

  const 선택된담당자 = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const 거래처명후보 = useMemo(() => clientRows.map((c) => c.거래처명).sort(), [clientRows]);
  const 업무명후보 = useMemo(() => {
    const set = new Set(taskRows.filter((t) => t.거래처명 === 매핑거래처명).map((t) => t.업무명));
    return Array.from(set).sort();
  }, [taskRows, 매핑거래처명]);

  function openCreate() {
    setEditingId(null);
    set이름("");
    set전화번호("");
    set이메일("");
  }
  function openEdit(row: 담당자행) {
    setEditingId(row.id);
    set이름(row.이름);
    set전화번호(row.전화번호 ?? "");
    set이메일(row.이메일 ?? "");
  }

  async function handleSaveStaff() {
    const 이름_trim = 이름.trim();
    if (!이름_trim) {
      setBanner({ type: "warning", text: "이름은 필수입니다." });
      return;
    }
    setSubmitting(true);
    setBanner(null);
    try {
      const body = { 이름: 이름_trim, 전화번호: 전화번호.trim() || null, 이메일: 이메일.trim() || null };
      const res =
        editingId === null
          ? await fetch("/api/staff-create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            })
          : await fetch("/api/staff-update", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: editingId, ...body }),
            });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({ type: "error", text: data.detail ?? "저장 중 오류가 발생했습니다." });
        return;
      }
      setBanner({ type: "success", text: `'${이름_trim}' 담당자가 저장되었습니다.` });
      openCreate();
      await 목록새로고침();
    } catch {
      setBanner({ type: "error", text: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddMapping() {
    if (!선택된담당자) return;
    const 거래처명_trim = 매핑거래처명.trim();
    if (!거래처명_trim) {
      setBanner({ type: "warning", text: "거래처명을 선택해 주세요." });
      return;
    }
    set매핑등록중(true);
    setBanner(null);
    try {
      const res = await fetch("/api/staff-mapping-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 담당자_id: 선택된담당자.id, 거래처명: 거래처명_trim, 업무명: 매핑업무명.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({ type: "error", text: data.detail ?? "등록 중 오류가 발생했습니다." });
        return;
      }
      set매핑거래처명("");
      set매핑업무명("");
      await 목록새로고침();
    } catch {
      setBanner({ type: "error", text: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." });
    } finally {
      set매핑등록중(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!삭제대상) return;
    const { 종류, id } = 삭제대상;
    set삭제대상(null);
    try {
      const res = await fetch(종류 === "담당자" ? "/api/staff-delete" : "/api/staff-mapping-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: [id] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({ type: "error", text: data.detail ?? "삭제 중 오류가 발생했습니다." });
        return;
      }
      if (종류 === "담당자" && selectedId === id) setSelectedId(null);
      setBanner({ type: "success", text: "삭제되었습니다." });
      await 목록새로고침();
    } catch {
      setBanner({ type: "error", text: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." });
    }
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="sticky top-0 z-10 space-y-3 border-b border-gray-200 bg-background px-6 py-4 dark:border-gray-800">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">거래처 마스터 [담당자관리]</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            거래명세서 하단에 표시되는 당사 담당자 연락처를 거래처+업무명별로 등록합니다. 등록해두면
            발급 시 자동으로 표기되고, 담당자 정보를 수정하면 연결된 모든 거래처에 반영됩니다.
          </p>
        </div>
        {banner && <div className={`rounded-md border px-3 py-2 text-sm ${배너색상[banner.type]}`}>{banner.text}</div>}
      </div>

      <div className="grid flex-1 grid-cols-2 gap-4 overflow-hidden p-6">
        {/* 왼쪽: 담당자 목록 + 등록/수정 폼 */}
        <div className="flex flex-col overflow-hidden">
          <h3 className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
            담당자 목록 {loading ? "(불러오는 중...)" : `(${rows.length}명)`}
          </h3>
          <div className="min-h-0 flex-1 overflow-auto rounded-md border border-gray-200 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className={th}>이름</th>
                  <th className={th}>전화번호</th>
                  <th className={th}>이메일</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`cursor-pointer border-t border-gray-100 dark:border-gray-800 ${
                      selectedId === r.id ? "bg-gray-100 dark:bg-gray-800" : ""
                    }`}
                  >
                    <td className={td}>{r.이름}</td>
                    <td className={td}>{r.전화번호 || "—"}</td>
                    <td className={td}>{r.이메일 || "—"}</td>
                    <td className={td}>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(r);
                          }}
                          className="text-xs text-blue-700 hover:underline dark:text-blue-400"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            set삭제대상({ 종류: "담당자", id: r.id, 라벨: r.이름 });
                          }}
                          className="text-xs text-red-600 hover:underline dark:text-red-400"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                      등록된 담당자가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {editingId === null ? "+ 신규 담당자" : "담당자 수정"}
            </h4>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <label className={label}>
                이름
                <input type="text" value={이름} onChange={(e) => set이름(e.target.value)} className={input} />
              </label>
              <label className={label}>
                전화번호
                <input
                  type="text"
                  value={전화번호}
                  onChange={(e) => set전화번호(e.target.value)}
                  placeholder="010-0000-0000"
                  className={input}
                />
              </label>
              <label className={label}>
                이메일
                <input type="text" value={이메일} onChange={(e) => set이메일(e.target.value)} className={input} />
              </label>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              {editingId !== null && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  취소
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveStaff}
                disabled={submitting}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
              >
                {editingId === null ? "등록" : "저장"}
              </button>
            </div>
          </div>
        </div>

        {/* 오른쪽: 선택한 담당자의 담당 거래처+업무명 */}
        <div className="flex flex-col overflow-hidden">
          <h3 className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
            {선택된담당자 ? `${선택된담당자.이름} 담당 거래처` : "왼쪽에서 담당자를 선택하세요"}
          </h3>
          {선택된담당자 && (
            <>
              <div className="min-h-0 flex-1 overflow-auto rounded-md border border-gray-200 dark:border-gray-800">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className={th}>거래처명</th>
                      <th className={th}>업무명</th>
                      <th className={th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {선택된담당자.담당거래처.map((m) => (
                      <tr key={m.id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className={td}>{m.거래처명}</td>
                        <td className={td}>{m.업무명 || <span className="text-gray-400">전체(기본)</span>}</td>
                        <td className={td}>
                          <button
                            type="button"
                            onClick={() =>
                              set삭제대상({ 종류: "매핑", id: m.id, 라벨: `${m.거래처명}${m.업무명 ? " · " + m.업무명 : ""}` })
                            }
                            className="text-xs text-red-600 hover:underline dark:text-red-400"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                    {선택된담당자.담당거래처.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                          등록된 담당 거래처가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 rounded-md border border-gray-200 p-3 dark:border-gray-700">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400">+ 담당 거래처 추가</h4>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className={label}>
                    거래처명
                    <EditableCombo
                      value={매핑거래처명}
                      onChange={(v) => {
                        set매핑거래처명(v);
                        set매핑업무명("");
                      }}
                      options={거래처명후보}
                      className={input}
                      aria-label="거래처명"
                    />
                  </label>
                  <label className={label}>
                    업무명 <span className="text-gray-400">— 비우면 거래처 전체 기본</span>
                    <EditableCombo
                      value={매핑업무명}
                      onChange={set매핑업무명}
                      options={업무명후보}
                      className={input}
                      aria-label="업무명"
                    />
                  </label>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddMapping}
                    disabled={매핑등록중}
                    className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
                  >
                    추가
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!삭제대상}
        title={삭제대상?.종류 === "담당자" ? "담당자 삭제 확인" : "담당 거래처 삭제 확인"}
        message={
          삭제대상?.종류 === "담당자"
            ? `'${삭제대상?.라벨}' 담당자를 삭제하시겠습니까? 등록된 담당 거래처도 함께 삭제됩니다.`
            : `'${삭제대상?.라벨}' 매핑을 삭제하시겠습니까?`
        }
        danger
        dangerText="삭제 후 복구할 수 없습니다."
        onConfirm={handleDeleteConfirmed}
        onClose={() => set삭제대상(null)}
      />
    </main>
  );
}
