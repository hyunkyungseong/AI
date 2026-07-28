import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";

const DEFAULT_ROW_HEIGHT = 33; // 첫 렌더 전 임시값 — 실제 첫 행이 그려지면 실측치로 즉시 보정됨
const OVERSCAN = 8;

// 표(수천 행)를 스크롤 위치에 보이는 부분만 실제로 그리는 가상 스크롤(윈도잉) 훅.
// 행 높이가 균일한(줄바꿈 없는) 표 전용 — InvoiceSelectionTable.tsx가 4,600여 건을 한꺼번에
// DOM에 그리면서 운영 모드에서도 최초 렌더링이 9초 가까이 걸리던 문제(2026-07-23 Playwright
// 재현 확인)를 해결하기 위해 도입. react-window 등 외부 라이브러리 없이 직접 구현.
export function useVirtualRows(containerRef: RefObject<HTMLElement | null>, rowCount: number) {
  const [rowHeight, setRowHeight] = useState(DEFAULT_ROW_HEIGHT);
  const [range, setRange] = useState({ start: 0, end: Math.min(rowCount, 40) });

  // 콜백 ref — 실제 첫 행이 DOM에 붙는 순간 실측 높이로 rowHeight를 보정한다(폰트·패딩이
  // 나중에 바뀌어도 안전). useEffect가 아니라 콜백 ref라서 "매 렌더마다 실행" 걱정 없이,
  // 해당 DOM 노드가 새로 붙을 때만 자연스럽게 실행된다.
  const firstRowRef = useCallback((node: HTMLTableRowElement | null) => {
    if (!node) return;
    const h = node.getBoundingClientRect().height;
    if (h > 0) setRowHeight((prev) => (Math.abs(h - prev) > 0.5 ? h : prev));
  }, []);

  // rowCount(필터링 결과)가 바뀌면 스크롤을 맨 위로 되돌린다 — 예전 스크롤 위치가 새 목록
  // 길이보다 아래쪽이면 빈 화면만 보이는 문제 방지.
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = 0;
  }, [containerRef, rowCount]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function update() {
      if (!el) return;
      const start = Math.max(0, Math.floor(el.scrollTop / rowHeight) - OVERSCAN);
      const visibleCount = Math.ceil(el.clientHeight / rowHeight) + OVERSCAN * 2;
      const end = Math.min(rowCount, start + visibleCount);
      setRange({ start, end });
    }

    update();
    el.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [containerRef, rowHeight, rowCount]);

  return { range, rowHeight, firstRowRef };
}
