"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

// Streamlit st.multiselect와 비슷한 느낌: 선택 항목은 칩으로 표시, 입력창에 검색어를 치면 드롭다운이 좁혀짐
export default function MultiSelectCombo({ label, options, selected, onChange, placeholder = "전체" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(query.toLowerCase()) && !selected.includes(o)),
    [options, query, selected]
  );

  function add(opt: string) {
    onChange([...selected, opt]);
    setQuery("");
  }

  function remove(opt: string) {
    onChange(selected.filter((s) => s !== opt));
  }

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      <div
        onClick={() => setOpen(true)}
        className="flex min-h-[34px] flex-wrap items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 focus-within:border-gray-500 dark:border-gray-700 dark:bg-gray-800"
      >
        {selected.map((s) => (
          <span
            key={s}
            className="flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700 dark:bg-gray-700 dark:text-gray-200"
          >
            {s}
            <button
              type="button"
              aria-label={`${s} 제거`}
              onClick={(e) => {
                e.stopPropagation();
                remove(s);
              }}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-100"
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? placeholder : ""}
          className="min-w-[40px] flex-1 bg-transparent text-xs text-gray-900 outline-none dark:text-gray-100"
        />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white text-xs shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {filtered.map((opt) => (
            <li
              key={opt}
              onClick={() => add(opt)}
              className="cursor-pointer px-2 py-1.5 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
