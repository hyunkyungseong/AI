// Streamlit 원본과 동일한 M단위 절삭(내림) 표기 공식: 8,990,000 → "8.99M" (반올림 아님, 소수 2자리 고정)
export function toMillionLabel(v: number): string {
  return `${(Math.floor(v / 10_000) / 100).toFixed(2)}M`;
}
