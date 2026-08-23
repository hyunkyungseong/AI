"use client";

import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import InvoiceFilterSidebar from "./InvoiceFilterSidebar";
import InvoiceIssuedLevel1Table from "./InvoiceIssuedLevel1Table";
import InvoiceIssuedLevel2Table, { 레벨2키 } from "./InvoiceIssuedLevel2Table";
import InvoiceDetailTable from "./InvoiceDetailTable";
import ConfirmDialog from "./ConfirmDialog";
import InvoiceHistoryDialog from "./InvoiceHistoryDialog";
import { useIssuedFilters } from "@/lib/useIssuedFilters";
import { useResetOnFilterChange } from "@/lib/useFilters";
import { build레벨1그룹 } from "@/lib/issuedGrouping";
import type { 발행행, 미발행행, 운영통계행 } from "./Dashboard";

type 배너 = { type: "success" | "warning" | "error"; text: string };

const 배너색상: Record<배너["type"], string> = {
  success: "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  warning: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  error: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
};

type PendingAction =
  | { kind: "publish" | "unpublish"; targetNumbers: string[] }
  | { kind: "cancel"; targetRows: 발행행[] };

type DialogState = {
  open: boolean;
  title: string;
  message: string;
  items: string[];
  danger: boolean;
  action: PendingAction | null;
};

const 다이얼로그_초기값: DialogState = {
  open: false,
  title: "",
  message: "",
  items: [],
  danger: false,
  action: null,
};

