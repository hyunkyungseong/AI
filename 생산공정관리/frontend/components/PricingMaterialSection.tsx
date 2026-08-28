"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { 자재단가행 } from "@/components/Dashboard";
import { 계산_드롭다운위치, type DropdownPos } from "@/lib/dropdownPosition";

type 매칭자재입력 = { 자재코드: string; 자재명: string };
type 자재후보 = { 자재코드: number | null; 자재명: string | null; 자재종류: string };

type Props = {
  단가마스터_id: number;
  거래처명: string;
  업무명: string; // 빈 문자열이면 "기본단가"(업무명 무관) — 후보 조회 시 넘기지 않음
  작업명: string; // 빈 문자열이면 "업무 기본단가" — 후보 조회 시 넘기지 않음
  rows: 자재단가행[];
  onChange: (rows: 자재단가행[]) => void;
  // 무상차단코드(2026-08-25) — 상위 단가마스터에서 재료비(용지/봉투/삽지)를 "무상(고객사 제공)"으로
  // 체크한 코드는 새로 자재단가를 등록하지 못하게 막는다(기본이 무상인데 특정 자재만 유상으로
  // 등록되는 모순 방지). 지금 폼에 이미 선택돼 있는 코드(수정 중인 기존 행 등)는 예외로 계속 보임.
  무상차단코드?: Set<자재단가행["코드"]>;
};

const inputCls =
  "rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

// 출력비·봉입비(2026-08-17 추가) — 각각 용지·봉투 자재사용량 기준으로 청구수량이 정해지므로
// (billing.py build_품목행()), 출력자재비·봉입자재비와 같은 자재종류 후보를 공유한다.
const 코드옵션: { value: 자재단가행["코드"]; label: string }[] = [
  { value: "출력비", label: "출력비(용지)" },
  { value: "출력자재비", label: "출력자재비(용지)" },
  { value: "봉입비", label: "봉입비(봉투)" },
  { value: "봉입자재비", label: "봉입자재비(봉투)" },
  { value: "삽지비", label: "삽지비" },
];

// 코드(항목) → 자재사용현황.자재종류 매핑(scripts/billing.py build_자재map()의 _분류()와 동일 기준) —
// "항목"에서 용지를 골랐는데 봉투·삽지 자재까지 후보로 뜨면 헷갈린다는 피드백(2026-08-16)으로
// 매칭 자재 후보를 이 매핑으로 좁힌다.
const 코드_자재종류맵: Record<자재단가행["코드"], string> = {
  출력비: "용지",
  출력자재비: "용지",
  봉입비: "봉투",
  봉입자재비: "봉투",
  삽지비: "삽지",
};

function 빈매칭(): 매칭자재입력[] {
  return [{ 자재코드: "", 자재명: "" }];
}

// el 자신이 아니라 진짜로 세로 스크롤이 걸려 있는 조상을 찾는다(2026-08-16) — 이 컴포넌트를 담은
// PricingFormDialog가 `max-h-[90vh] overflow-y-auto`로 다이얼로그 전체를 스크롤시키는 구조라,
// editorRef(자재별 단가 박스 안쪽)만 scrollIntoView하면 그 박스 끝까지만 보이고 그 아래 있는
// 다이얼로그 자체의 취소/저장 버튼까지는 화면에 안 들어옴 — 실제 스크롤 컨테이너를 찾아 끝까지 보낸다.
function 스크롤가능부모(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const style = window.getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}

function 후보라벨(c: 자재후보): string {
  const 코드부분 = c.자재코드 != null ? `#${c.자재코드}` : "코드없음";
  return `${c.자재명 ?? "(이름없음)"} · ${코드부분}`;
}

// 자재코드가 있으면 자재코드로, 없으면 자재명으로 식별 — 후보(자재후보)와 입력 중인 값(매칭자재입력)을
// 같은 기준으로 비교하기 위한 키(2026-08-16, 이미 고른 자재는 드롭다운에서 빼기 위함).
function 후보키(c: 자재후보): string {
  return c.자재코드 != null ? `code:${c.자재코드}` : `name:${c.자재명 ?? ""}`;
}
function 매칭키(m: 매칭자재입력): string | null {
  if (m.자재코드.trim()) return `code:${m.자재코드.trim()}`;
  if (m.자재명.trim()) return `name:${m.자재명.trim()}`;
  return null;
}

