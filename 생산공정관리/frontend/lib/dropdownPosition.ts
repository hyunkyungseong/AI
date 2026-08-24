// 입력칸 기준 드롭다운을 아래/위 중 어디에 띄울지 계산(2026-08-16, PricingMaterialSection.tsx에서
// 처음 만들어짐 — 실사용 제보: 화면 아래쪽에 있는 입력칸에서 열면 목록이 브라우저 창 밑으로 잘려
// 안 보이던 문제). 아래쪽 여유 공간이 목록 높이(또는 위쪽 공간)보다 충분하면 아래로, 아니면 위로
// 뒤집고, 어느 쪽이든 실제 남은 공간을 넘지 않도록 max-height를 그때그때 다시 계산한다.
//
// EditableCombo.tsx(2026-08-24)에서도 같은 문제(목록이 화면 아래쪽에 있으면 잘리거나, 고정
// 높이라 브라우징하기엔 너무 짧게 보이는 문제)로 재사용하며 공용 함수로 추출 — 호출부마다 각자
// 복사해두면 한쪽만 고치고 다른 쪽을 놓치는 버그가 생기기 쉽기 때문(SKILL-42류 함정 회피).
export type DropdownPos =
  | { placement: "below"; top: number; left: number; width: number; maxHeight: number }
  | { placement: "above"; bottom: number; left: number; width: number; maxHeight: number };

export function 계산_드롭다운위치(el: HTMLElement, 기본최대높이 = 192): DropdownPos {
  const r = el.getBoundingClientRect();
  const 여백 = 8;
  const 아래공간 = window.innerHeight - r.bottom - 여백;
  const 위공간 = r.top - 여백;
  const 아래로 = 아래공간 >= 기본최대높이 || 아래공간 >= 위공간;
  const maxHeight = Math.max(80, Math.min(기본최대높이, 아래로 ? 아래공간 : 위공간));
  return 아래로
    ? { placement: "below", top: r.bottom + 4, left: r.left, width: r.width, maxHeight }
    : { placement: "above", bottom: window.innerHeight - r.top + 4, left: r.left, width: r.width, maxHeight };
}
