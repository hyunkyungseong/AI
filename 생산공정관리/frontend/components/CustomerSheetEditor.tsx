"use client";

// 고객 제출용 명세서 편집창(2026-11-22) — 미리보기에서 "확정"을 누르면 고객제출용 거래처에만 이어서
// 뜨는 2단계 창. 내부용 최종 줄(왼쪽)을 고객용 줄(오른쪽, "상자")에 담기만 한다 — 수량·단가·금액은
// 사람이 입력하지 않고 담긴 줄로 자동 계산(확정 이후 금액 변동 금지, 사용자 결정). 미배정 줄이 하나라도
// 있으면 [최종 확정]이 막히고, 서버도 같은 규칙으로 다시 검증한다.
// 상세: `.claude/plans/plan_고객제출용명세서.md`.
import { useMemo, useState } from "react";
import type { 확정품목 } from "./InvoicePreviewDialog";
import { useDraggable, 손잡이클래스 } from "@/lib/useDraggable";
import { 고객규칙_자동적용, 고객품목_계산, 대상줄 } from "@/lib/customerSheet";
import type { 고객상자, 저장고객규칙 } from "@/lib/customerSheet";

type Props = {
  거래처명: string;
  품목_최종: 확정품목[];
  저장규칙: 저장고객규칙[];
  submitting: boolean;
  // 발행요청목록에서 다시 열 때(2026-11-22) "닫기"/"저장"으로 바꿔 쓴다 — 기본값은 확정 흐름 문구
  backLabel?: string;
  confirmLabel?: string;
  onBack: () => void;
  onConfirm: (상자목록: 고객상자[]) => void;
};

const th = "whitespace-nowrap px-3 py-1.5 text-left font-medium text-gray-600 dark:text-gray-300";
const thRight = "whitespace-nowrap px-3 py-1.5 text-right font-medium text-gray-600 dark:text-gray-300";
const td = "px-3 py-1.5 text-gray-900 dark:text-gray-100";
const tdRight = "px-3 py-1.5 text-right tabular-nums text-gray-900 dark:text-gray-100";
const input =
  "w-full rounded border border-gray-300 bg-white px-1.5 py-0.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";
const btn =
  "rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800";

const 숫자 = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("ko-KR", { maximumFractionDigits: 2 });

