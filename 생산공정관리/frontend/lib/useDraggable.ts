import { useCallback, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

// 창이 화면 가장자리 밖으로 나가도 최소한 이만큼(px)은 화면 안에 남겨 다시 잡을 수 있게 한다.
const 최소노출 = 80;

// 제목줄(손잡이)에 덧붙일 클래스 — 이동 커서 + 끌 때 글자 선택 방지 + 터치 시 화면 스크롤 방지.
export const 손잡이클래스 = "cursor-move select-none touch-none";

type 끌기상태 = {
  포인터ID: number;
  시작X: number;
  시작Y: number;
  원래X: number;
  원래Y: number;
  최소X: number;
  최대X: number;
  최소Y: number;
  최대Y: number;
};

const 범위 = (v: number, 최소: number, 최대: number) => Math.min(Math.max(v, 최소), Math.max(최소, 최대));

// 팝업 창을 제목줄로 끌어서 옮기는 공용 훅(2026-11-15, 사용자 요청 — 팝업이 화면 가운데에 고정돼
// 뒤 화면을 볼 수 없음). 7개 팝업이 같이 쓴다(Banner.tsx처럼 공용화, SKILL-42).
//
// 쓰는 법: const { attachPanel, panelStyle, handleProps } = useDraggable();
//   흰 창:   <div ref={attachPanel} style={panelStyle} ...>
//   제목줄:  <h2 {...handleProps} className={`... ${손잡이클래스}`}>
//
// - 이동은 transform이 아니라 position:relative + left/top으로 한다. transform을 쓰면 창 안의
//   position:fixed 요소의 기준점이 화면→창으로 바뀌어 엉뚱한 곳에 뜰 수 있기 때문.
// - 창이 화면 밖으로 사라지지 않게: 위쪽은 창 윗변이 화면 위로 못 나가고(제목줄 보존), 좌·우·아래는
//   최소노출만큼 남긴다. 범위는 누르는 순간의 창 위치·크기로 계산한다.
// - 제목줄 더블클릭 = 가운데로 복귀. 위치는 기억하지 않는다 — 창이 닫혀 흰 창이 화면에서 빠지는
//   순간 0,0으로 되돌린다. ConfirmDialog·ClientFormDialog·PricingFormDialog는 닫혀도 컴포넌트가
//   남아 있고(`if (!open) return null`) 상태도 남기 때문에, 이 처리가 없으면 다시 열 때 마지막
//   위치에서 열린다. attachPanel은 useCallback으로 고정된 콜백 ref라 창이 붙을 때·빠질 때만 불린다.
// - 제목줄 안의 버튼·입력칸을 누르면 끌기를 시작하지 않는다(클릭이 평소대로 동작).
// - ⚠️ 반환값은 반드시 구조분해로 받을 것: `const x = useDraggable()` 후 `ref={x.attachPanel}`처럼
//   쓰면 react-hooks/refs 린트가 x 전체를 ref로 간주해 `x.panelStyle`·`x.handleProps`까지 "렌더 중
//   ref 읽기" 오류로 막는다. 같은 이유로 내부도 useRef 없이 useState만 쓴다(2026-11-15 eslint 확인).
export function useDraggable<T extends HTMLElement = HTMLDivElement>() {
  const [창, set창] = useState<T | null>(null);
  const [끌기, set끌기] = useState<끌기상태 | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const attachPanel = useCallback((node: T | null) => {
    set창(node);
    if (!node) {
      set끌기(null);
      setOffset((o) => (o.x === 0 && o.y === 0 ? o : { x: 0, y: 0 }));
    }
  }, []);

  function onPointerDown(e: ReactPointerEvent<HTMLElement>) {
    if (e.button !== 0 || !창) return;
    if ((e.target as HTMLElement).closest("button, input, select, textarea, a")) return;
    const r = 창.getBoundingClientRect();
    set끌기({
      포인터ID: e.pointerId,
      시작X: e.clientX,
      시작Y: e.clientY,
      원래X: offset.x,
      원래Y: offset.y,
      최소X: offset.x + (최소노출 - r.right),
      최대X: offset.x + (window.innerWidth - 최소노출 - r.left),
      최소Y: offset.y - r.top,
      최대Y: offset.y + (window.innerHeight - 최소노출 - r.top),
    });
    // 포인터를 손잡이에 붙잡아 두어, 빠르게 끌어 커서가 제목줄을 벗어나도 계속 따라오게 함
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLElement>) {
    const s = 끌기;
    if (!s || s.포인터ID !== e.pointerId) return;
    setOffset({
      x: 범위(s.원래X + e.clientX - s.시작X, s.최소X, s.최대X),
      y: 범위(s.원래Y + e.clientY - s.시작Y, s.최소Y, s.최대Y),
    });
  }

  function onPointerUp(e: ReactPointerEvent<HTMLElement>) {
    const s = 끌기;
    if (!s || s.포인터ID !== e.pointerId) return;
    set끌기(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  const panelStyle: CSSProperties = { position: "relative", left: offset.x, top: offset.y };

  return {
    attachPanel,
    panelStyle,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onDoubleClick: () => setOffset({ x: 0, y: 0 }),
      title: "끌어서 창을 옮길 수 있습니다 (더블클릭: 가운데로)",
    },
  };
}