// 탭4 "발행요청목록"(mode="대기")·"발행완료"(mode="완료") 공용 오케스트레이터 — Streamlit
// _render_발행_섹션(발송여부_target, key_prefix, action_mode)에 대응. rows/setRows는 Tab4.tsx가
// 소유한 발행행[] 전체(대기+완료 둘 다 포함)를 그대로 받아 이 컴포넌트가 mode로 다시 걸러 쓴다 —
// 그래야 "발행" 액션 한 번으로 대기 쪽에서 사라지고 완료 쪽에 나타나는 게 새로고침 없이 즉시 반영된다.
export default function Tab4IssuedList({
  mode,
  rows,
  setRows,
  detailRows,
  onReturnToUnissued,
}: {
  mode: "대기" | "완료";
  rows: 발행행[];
  setRows: Dispatch<SetStateAction<발행행[]>>;
  detailRows: 운영통계행[];
  onReturnToUnissued: (반환: 미발행행[]) => void;
}) {
  const scoped = useMemo(() => rows.filter((r) => r.발송여부 === (mode === "대기" ? 0 : 1)), [rows, mode]);
  const filters = useIssuedFilters(scoped);
  const groups = useMemo(() => build레벨1그룹(filters.base5), [filters.base5]);

  const [selected1, setSelected1] = useState<Set<string>>(new Set());
  const [selected2, setSelected2] = useState<Set<string>>(new Set());
  // 필터(사업부·기간·담당자·거래처·업무명)가 바뀌면 레벨1·레벨2 선택을 함께 초기화 — 화면에
  // 안 보이는 이전 선택이 남아 집계표만 안 맞아 보이는 혼선 방지(2026-07-24 사용자 제보,
  // Tab4Invoice.tsx와 동일 패턴).
  const filterKey = JSON.stringify([filters.사업부, filters.시작일, filters.종료일, filters.담당자, filters.거래처, filters.업무명]);
  useResetOnFilterChange(filterKey, () => {
    setSelected1(new Set());
    setSelected2(new Set());
  });
  const [banner, setBanner] = useState<배너 | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(다이얼로그_초기값);
  // 취소·발행취소(되돌리기) 사유 입력(2026-08-14) — 다이얼로그를 열 때마다 초기화, 발행취소는 필수.
  const [reason, setReason] = useState("");
  // "편집됨" 배지 클릭 시 원본/최종 비교 팝업(2026-07-22 신규) — null이면 닫힘, 값이 있으면
  // InvoiceHistoryDialog를 그 거래명세서번호로 마운트한다(ConditionRuleModal.tsx와 동일하게
  // 부모의 조건부 렌더링으로 열림/닫힘을 제어 — set-state-in-effect 린트 회피 패턴).
  const [historyTarget, setHistoryTarget] = useState<string | null>(null);

  // 레벨1 선택이 바뀌면(체크·전체선택 무관) 레벨2 선택은 항상 초기화한다 — 레벨1이 바뀌면
  // 레벨2가 다른 대상 집합이 되므로 Streamlit(레벨2 key에 sorted(선택_idx_1) 포함)과 동일한 동작.
  const toggleGroup = useCallback((key: string) => {
    setSelected1((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSelected2(new Set());
  }, []);

  const toggleAllGroups = useCallback(
    (checked: boolean) => {
      setSelected1(checked ? new Set(groups.map((g) => g.key)) : new Set());
      setSelected2(new Set());
    },
    [groups]
  );

  // 선택(레벨1)에 발행가능=0(거래처 승인 대기 중)인 건이 하나라도 섞여 있으면 "거래명세서 발행"
  // 버튼을 비활성화한다(2026-08-12) — 체크·취소는 그대로 가능하게 두고, 실제 발행만 막는다.
  // (체크박스 자체를 막으면 "취소"도 함께 막혀버려서 이 방식으로 변경.)
  const 선택에_승인대기_포함 = useMemo(
    () => groups.some((g) => selected1.has(g.key) && g.발행가능 === 0),
    [groups, selected1]
  );

  // 레벨1에서 체크된 그룹(거래명세서번호 단위, 2026-08-01)에 속하는 의뢰서(운영통계자료 원본
  // 라인이 아니라 발행행 단위) 목록. 반드시 filters.base5(레벨1 집계와 동일한 필터 적용된 소스)에서
  // 걸러야 한다 — scoped(필터 미적용 전체)에서 걸렀더니, 레벨1 합계는 필터링된 일부만 더하는데
  // 레벨2 상세는 필터와 무관하게 그 거래명세서번호에 속한 전체가 나와버려서 "레벨1 합계 ≠ 레벨2
  // 항목 합"이 되는 버그가 있었다(2026-07-22 실사용 중 발견 — 발행완료 화면 봉입건수가 실제와
  // 다르게 보인다는 제보).
  const level2Rows = useMemo(
    () => filters.base5.filter((r) => selected1.has(r.거래명세서번호)),
    [filters.base5, selected1]
  );

  const toggleRow2 = useCallback((의뢰서번호: string) => {
    setSelected2((prev) => {
      const next = new Set(prev);
      if (next.has(의뢰서번호)) next.delete(의뢰서번호);
      else next.add(의뢰서번호);
      return next;
    });
  }, []);

  const toggleAllRow2 = useCallback(
    (checked: boolean) => {
      setSelected2(checked ? new Set(level2Rows.map(레벨2키)) : new Set());
    },
    [level2Rows]
  );

  function closeDialog() {
    setDialog(다이얼로그_초기값);
  }

  // "거래명세서 발행"/"발행 취소(되돌리기)" — 발송여부는 거래명세서번호 전체에 대한 단일 컬럼이라
  // 체크한 (거래명세서번호,업무명) 그룹이 속한 번호 전체에 항상 적용된다(구조적 제약). 체크한 몫보다
  // 그 번호에 실제 걸린 의뢰서가 더 많으면 "함께 처리됩니다" 안내를 보여준다.
  function handleStatusChangeClick(kind: "publish" | "unpublish") {
    if (selected1.size === 0) {
      setBanner({ type: "warning", text: "선택된 항목이 없습니다." });
      return;
    }
    const selectedGroups = groups.filter((g) => selected1.has(g.key));
    const targetNumbers = Array.from(new Set(selectedGroups.map((g) => g.거래명세서번호)));
    const items: string[] = [];
    for (const no of targetNumbers) {
      const 전체 = rows.filter((r) => r.거래명세서번호 === no).length;
      const 선택 = level2Rows.filter((r) => r.거래명세서번호 === no).length;
      if (선택 < 전체) {
        items.push(`${no}: 전체 ${전체}건 중 ${선택}건 선택 — 나머지도 함께 처리됩니다`);
      }
    }
    setReason("");
    setDialog({
      open: true,
      title: kind === "publish" ? "거래명세서 발행" : "발행 취소(되돌리기)",
      message:
        kind === "publish"
          ? `선택한 ${targetNumbers.length}건의 거래명세서를 발행 처리합니다.`
          : `선택한 ${targetNumbers.length}건의 거래명세서를 발행대기로 되돌립니다.`,
      items,
      danger: false,
      action: { kind, targetNumbers },
    });
  }

  // "취소"(부분취소) — 거래명세서_의뢰서는 의뢰서 단위 행이라 체크한 만큼만 정확히 취소되므로
  // "함께 처리됩니다" 안내가 필요 없다. 레벨1/레벨2 둘 다에서 호출 가능(scope로 구분).
  function handleCancelClick(scope: "level1" | "level2") {
    const targetRows = scope === "level1" ? level2Rows : level2Rows.filter((r) => selected2.has(레벨2키(r)));
    if (targetRows.length === 0) {
      setBanner({ type: "warning", text: "선택된 항목이 없습니다." });
      return;
    }
    const byNumber = new Map<string, 발행행[]>();
    for (const r of targetRows) {
      const arr = byNumber.get(r.거래명세서번호);
      if (arr) arr.push(r);
      else byNumber.set(r.거래명세서번호, [r]);
    }
    const items: string[] = [];
    for (const [no, lines] of byNumber) {
      const 전체 = rows.filter((r) => r.거래명세서번호 === no).length;
      if (lines.length === 전체) {
        items.push(`${no}: 전체 ${전체}건 취소 → 요청 자체가 사라지고 미발행 목록으로 복귀`);
      } else {
        items.push(`${no}: ${lines.length}건 취소, ${전체 - lines.length}건 유지 (번호는 그대로 유지됩니다)`);
      }
    }
    setReason("");
    setDialog({
      open: true,
      title: "취소 확인",
      message: `선택한 의뢰서 ${targetRows.length}건의 발행 요청을 취소합니다.`,
      items,
      danger: true,
      action: { kind: "cancel", targetRows },
    });
  }

  async function publishOrUnpublish(targetNumbers: string[], kind: "publish" | "unpublish", reason: string) {
    const path = kind === "publish" ? "/api/invoice-publish" : "/api/invoice-unpublish";
    const 실패: string[] = [];
    const 성공번호 = new Set<string>();
    for (const no of targetNumbers) {
      try {
        const res = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            kind === "unpublish" ? { 거래명세서번호: no, 취소사유: reason } : { 거래명세서번호: no }
          ),
        });
        if (res.ok) 성공번호.add(no);
        else {
          const data = await res.json().catch(() => ({}));
          실패.push(`${no}: ${data.detail ?? "오류"}`);
        }
      } catch {
        실패.push(`${no}: 서버에 연결할 수 없습니다`);
      }
    }
    if (성공번호.size > 0) {
      setRows((prev) =>
        prev.map((r) => (성공번호.has(r.거래명세서번호) ? { ...r, 발송여부: kind === "publish" ? 1 : 0 } : r))
      );
      setSelected1(new Set());
      setSelected2(new Set());
    }
    if (실패.length > 0) {
      setBanner({ type: "error", text: `일부 처리에 실패했습니다: ${실패.join(" / ")}` });
    } else {
      setBanner({
        type: "success",
        text: kind === "publish" ? "거래명세서 발행이 완료되었습니다." : "발행이 취소되어 발행요청목록으로 되돌아갔습니다.",
      });
    }
  }

  // 발행요청목록의 "발행가능"(거래처 승인 대기) 토글(2026-08-12) — 낙관적 업데이트 먼저 반영하고
  // 실패하면 되돌린다. 거래명세서번호 단위 값이라 그 번호에 속한 발행행 전체(의뢰서 라인 여러 개일
  // 수 있음)를 한꺼번에 갱신한다(편집여부·발송여부와 동일한 갱신 패턴).
  async function handleTogglePublishGate(no: string, value: boolean) {
    setRows((prev) => prev.map((r) => (r.거래명세서번호 === no ? { ...r, 발행가능: value ? 1 : 0 } : r)));
    try {
      const res = await fetch("/api/invoice-publish-gate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 거래명세서번호: no, 값: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRows((prev) => prev.map((r) => (r.거래명세서번호 === no ? { ...r, 발행가능: value ? 0 : 1 } : r)));
        setBanner({ type: "error", text: data.detail ?? "발행가능 변경 중 오류가 발생했습니다." });
      }
    } catch {
      setRows((prev) => prev.map((r) => (r.거래명세서번호 === no ? { ...r, 발행가능: value ? 0 : 1 } : r)));
      setBanner({ type: "error", text: "서버에 연결할 수 없습니다." });
    }
  }

  async function executeCancel(targetRows: 발행행[], reason: string) {
    const byNumber = new Map<string, 발행행[]>();
    for (const r of targetRows) {
      const arr = byNumber.get(r.거래명세서번호);
      if (arr) arr.push(r);
      else byNumber.set(r.거래명세서번호, [r]);
    }
    const 실패: string[] = [];
    const 성공행: 발행행[] = [];
    for (const [no, lines] of byNumber) {
      try {
        const res = await fetch("/api/invoice-cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            거래명세서번호: no,
            의뢰서번호_목록: lines.map((l) => l.의뢰서번호),
            취소사유: reason || undefined,
          }),
        });
        if (res.ok) 성공행.push(...lines);
        else {
          const data = await res.json().catch(() => ({}));
          실패.push(`${no}: ${data.detail ?? "오류"}`);
        }
      } catch {
        실패.push(`${no}: 서버에 연결할 수 없습니다`);
      }
    }
    if (성공행.length > 0) {
      // 조별 분할발급(2026-07-29)으로 같은 의뢰서번호가 서로 다른 거래명세서번호에 동시에 걸려
      //있을 수 있어, 의뢰서번호만으로 지우면 ①아직 취소 안 한 다른 거래명세서의 같은 의뢰서까지
      // 화면에서 함께 사라지고 ②그 의뢰서가 미발행 목록에 중복으로 추가되는 버그가 있었다(실사용
      // 제보로 발견) — 반드시 (거래명세서번호,의뢰서번호) 조합 단위로만 제거해야 한다.
      const 취소된키 = new Set(성공행.map(레벨2키));
      setRows((prev) => prev.filter((r) => !취소된키.has(레벨2키(r))));

      // 이번 취소 후에도 그 의뢰서번호가 다른 거래명세서에 여전히 남아있으면(분할발급 중 일부만
      // 취소한 경우) 아직 발행 상태이므로 미발행 목록으로 되돌리면 안 된다 — 완전히 사라진
      // 의뢰서번호만, 중복 없이 한 번씩만 되돌린다.
      const 남은의뢰서번호 = new Set(rows.filter((r) => !취소된키.has(레벨2키(r))).map((r) => r.의뢰서번호));
      const 완전취소됨 = new Map<string, 발행행>();
      for (const r of 성공행) {
        if (!남은의뢰서번호.has(r.의뢰서번호) && !완전취소됨.has(r.의뢰서번호)) {
          완전취소됨.set(r.의뢰서번호, r);
        }
      }

      onReturnToUnissued(
        Array.from(완전취소됨.values()).map(
          (r): 미발행행 => ({
            의뢰서번호: r.의뢰서번호,
            담당자: r.담당자,
            사업부: r.사업부,
            거래처명: r.거래처명,
            업무명: r.업무명,
            업무명상세: r.업무명상세,
            작업일자: r.작업일자,
            청구페이지: r.청구페이지,
            장수: r.장수,
            봉입건수: r.봉입건수,
            용지수량: r.용지수량,
            봉투수량: r.봉투수량,
            삽지수량: r.삽지수량,
            // 2026-08-23 — 발행행.예상공급가액은 이제 "그 거래명세서 전체 총액"(거래명세서번호
            // 단위로 계산돼 의뢰서 라인마다 동일하게 반복 표시, 상세: `bug_예상공급가액_부가세미반영.md`)
            // 이라 개별 의뢰서 몫이 아니다 — 그대로 복사하면 취소돼 미발행 목록으로 돌아간 의뢰서마다
            // "거래명세서 전체 금액"이 잘못 붙는 버그가 생긴다(사용자 실사용 제보로 발견). null로
            // 두면 Tab4.tsx의 handleReturnToUnissued가 곧바로 서버에서 정확한 개별 값을 다시 받아와
            // 덮어쓴다(아래 참고) — 그 사이 잠깐 "⚠️ 미등록"으로 보이는 것은 감수한다.
            예상공급가액: null,
            우편요금: r.우편요금,
          })
        )
      );
      setSelected1(new Set());
      setSelected2(new Set());
    }
    if (실패.length > 0) {
      setBanner({ type: "error", text: `일부 취소에 실패했습니다: ${실패.join(" / ")}` });
    } else {
      setBanner({ type: "success", text: "취소가 완료되었습니다." });
    }
  }

  async function handleConfirm() {
    const action = dialog.action;
    const 사유입력값 = reason;
    closeDialog();
    if (!action) return;
    setSubmitting(true);
    setBanner(null);
    try {
      if (action.kind === "cancel") await executeCancel(action.targetRows, 사유입력값);
      else await publishOrUnpublish(action.targetNumbers, action.kind, 사유입력값);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <InvoiceFilterSidebar filters={filters} />

      <main className="flex flex-1 flex-col">
        {/* 스크롤해도 제목·액션 버튼이 화면 위쪽에 계속 보이도록 sticky 처리 (Tab4Invoice.tsx와 동일한
            2026-07-19 사용자 요청 패턴) */}
        <div className="sticky top-0 z-10 space-y-3 border-b border-gray-200 bg-background px-6 py-4 dark:border-gray-800">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              거래명세서 관리 [{mode === "대기" ? "발행요청목록" : "발행완료"}]
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              조회 결과 {groups.length.toLocaleString()}건 (전체 {scoped.length.toLocaleString()}건)
            </p>
          </div>

          {banner && (
            <div className={`rounded-md border px-3 py-2 text-sm ${배너색상[banner.type]}`}>{banner.text}</div>
          )}

          <div className="flex gap-2">
            {mode === "대기" && (
              <button
                type="button"
                onClick={() => handleStatusChangeClick("publish")}
                disabled={submitting || 선택에_승인대기_포함}
                title={선택에_승인대기_포함 ? "선택 항목 중 거래처 승인 대기 중인 건이 있습니다" : undefined}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
              >
                거래명세서 발행
              </button>
            )}
            {mode === "완료" && (
              <button
                type="button"
                onClick={() => handleStatusChangeClick("unpublish")}
                disabled={submitting}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
              >
                발행 취소(되돌리기)
              </button>
            )}
            {mode === "대기" && (
              <button
                type="button"
                onClick={() => handleCancelClick("level1")}
                disabled={submitting}
                className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              >
                취소
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4 p-6">
          <InvoiceIssuedLevel1Table
            groups={groups}
            selected={selected1}
            onToggleRow={toggleGroup}
            onToggleAll={toggleAllGroups}
            onShowHistory={setHistoryTarget}
            showDownload
            showPublishGate={mode === "대기"}
            onTogglePublishGate={handleTogglePublishGate}
          />

          {selected1.size > 0 && (
            <>
              {mode === "대기" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleCancelClick("level2")}
                    disabled={submitting}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    취소 (선택한 의뢰서만)
                  </button>
                </div>
              )}
              <InvoiceIssuedLevel2Table
                rows={level2Rows}
                selected={selected2}
                onToggleRow={toggleRow2}
                onToggleAll={toggleAllRow2}
              />
            </>
          )}

          {selected2.size > 0 && (
            <InvoiceDetailTable
              detailRows={detailRows}
              selectedIds={Array.from(new Set(Array.from(selected2, (k) => k.slice(k.indexOf("::") + 2))))}
            />
          )}
        </div>
      </main>

      {historyTarget && (
        <InvoiceHistoryDialog key={historyTarget} 거래명세서번호={historyTarget} onClose={() => setHistoryTarget(null)} />
      )}

      <ConfirmDialog
        open={dialog.open}
        title={dialog.title}
        message={dialog.message}
        items={dialog.items}
        danger={dialog.danger}
        reasonRequired={dialog.action?.kind === "unpublish"}
        reason={reason}
        onReasonChange={dialog.action?.kind === "publish" ? undefined : setReason}
        onConfirm={handleConfirm}
        onClose={closeDialog}
      />
    </>
  );
}