// 매칭 자재 한 줄 — 자재명 입력칸에 실제 운영통계자료·자재사용현황에 등장한 자재 후보를 드롭다운으로
// 보여주고, 고르면 자재코드·자재명이 함께 채워진다(2026-08-16, 사용자 피드백: "자재코드와 자재명을
// 사용자가 알 수가 없는데 직접 입력하게 돼 있음" — 자유 입력만 있던 것을 후보 선택 방식으로 교체).
// 후보에 없는 자재(아직 생산실적이 없는 신규 자재 등)도 직접 타이핑해서 등록할 수 있게 자유 입력은
// 그대로 허용한다.
//
// 드롭다운은 document.body에 포털로 그린다(2026-08-16, 실사용 제보 — 이 컴포넌트를 담은
// PricingFormDialog가 자재별 단가 섹션 추가 후 자체 세로 스크롤(overflow-y-auto)을 갖게 되면서,
// 드롭다운을 입력칸 기준 absolute로만 그리면 스크롤 컨테이너 경계에서 잘려 안 보이는 문제가 있었음.
// position: fixed + getBoundingClientRect()로 뷰포트 기준 좌표를 직접 계산해 어떤 스크롤 컨테이너
// 안에 있어도 잘리지 않게 함 — 스크롤·리사이즈 시마다 좌표를 다시 계산한다.
function MaterialMatchRow({
  value,
  onChange,
  onRemove,
  removable,
  후보목록,
}: {
  value: 매칭자재입력;
  onChange: (patch: Partial<매칭자재입력>) => void;
  onRemove: () => void;
  removable: boolean;
  후보목록: 자재후보[];
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (inputRef.current?.contains(e.target as Node)) return;
      if (listRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    function updatePos() {
      if (inputRef.current) setPos(계산_드롭다운위치(inputRef.current));
    }
    updatePos();
    // capture=true — 이 입력칸을 담은 스크롤 컨테이너(다이얼로그) 자체의 스크롤 이벤트는 버블링되지
    // 않으므로, window에서 캡처링 단계로 잡아야 어떤 조상이 스크롤돼도 좌표를 다시 계산할 수 있다.
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = value.자재명.trim().toLowerCase();
    const list = q ? 후보목록.filter((c) => 후보라벨(c).toLowerCase().includes(q)) : 후보목록;
    return list.slice(0, 50); // 후보가 많아도 스크롤이 과하게 길어지지 않도록
  }, [value.자재명, 후보목록]);

  function openList() {
    if (inputRef.current) setPos(계산_드롭다운위치(inputRef.current));
    setOpen(true);
  }

  function select(c: 자재후보) {
    onChange({ 자재코드: c.자재코드 != null ? String(c.자재코드) : "", 자재명: c.자재명 ?? "" });
    setOpen(false);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          placeholder={후보목록.length > 0 ? "자재명 검색 또는 직접 입력" : "자재명(직접 입력)"}
          value={value.자재명}
          onChange={(e) => {
            onChange({ 자재명: e.target.value });
            openList();
          }}
          onFocus={openList}
          // onClick도 별도로 필요함(2026-08-16) — 스크롤바 드래그가 시작하는 mousedown이 목록을
          // 바깥 클릭으로 오인해 닫아버리는데, 입력칸 포커스는 그대로 유지되므로 재클릭해도
          // onFocus가 다시 발생하지 않음. onClick으로 포커스 유지 상태에서도 재오픈되게 함.
          onClick={openList}
          className={`w-full ${inputCls}`}
        />
        {open &&
          filtered.length > 0 &&
          pos &&
          typeof document !== "undefined" &&
          createPortal(
            <ul
              ref={listRef}
              style={{
                position: "fixed",
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxHeight,
                ...(pos.placement === "below" ? { top: pos.top } : { bottom: pos.bottom }),
              }}
              className="z-50 overflow-auto rounded-md border border-gray-200 bg-white text-xs shadow-lg dark:border-gray-700 dark:bg-gray-800"
            >
              {filtered.map((c, i) => (
                <li
                  key={`${c.자재코드}-${c.자재명}-${i}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(c);
                  }}
                  className="cursor-pointer px-2 py-1 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <span className="text-gray-400">[{c.자재종류}]</span> {후보라벨(c)}
                </li>
              ))}
            </ul>,
            document.body
          )}
      </div>
      <input
        type="number"
        placeholder="자재코드"
        value={value.자재코드}
        onChange={(e) => onChange({ 자재코드: e.target.value })}
        className={`w-24 ${inputCls}`}
        title="자재명을 고르면 자동으로 채워집니다. 직접 입력도 가능합니다."
      />
      {removable && (
        <button type="button" onClick={onRemove} className="text-xs text-gray-500 hover:underline dark:text-gray-400">
          삭제
        </button>
      )}
    </div>
  );
}

// 단가마스터 한 행 아래에 "자재별로 다른 단가"를 등록하는 하위 목록 — 같은 (거래처+업무명+작업명)
// 조합이라도 실제 사용된 자재(용지·봉투·삽지 종류)에 따라 단가가 다른 업무를 지원한다(2026-08-15,
// 단가마스터 자재명 정규화). 등록이 없으면 지금처럼 위 표의 기본단가(용지제작단가 등) 하나로
// 계산되고, 여기서 자재단가를 등록하면 그 자재에 대해서만 우선 적용된다(scripts/billing.py
// _자재별_처리() 참고). 매칭 자재를 여러 개 등록하면 그 자재들이 전부 같은 단가를 공유한다(업무의뢰서
// 95903 사례처럼 "여러 자재코드가 한 가격"인 경우).
//
// 추가/수정/삭제는 각각 별도 엔드포인트라 PricingFormDialog의 "저장" 버튼과 묶지 않고, 이 안에서
// 클릭 즉시 서버에 반영 후 onChange로 부모(PricingMaster.tsx)의 로컬 목록만 갱신한다.
export default function PricingMaterialSection({
  단가마스터_id,
  거래처명,
  업무명,
  작업명,
  rows,
  onChange,
  무상차단코드,
}: Props) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [코드, set코드] = useState<자재단가행["코드"]>("출력자재비");
  const [단가, set단가] = useState("");
  const [표시명, set표시명] = useState("");
  // 인쇄면(2026-08-22, "출력비" 항목 전용) — 이 자재(용지 종류)만 단면/양면을 따로 지정. 빈 문자열
  // = 미설정(위 단가마스터 기본단가의 인쇄면 값을 그대로 씀) — 내지=양면, 표지=단면처럼 같은 작업
  // 안에서 자재별로 인쇄면이 섞인 경우를 표현하기 위함. 상세:
  // `.claude/plans/plan_출력비_장수페이지기준_인쇄면자재별.md`.
  const [인쇄면, set인쇄면] = useState<"단면" | "양면" | "">("");
  const [비고, set비고] = useState("");
  const [매칭, set매칭] = useState<매칭자재입력[]>(빈매칭());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const 추가스크롤필요 = useRef(false);

  // 자재단가를 이미 여러 개 등록해둔 상태에서 "+ 자재단가 추가"·"수정"을 누르면 편집창이 목록 맨
  // 아래에 나타나 화면 밖에 있는 경우가 많아, 매번 스크롤을 내려야 하는 불편함이 있었다(2026-08-16
  // 사용자 요청) — 편집창이 열릴 때마다 자동으로 그 위치까지 스크롤한다.
  // block:"nearest"는 editorRef가 이미 화면에 일부 걸쳐 있으면 오히려 위로 스크롤되거나 거의 안
  // 움직여서 아래쪽 취소·저장 버튼이 안 보이는 문제가 있었다(2026-08-21 사용자 재제보) — 아래
  // "매칭 자재 추가" 시와 동일하게 실제 스크롤 컨테이너(다이얼로그 전체)를 맨 아래까지 내린다.
  useEffect(() => {
    if (editing === null) return;
    const container = 스크롤가능부모(editorRef.current);
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    } else {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [editing]);

  // "+ 같은 단가로 자재 추가"를 눌러도 새로 생긴 자재명 칸이 화면 밖에 생겨 매번 손으로 스크롤해야
  // 했던 문제(2026-08-16 사용자 제보) — 매칭추가()가 이 플래그를 켜두면, 배열 길이가 바뀐 직후 실제
  // 스크롤 컨테이너(다이얼로그 전체, 위 스크롤가능부모() 참고)를 맨 아래까지 스크롤한다 — 처음엔
  // editorRef만 scrollIntoView(block:"end")했더니 "자재별 단가" 박스 안쪽 끝까지만 가고 그 아래
  // 다이얼로그 자체의 취소/저장 버튼은 여전히 안 보인다는 재제보(2026-08-16, 같은 날)로 수정.
  // 편집창을 처음 열 때(openNew/openEdit)는 플래그를 켜지 않으므로 위 "편집창 진입 시 스크롤"과
  // 겹치지 않는다.
  useEffect(() => {
    if (추가스크롤필요.current) {
      추가스크롤필요.current = false;
      const container = 스크롤가능부모(editorRef.current);
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      } else {
        editorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }
  }, [매칭.length]);

  // GET /단가마스터/자재단가 등록 화면에서 "실제 이 업무에 어떤 자재가 쓰였는지" 후보 조회
  // (2026-08-16) — 이 단가행이 속한 거래처+업무명+작업명 기준. 업무명·작업명이 "기본단가"(빈 문자열)
  // 이면 그 조건은 빼고 거래처 전체 자재를 후보로 보여준다.
  const [후보목록, set후보목록] = useState<자재후보[]>([]);
  useEffect(() => {
    const qs = new URLSearchParams({ 거래처명 });
    if (업무명) qs.set("업무명", 업무명);
    if (작업명) qs.set("작업명", 작업명);
    fetch(`/api/material-list?${qs.toString()}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: 자재후보[]) => set후보목록(Array.isArray(data) ? data : []))
      .catch(() => set후보목록([]));
  }, [거래처명, 업무명, 작업명]);

  // 지금 고른 "항목"(코드)에 맞는 자재종류만 후보로 보여준다 — 예: 출력자재비(용지)를 고르면
  // 봉투·삽지 자재는 후보에서 빠짐(2026-08-16 피드백).
  const 코드필터후보목록 = useMemo(
    () => 후보목록.filter((c) => c.자재종류 === 코드_자재종류맵[코드]),
    [후보목록, 코드]
  );

  // 무상차단코드(2026-08-25) — 상위 단가마스터가 그 코드를 "무상"으로 체크했으면 선택지에서 뺀다.
  // 지금 폼에 이미 선택된 값(수정 중인 기존 행 등)은 예외로 계속 보여준다(기존 데이터를 깨지 않기
  // 위함, PricingProcessSection.tsx의 미등록옵션() 자기 자신 포함 패턴과 동일).
  const 필터된코드옵션 = useMemo(
    () => 코드옵션.filter((c) => !무상차단코드?.has(c.value) || c.value === 코드),
    [코드, 무상차단코드]
  );

  // 같은 "항목"(코드) 안에서 이미 다른 자재단가 행에 매칭돼 있는 자재는 후보에서 뺀다(2026-08-16
  // 사용자 요청) — 같은 자재가 같은 항목의 두 자재단가 행에 동시에 매칭되면 어느 쪽 단가가 적용
  // 되는지 불명확해지는 문제(_자재단가_조회()가 마지막에 읽은 쪽으로 조용히 덮어씀)를 UI에서 미리
  // 막기 위함. 항목이 다르면(예: 출력자재비 vs 봉입자재비) 같은 자재라도 서로 다른 계산에 쓰이므로
  // 막지 않는다(사용자 확인, 2026-08-16 — "항목이 다를 경우는 허용돼야 함"). 지금 수정 중인 행
  // 자신이 이미 갖고 있던 매칭은 당연히 후보에 남아 있어야 하므로 editing과 같은 id는 제외한다.
  const 다른행에등록됨 = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.코드 !== 코드) continue;
      if (editing !== "new" && r.id === editing) continue;
      for (const m of r.매칭자재) {
        set.add(후보키({ 자재코드: m.자재코드, 자재명: m.자재명, 자재종류: "" }));
      }
    }
    return set;
  }, [rows, editing, 코드]);

  const 필터된후보목록 = useMemo(
    () => 코드필터후보목록.filter((c) => !다른행에등록됨.has(후보키(c))),
    [코드필터후보목록, 다른행에등록됨]
  );

  function openNew() {
    setEditing("new");
    set코드("출력자재비");
    set단가("");
    set표시명("");
    set인쇄면("");
    set비고("");
    set매칭(빈매칭());
    setError(null);
  }

  function openEdit(row: 자재단가행) {
    setEditing(row.id);
    set코드(row.코드);
    set단가(String(row.단가));
    set표시명(row.표시명 ?? "");
    set인쇄면(row.인쇄면 ?? "");
    set비고(row.비고 ?? "");
    set매칭(
      row.매칭자재.length > 0
        ? row.매칭자재.map((m) => ({
            자재코드: m.자재코드 != null ? String(m.자재코드) : "",
            자재명: m.자재명 ?? "",
          }))
        : 빈매칭()
    );
    setError(null);
  }

  // 코드·단가·표시명·비고만 그대로 가져와 "새로 만들기" 상태로 여는 복사(2026-08-16 사용자 요청) —
  // 매칭 자재는 비워서 시작한다. 그대로 복사하면 같은 자재가 두 자재단가 행에 동시에 매칭돼(원본과
  // 복사본 둘 다) build_단가맵()이 마지막에 읽은 쪽으로 조용히 덮어써 버리는 문제(_자재단가_조회()
  // 참고)가 생기므로, 사용자가 매번 새 자재를 직접 골라 넣도록 강제한다 — 단가가 같은 자재를 여러
  // 개 등록할 때 "항목·단가"만 매번 다시 타이핑하지 않아도 되게 하는 게 목적.
  function openCopy(row: 자재단가행) {
    setEditing("new");
    set코드(row.코드);
    set단가(String(row.단가));
    set표시명(row.표시명 ?? "");
    set인쇄면(row.인쇄면 ?? "");
    set비고(row.비고 ?? "");
    set매칭(빈매칭());
    setError(null);
  }

  function closeEditor() {
    setEditing(null);
    setError(null);
  }

  function 매칭추가() {
    추가스크롤필요.current = true;
    set매칭((prev) => [...prev, { 자재코드: "", 자재명: "" }]);
  }
  function 매칭삭제(i: number) {
    set매칭((prev) => prev.filter((_, j) => j !== i));
  }
  function 매칭수정(i: number, patch: Partial<매칭자재입력>) {
    set매칭((prev) => prev.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  }

  async function handleSave() {
    setError(null);
    const 단가값 = Number(단가);
    if (!Number.isFinite(단가값) || 단가값 < 0) {
      setError("단가를 올바르게 입력해 주세요.");
      return;
    }
    const 매칭자재 = 매칭
      .filter((m) => m.자재코드.trim() || m.자재명.trim())
      .map((m) => ({
        자재코드: m.자재코드.trim() ? Number(m.자재코드) : null,
        자재명: m.자재명.trim() || null,
      }));
    if (매칭자재.length === 0) {
      setError("매칭할 자재를 1개 이상 입력해 주세요(자재명 검색 후 선택, 또는 직접 입력).");
      return;
    }

    setSubmitting(true);
    try {
      if (editing === "new") {
        const res = await fetch("/api/pricing-material-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            단가마스터_id,
            코드,
            단가: 단가값,
            표시명: 표시명.trim() || null,
            인쇄면: 인쇄면 || null,
            비고: 비고.trim() || null,
            매칭자재,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.detail ?? "저장 중 오류가 발생했습니다.");
          return;
        }
        onChange([
          ...rows,
          {
            id: data.id,
            단가마스터_id,
            코드,
            단가: 단가값,
            표시명: 표시명.trim() || null,
            인쇄면: 인쇄면 || null,
            비고: 비고.trim() || null,
            매칭자재,
          },
        ]);
      } else if (typeof editing === "number") {
        const res = await fetch("/api/pricing-material-update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editing,
            단가: 단가값,
            표시명: 표시명.trim() || null,
            인쇄면: 인쇄면 || null,
            비고: 비고.trim() || null,
            매칭자재,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.detail ?? "수정 중 오류가 발생했습니다.");
          return;
        }
        onChange(
          rows.map((r) =>
            r.id === editing
              ? {
                  ...r,
                  단가: 단가값,
                  표시명: 표시명.trim() || null,
                  인쇄면: 인쇄면 || null,
                  비고: 비고.trim() || null,
                  매칭자재,
                }
              : r
          )
        );
      }
      closeEditor();
    } catch {
      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("이 자재단가를 삭제하시겠습니까?")) return;
    const res = await fetch("/api/pricing-material-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: [id] }),
    });
    if (res.ok) {
      onChange(rows.filter((r) => r.id !== id));
    }
  }

  return (
    <div className="col-span-2 rounded-md border border-gray-200 p-3 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700 dark:text-gray-300">
          자재별 단가 <span className="text-xs text-gray-400">— 등록 안 하면 위 기본단가로 계산</span>
        </span>
        {editing === null && (
          <button
            type="button"
            onClick={openNew}
            className="text-xs text-gray-600 hover:underline dark:text-gray-300"
          >
            + 자재단가 추가
          </button>
        )}
      </div>

      {rows.length === 0 && editing === null && (
        <p className="mt-2 text-xs text-gray-400">등록된 자재단가가 없습니다.</p>
      )}

      {rows.length > 0 && (
        <ul className="mt-2 space-y-1">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 rounded border border-gray-100 px-2 py-1 text-xs dark:border-gray-800"
            >
              <span className="truncate">
                <span className="font-medium text-gray-700 dark:text-gray-300">{r.코드}</span>{" "}
                <span className="text-gray-500 dark:text-gray-400">{r.단가.toLocaleString()}원</span>{" "}
                {r.인쇄면 && (
                  <span className="text-gray-400" title="이 자재만 따로 설정된 인쇄면">
                    [{r.인쇄면}]
                  </span>
                )}{" "}
                <span className="text-gray-400">
                  ({r.매칭자재.map((m) => m.자재명 ?? `코드${m.자재코드}`).join(", ")})
                </span>
              </span>
              <span className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  className="text-gray-600 hover:underline dark:text-gray-300"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => openCopy(r)}
                  className="text-gray-600 hover:underline dark:text-gray-300"
                  title="항목·단가·표시명·비고를 그대로 가져와 새로 만들기(매칭 자재는 직접 골라야 함)"
                >
                  복사
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="text-red-600 hover:underline dark:text-red-400"
                >
                  삭제
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <div
          ref={editorRef}
          className="mt-3 space-y-2 rounded-md border border-dashed border-gray-300 p-3 dark:border-gray-700"
        >
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-400">
              항목
              <select
                value={코드}
                onChange={(e) => set코드(e.target.value as 자재단가행["코드"])}
                className={`mt-1 w-full ${inputCls}`}
              >
                {필터된코드옵션.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-gray-600 dark:text-gray-400">
              단가(원)
              <input
                type="number"
                min={0}
                step="0.01"
                value={단가}
                onChange={(e) => set단가(e.target.value)}
                className={`mt-1 w-full ${inputCls}`}
              />
            </label>
            <label className="text-xs text-gray-600 dark:text-gray-400">
              표시명(선택) — 자재를 여러 개 묶을 때 그 그룹의 이름
              <input
                value={표시명}
                onChange={(e) => set표시명(e.target.value)}
                placeholder="예: A4 특수용지"
                className={`mt-1 w-full ${inputCls}`}
              />
            </label>
            {/* 인쇄면(2026-08-22) — "출력비"(용지 인쇄 서비스 요금)·"출력자재비"(용지 실물 재료비)
                둘 다 자재별로 단면/양면이 섞일 수 있어 노출한다. 봉입비·삽지비 등은 페이지 개념이
                없어 계속 숨긴다. 두 항목의 동작 차이가 커서 안내 문구를 분리했다:
                - 출력비: 미설정 시 위 "인쇄면" 기본단가 값을 그대로 따름(지금까지의 유일한 동작)
                - 출력자재비: 미설정 시 인쇄면 보정 없이 실제 쓴 장 수 그대로 청구(재료비의 기본
                  원칙 — 종이는 몇 장 썼는지로 정해짐). 다만 삼성화재해상보험처럼 재료 단가 자체를
                  "페이지 단가"로 등록해둔 경우엔 여기서 인쇄면을 지정해야 정상 청구된다. */}
            {(코드 === "출력비" || 코드 === "출력자재비") && (
              <label className="text-xs text-gray-600 dark:text-gray-400">
                인쇄면(선택) —{" "}
                {코드 === "출력비"
                  ? "비워두면 위 기본단가의 인쇄면을 따름"
                  : "비워두면 보정 없이 실제 쓴 장 수 그대로 청구(재료 단가가 페이지 단가면 지정 필요)"}
                <select
                  value={인쇄면}
                  onChange={(e) => set인쇄면(e.target.value as "단면" | "양면" | "")}
                  className={`mt-1 w-full ${inputCls}`}
                >
                  <option value="">
                    {코드 === "출력비" ? "미설정(기본단가 값 사용)" : "미설정(장 수 그대로 청구)"}
                  </option>
                  <option value="양면">양면(한 장에 앞뒤 2쪽)</option>
                  <option value="단면">단면(한 장에 1쪽)</option>
                </select>
              </label>
            )}
            <label className="text-xs text-gray-600 dark:text-gray-400">
              비고(선택)
              <input value={비고} onChange={(e) => set비고(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
            </label>
          </div>

          <div>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              매칭 자재 — {코드옵션.find((c) => c.value === 코드)?.label}만 후보로 보여줍니다{" "}
              {필터된후보목록.length > 0 ? (
                "— 실제로 쓰인 자재 중에서 검색해서 고르세요(목록에 없으면 직접 입력도 가능)"
              ) : 코드필터후보목록.length > 0 ? (
                // 실적은 있지만(코드필터후보목록) 전부 다른 자재단가 행에 이미 등록돼 있어(필터된후보목록
                // 0건) 더 고를 게 없는 경우 — 실적 자체가 없는 경우와 원인이 다르므로 문구를 분리
                // (2026-08-16 사용자 요청).
                <strong className="text-amber-600 dark:text-amber-400">
                  — 이 항목에서 실적이 있는 자재는 이미 전부 등록하셨습니다. 더 등록할 자재가 없습니다
                </strong>
              ) : (
                "— 아직 자재 실적이 없어 후보가 없습니다, 자재명을 직접 입력해 주세요"
              )}
              . 자재를 여러 개 추가하면 미리보기 원본 표에서 <strong>한 줄로 합쳐져</strong> 보입니다.
            </span>
            <div className="mt-1 space-y-1">
              {매칭.map((m, i) => {
                // 다른 줄에서 이미 고른 자재는 이 줄의 후보에서 빼서, 같은 자재를 실수로 중복
                // 선택하지 않게 한다(2026-08-16 사용자 요청). 지금 이 줄 자신이 고른 값은 당연히
                // 계속 보여야 하므로 자기 자신(j===i)은 제외 대상에서 뺀다.
                const 다른줄선택됨 = new Set(
                  매칭
                    .filter((_, j) => j !== i)
                    .map(매칭키)
                    .filter((k): k is string => k !== null)
                );
                const 이줄후보 = 필터된후보목록.filter((c) => !다른줄선택됨.has(후보키(c)));
                return (
                  <MaterialMatchRow
                    key={i}
                    value={m}
                    onChange={(patch) => 매칭수정(i, patch)}
                    onRemove={() => 매칭삭제(i)}
                    removable={매칭.length > 1}
                    후보목록={이줄후보}
                  />
                );
              })}
              <button
                type="button"
                onClick={매칭추가}
                className="text-xs text-gray-600 hover:underline dark:text-gray-300"
              >
                + 같은 단가로 자재 추가
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeEditor}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
            >
              {submitting ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
