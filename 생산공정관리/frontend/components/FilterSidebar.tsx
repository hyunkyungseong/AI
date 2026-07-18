"use client";

import { useState } from "react";
import MultiSelectCombo from "./MultiSelectCombo";
import type { useFilters } from "@/lib/useFilters";

type Props = {
  filters: ReturnType<typeof useFilters>;
};

// LNB 필터 패널 — useFilters()의 상태·옵션을 그대로 받아 그리기만 하는 프리젠테이션 컴포넌트.
// 접기/펼치기 여부는 필터 값과 무관한 순수 UI 상태라 이 컴포넌트 자신이 들고 있음
// (탭마다 FilterSidebar를 따로 마운트하면 접기 상태도 자동으로 탭별 독립됨).
export default function FilterSidebar({ filters }: Props) {
  const [필터표시, set필터표시] = useState(true);
  const {
    사업부,
    set사업부,
    시작일,
    set시작일,
    종료일,
    set종료일,
    담당자,
    set담당자,
    거래처,
    set거래처,
    업무명,
    set업무명,
    담당자옵션,
    거래처옵션,
    업무명옵션,
    필터초기화,
  } = filters;

  if (!필터표시) {
    return (
      <button
        type="button"
        onClick={() => set필터표시(true)}
        title="필터 보이기"
        aria-label="필터 보이기"
        className="ml-2 mt-4 h-8 w-8 shrink-0 self-start rounded-md border border-gray-300 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        ▶
      </button>
    );
  }

  return (
    <aside className="w-64 shrink-0 space-y-4 border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">🔍 필터</h2>
        <button
          type="button"
          onClick={() => set필터표시(false)}
          title="필터 숨기기"
          aria-label="필터 숨기기"
          className="rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          ◀
        </button>
      </div>

      <MultiSelectCombo label="사업부" options={["DM사업부", "N사업부"]} selected={사업부} onChange={set사업부} />

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">조회기간</label>
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={시작일}
            onChange={(e) => set시작일(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-1.5 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            value={종료일}
            onChange={(e) => set종료일(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-1.5 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
      </div>

      <MultiSelectCombo label="담당자" options={담당자옵션} selected={담당자} onChange={set담당자} />
      <MultiSelectCombo label="거래처" options={거래처옵션} selected={거래처} onChange={set거래처} />
      <MultiSelectCombo label="업무명" options={업무명옵션} selected={업무명} onChange={set업무명} />

      <button
        type="button"
        onClick={필터초기화}
        className="text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        필터 초기화
      </button>
    </aside>
  );
}