export default function CustomerSheetEditor({
  거래처명, 품목_최종, 저장규칙, submitting, backLabel = "← 내부용 편집으로 돌아가기", confirmLabel = "최종 확정", onBack, onConfirm,
}: Props) {
  const { attachPanel, panelStyle, handleProps } = useDraggable();
  // 지난번 저장한 묶음을 이번 줄에 자동 적용해 시작(2026-11-22 사용자 결정: 자동 적용). 저장 묶음이
  // 없으면 빈 상태 — "전체를 한 줄로" 버튼으로 바로 시작할 수 있다.
  const [상자목록, set상자목록] = useState<고객상자[]>(() => 고객규칙_자동적용(품목_최종, 저장규칙));
  const [선택상자, set선택상자] = useState<number>(0);
  const [체크, set체크] = useState<Set<number>>(new Set());

  const 계산 = useMemo(() => 고객품목_계산(품목_최종, 상자목록), [품목_최종, 상자목록]);
  const 자동적용됨 = 저장규칙.length > 0;
  const 확정가능 = !submitting && 상자목록.length > 0 && 계산.오류.length === 0;

  function 상자수정(n: number, patch: Partial<고객상자>) {
    set상자목록((prev) =>
      prev.map((b, i) => {
        if (i === n) return { ...b, ...patch };
        // "나머지 전부"는 하나만 — 새로 켜면 다른 줄은 자동으로 끈다
        if (patch.나머지전부) return { ...b, 나머지전부: false };
        return b;
      })
    );
  }

  function 줄추가(나머지전부 = false) {
    const 다음 = [...상자목록.map((b) => (나머지전부 ? { ...b, 나머지전부: false } : b)), { 품명: "", 규격: "", 비고: "", 포함: [], 나머지전부 }];
    set상자목록(다음);
    set선택상자(다음.length - 1);
  }

  function 전체한줄() {
    set상자목록([{ 품명: "", 규격: "", 비고: "", 포함: [], 나머지전부: true }]);
    set선택상자(0);
  }

  function 선택줄_담기() {
    if (체크.size === 0 || !상자목록[선택상자]) return;
    set상자목록((prev) =>
      prev.map((b, n) => {
        const 남김 = b.포함.filter((i) => !체크.has(i));
        return n === 선택상자 ? { ...b, 포함: [...남김, ...[...체크].sort((a, c) => a - c)] } : { ...b, 포함: 남김 };
      })
    );
    set체크(new Set());
  }

  function 선택줄_빼기() {
    if (체크.size === 0) return;
    set상자목록((prev) => prev.map((b) => ({ ...b, 포함: b.포함.filter((i) => !체크.has(i)) })));
    set체크(new Set());
  }

  function 상자삭제(n: number) {
    set상자목록((prev) => prev.filter((_, i) => i !== n));
    set선택상자((s) => (s >= n && s > 0 ? s - 1 : s));
  }

  function 상자이동(n: number, d: -1 | 1) {
    const m = n + d;
    if (m < 0 || m >= 상자목록.length) return;
    set상자목록((prev) => {
      const 다음 = [...prev];
      [다음[n], 다음[m]] = [다음[m], 다음[n]];
      return 다음;
    });
    set선택상자((s) => (s === n ? m : s === m ? n : s));
  }

  function 체크토글(i: number) {
    set체크((prev) => {
      const 다음 = new Set(prev);
      if (다음.has(i)) 다음.delete(i);
      else 다음.add(i);
      return 다음;
    });
  }

  function 담긴곳(i: number) {
    const n = 계산.배정.get(i);
    if (n === undefined) return <span className="font-medium text-red-600 dark:text-red-400">미배정</span>;
    const b = 상자목록[n];
    const 암묵 = b.나머지전부 && !b.포함.includes(i);
    return (
      <span className={암묵 ? "text-gray-500 dark:text-gray-400" : "text-gray-800 dark:text-gray-200"}>
        {n + 1}. {b.품명.trim() || "(품명 없음)"}
        {암묵 && " · 전체"}
      </span>
    );
  }

  const 대상수 = 품목_최종.filter(대상줄).length;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-2">
      <div
        ref={attachPanel}
        style={panelStyle}
        className="flex h-[94vh] w-[96vw] max-w-[2000px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-900"
      >
        <h2 {...handleProps} className={`text-base font-semibold text-gray-900 dark:text-gray-100 ${손잡이클래스}`}>
          고객 제출용 명세서 — {거래처명}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          왼쪽 내부용 줄을 체크한 뒤, 오른쪽에서 고객용 줄을 고르고 <b>[선택한 줄 담기 →]</b>를 누르세요. 금액은 담긴 줄의
          합계로 자동 계산되며 직접 고칠 수 없습니다. 모든 줄이 담겨야 최종 확정됩니다.
          {" 상단 업무명(B12)은 내부용 편집창에서 입력한 값이 그대로 들어갑니다."}
          {자동적용됨 && " 지난번 묶음을 자동으로 적용해 두었습니다."}
        </p>

        <div className="mt-3 grid min-h-0 flex-1 grid-cols-2 gap-4">
          {/* 왼쪽: 내부용 줄 */}
          <div className="flex min-h-0 flex-col">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">내부용 거래명세서 ({대상수}줄)</span>
              <span className="flex gap-1">
                <button className={btn} onClick={() => set체크(new Set(계산.미배정))} disabled={계산.미배정.length === 0}>
                  미배정 전체 선택
                </button>
                <button className={btn} onClick={선택줄_빼기} disabled={체크.size === 0}>
                  선택한 줄 빼기
                </button>
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className={th}></th>
                    <th className={th}>품명</th>
                    <th className={thRight}>수량</th>
                    <th className={thRight}>단가</th>
                    <th className={thRight}>금액</th>
                    <th className={th}>담긴 고객용 줄</th>
                  </tr>
                </thead>
                <tbody>
                  {품목_최종.map((r, i) =>
                    대상줄(r) ? (
                      <tr
                        key={i}
                        onClick={() => 체크토글(i)}
                        className={`cursor-pointer border-t border-gray-100 dark:border-gray-800 ${
                          체크.has(i) ? "bg-blue-50 dark:bg-blue-950" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        <td className={td}>
                          <input type="checkbox" checked={체크.has(i)} onChange={() => 체크토글(i)} onClick={(e) => e.stopPropagation()} />
                        </td>
                        <td className={td}>
                          {r.품목}
                          {r.조 && <span className="ml-1 text-xs text-gray-500">[{r.조}]</span>}
                        </td>
                        <td className={tdRight}>{숫자(r.수량)}</td>
                        <td className={tdRight}>{숫자(r.단가)}</td>
                        <td className={tdRight}>{숫자(r.금액)}</td>
                        <td className={td}>{담긴곳(i)}</td>
                      </tr>
                    ) : (
                      <tr key={i} className="border-t border-gray-100 text-gray-400 dark:border-gray-800">
                        <td className={td}></td>
                        <td className="px-3 py-1.5 italic" colSpan={5}>
                          {r.품목} (구분 문구 — 담지 않음)
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 오른쪽: 고객용 줄 */}
          <div className="flex min-h-0 flex-col">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">고객 제출용 ({상자목록.length}줄)</span>
              <span className="flex gap-1">
                <button className={btn} onClick={선택줄_담기} disabled={체크.size === 0 || 상자목록.length === 0}>
                  선택한 줄 담기 → {상자목록[선택상자] ? `${선택상자 + 1}번` : ""}
                </button>
                <button className={btn} onClick={() => 줄추가(false)}>
                  + 줄 추가
                </button>
                <button className={btn} onClick={전체한줄} title="지금 묶음을 지우고 전체를 한 줄로 만듭니다">
                  전체를 한 줄로
                </button>
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className={th}>#</th>
                    <th className={th}>품명</th>
                    <th className={th}>규격</th>
                    <th className={thRight}>수량</th>
                    <th className={thRight}>단가</th>
                    <th className={thRight}>금액</th>
                    <th className={th}>비고</th>
                    <th className={`${th} text-center`}>전체</th>
                    <th className={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {상자목록.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                        고객용 줄이 없습니다. [+ 줄 추가] 또는 [전체를 한 줄로]로 시작하세요.
                      </td>
                    </tr>
                  )}
                  {상자목록.map((b, n) => {
                    const 줄 = 계산.줄[n];
                    return (
                      <tr
                        key={n}
                        onClick={() => set선택상자(n)}
                        className={`border-t border-gray-100 dark:border-gray-800 ${
                          선택상자 === n ? "bg-amber-50 dark:bg-amber-950" : ""
                        }`}
                      >
                        <td className={td}>
                          <input type="radio" checked={선택상자 === n} onChange={() => set선택상자(n)} title="담을 대상 줄로 선택" /> {n + 1}
                        </td>
                        <td className={td}>
                          <input
                            className={`${input} min-w-[16rem]`}
                            value={b.품명}
                            placeholder="고객에게 보일 품명"
                            onChange={(e) => 상자수정(n, { 품명: e.target.value })}
                          />
                        </td>
                        <td className={td}>
                          <input className={`${input} w-20`} value={b.규격 ?? ""} onChange={(e) => 상자수정(n, { 규격: e.target.value })} />
                        </td>
                        <td className={tdRight}>{숫자(줄?.수량)}</td>
                        <td className={tdRight}>{숫자(줄?.단가)}</td>
                        <td className={`${tdRight} font-medium`}>{숫자(줄?.금액 ?? 0)}</td>
                        <td className={td}>
                          <input className={`${input} w-28`} value={b.비고 ?? ""} onChange={(e) => 상자수정(n, { 비고: e.target.value })} />
                        </td>
                        <td className={`${td} text-center`}>
                          <input
                            type="checkbox"
                            checked={b.나머지전부}
                            title="전체: 어느 줄에도 안 담긴 내부용 줄을 전부 이 줄이 받습니다(다음 달 새 품목도 자동으로 들어감)"
                            onChange={(e) => 상자수정(n, { 나머지전부: e.target.checked })}
                          />
                        </td>
                        <td className={`${td} whitespace-nowrap`}>
                          <button className={btn} onClick={() => 상자이동(n, -1)} disabled={n === 0}>▲</button>{" "}
                          <button className={btn} onClick={() => 상자이동(n, 1)} disabled={n === 상자목록.length - 1}>▼</button>{" "}
                          <button className={btn} onClick={() => 상자삭제(n)}>삭제</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 아래: 합계 비교 + 막는 사유 */}
        <div className="mt-3 rounded border border-gray-200 p-3 text-sm dark:border-gray-700">
          <div className="flex flex-wrap gap-6">
            <span className="text-gray-700 dark:text-gray-300">내부용 합계 <b className="tabular-nums">{숫자(계산.내부합)}</b></span>
            <span className="text-gray-700 dark:text-gray-300">
              고객용 합계{" "}
              <b className={`tabular-nums ${계산.고객합 === 계산.내부합 ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {숫자(계산.고객합)}
              </b>
            </span>
            <span className={계산.미배정.length ? "font-medium text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}>
              미배정 {계산.미배정.length}줄
            </span>
          </div>
          {상자목록.length > 0 && 계산.오류.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-red-600 dark:text-red-400">
              {[...new Set(계산.오류)].map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button
            className="rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={onBack}
            disabled={submitting}
          >
            {backLabel}
          </button>
          <button
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => onConfirm(상자목록)}
            disabled={!확정가능}
            title={확정가능 ? "" : "모든 내부용 줄이 담기고 품명이 채워져야 확정할 수 있습니다"}
          >
            {submitting ? "저장 중…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
