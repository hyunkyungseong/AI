"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { 계산_드롭다운위치, type DropdownPos } from "@/lib/dropdownPosition";

type Props = {
  value: string;
  onChange: (next: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
};

// 단일 선택 + 자유 입력 콤보박스 — MultiSelectCombo.tsx의 열림/닫힘·바깥클릭 감지 패턴을
// 재사용하되, 단일 값(문자열)을 다루고 후보에 없는 값도 그대로 입력할 수 있게 만든 버전.
// <input list>+<datalist>(브라우저 기본 자동완성)로는 "이미 값이 선택된 상태에서 클릭하면
// 전체 후보가 다시 뜨지 않고 지워야만 목록이 보이는" 문제가 있어(2026-07-19 사용자 피드백),
// 클릭/포커스 시 현재 입력값 기준으로 필터링된 후보를 보여준다(값이 비어있으면 자연히 전체
// 표시) — el.select()로 기존 값이 전체 선택돼 있어 바로 타이핑해도 처음부터 다시 필터링된다.
//
// 드롭다운은 document.body에 포털로 그리고 위치는 PricingMaterialSection.tsx가 먼저 만든
// 공용 계산_드롭다운위치()(2026-08-16, frontend/lib/dropdownPosition.ts)를 그대로 재사용한다
// (2026-08-24) — 예전엔 입력칸 바로 아래에 고정 높이(max-h-48=192px)로만 그렸는데, 화면 아래쪽
// 입력칸에서 열면 목록이 잘리고, 이름을 모른 채 후보를 훑어봐야 하는 경우엔 6줄 정도로는 너무
// 좁다는 실사용 피드백(2026-08-24)으로 위/아래 자동 반전 + 남은 공간만큼 커지는 높이로 교체.
export default function EditableCombo({
  value,
  onChange,
  options,
  placeholder,
  className,
  "aria-label": ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  // null은 "아직 한 번도 열린 적 없음" 초기 상태일 뿐 — open() 시점에 항상 현재 값으로 채워진다.
  const [search, setSearch] = useState<string | null>(null);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    // 드롭다운이 포털로 document.body에 그려져 입력칸의 DOM 하위가 아니므로, "바깥 클릭" 판정도
    // 입력칸(inputRef)과 목록(listRef) 둘 다를 확인해야 한다(MaterialMatchRow와 동일한 이유).
    function onClickOutside(e: MouseEvent) {
      if (inputRef.current?.contains(e.target as Node)) return;
      if (listRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setSearch(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    function updatePos() {
      if (inputRef.current) setPos(계산_드롭다운위치(inputRef.current, 280));
    }
    updatePos();
    // capture=true — 이 입력칸을 담은 스크롤 컨테이너(다이얼로그 등)의 스크롤 이벤트는 버블링되지
    // 않으므로, window에서 캡처링 단계로 잡아야 어떤 조상이 스크롤돼도 좌표를 다시 계산할 수 있다.
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open]);

  const filtered = useMemo(
    () => (search === null ? options : options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))),
    [options, search]
  );

  // focus와 click 둘 다에 건다 — 옵션 클릭 시 onMouseDown에서 preventDefault로 입력창이
  // blur되지 않게 막아두기 때문에(클릭 순서 보장 목적), 이미 포커스된 채로 다시 클릭해도
  // 브라우저가 focus 이벤트를 새로 안 쏨. click까지 같이 걸어야 "선택 후 다시 클릭"에도
  // 목록이 다시 열린다(2026-07-19 실측으로 발견).
  //
  // search를 null이 아니라 현재 값으로 채운다(2026-08-24 수정) — 예전엔 null(=필터 없음, 전체
  // 표시)로 고정해뒀었는데, 그러면 타이핑으로 검색해 좁혀놓은 뒤 화면을 다시 클릭(스크롤 등)하기만
  // 해도 필터가 통째로 풀려 무관한 후보가 전부 나타나는 문제가 있었음(실사용 제보). 현재 값으로
  // 필터를 채워도 el.select()가 전체 선택해두므로 그대로 타이핑하면 바로 새로 필터링되고, 값이
  // 비어있으면 filter()가 자연히 전체 후보를 보여줘 2026-07-19에 고쳤던 문제도 그대로 해결됨.
  function openFullList(el: HTMLInputElement) {
    setOpen(true);
    setSearch(el.value);
    setPos(계산_드롭다운위치(el, 280));
    el.select(); // 클릭 시 기존 값 전체 선택(SKILL-08과 동일한 관례) — 바로 새로 타이핑 가능
  }

  function handleInputChange(v: string) {
    onChange(v);
    setSearch(v);
    setOpen(true);
  }

  function selectOption(opt: string) {
    onChange(opt);
    setSearch(null);
    setOpen(false);
  }

  return (
    <div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={(e) => openFullList(e.target)}
        onClick={(e) => openFullList(e.currentTarget)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={className}
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
            className="z-50 overflow-auto rounded-md border border-gray-200 bg-white text-sm shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            {filtered.map((opt) => (
              <li
                key={opt}
                onMouseDown={(e) => {
                  e.preventDefault(); // input의 blur보다 먼저 클릭이 처리되게 함
                  selectOption(opt);
                }}
                className="cursor-pointer px-3 py-1.5 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {opt}
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
}
