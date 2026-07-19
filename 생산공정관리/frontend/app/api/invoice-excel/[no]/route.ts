import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// 프로젝트 첫 "바이너리 파일" 프록시 — GET /거래명세서엑셀/{no}가 JWT(Authorization 헤더)로
// 보호되어 있어, 브라우저가 FastAPI 주소를 직접 열 수 없다(httpOnly 쿠키는 브라우저 JS·직접
// 네비게이션 모두에서 FastAPI 쪽 헤더로 자동 변환되지 않음). 다른 프록시(JSON)와 달리 여기서는
// res.json() 대신 바이너리(arrayBuffer)로 그대로 스트리밍해 돌려준다.
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/invoice-excel/[no]">
) {
  const { no } = await params;

  const res = await fastapiFetch(`/거래명세서엑셀/${encodeURIComponent(no)}`);

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: "다운로드 처리 중 오류가 발생했습니다" }));
    return NextResponse.json(data, { status: res.status });
  }

  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":
        res.headers.get("Content-Type") ??
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": res.headers.get("Content-Disposition") ?? `attachment; filename="${no}.xlsx"`,
    },
  });
}
