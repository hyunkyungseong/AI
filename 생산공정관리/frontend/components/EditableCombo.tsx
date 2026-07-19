"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
// 클릭/포커스 시 입력값과 무관하게 항상 전체 후보를 보여주고, 이후 타이핑부터만 필터링한다.
export default function EditableCombo({
  value,
  onChange,
  options,
  placeholder,
  className,
  "aria-label": ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  // null이면 "필터링 안 함(전체 목록 표시)" — 열자마자는 항상 이 상태. 타이핑을 시작하면
  // 그 시점부터 문자열로 바뀌어 필터링이 시작된다.
  const [search, setSearch] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = useMemo(
    () => (search === null ? options : options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))),
    [options, search]
  );

  // focus와 click 둘 다에 건다 — 옵션 클릭 시 onMouseDown에서 preventDefault로 입력창이
  // blur되지 않게 막아두기 때문에(클릭 순서 보장 목적), 이미 포커스된 채로 다시 클릭해도
  // 브라우저가 focus 이벤트를 새로 안 쏨. click까지 같이 걸어야 "선택 후 다시 클릭"에도
  // 전체 후보가 다시 열린다(2026-07-19 실측으로 발견).
  function openFullList(el: HTMLInputElement) {
    setOpen(true);
    setSearch(null); // 기존 값과 무관하게 항상 전체 후보부터 보여줌
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
    <div ref={rootRef} className="relative">
      <input
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={(e) => openFullList(e.target)}
        onClick={(e) => openFullList(e.currentTarget)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={className}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white text-sm shadow-lg dark:border-gray-700 dark:bg-gray-800">
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
        </ul>
      )}
    </div>
  );
}
