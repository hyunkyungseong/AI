import type { 거래처행, 단가행, 자재단가행, 미발행행 } from "@/components/Dashboard";

type Rec = Record<string, unknown>;

function mapMaterialPriceRow(r: Rec): 자재단가행 {
  const 매칭 = Array.isArray(r.매칭자재) ? (r.매칭자재 as Rec[]) : [];
  return {
    id: Number(r.id ?? 0),
    단가마스터_id: Number(r.단가마스터_id ?? 0),
    코드: (r.코드 as 자재단가행["코드"]) ?? "출력자재비",
    단가: Number(r.단가 ?? 0),
    표시명: r.표시명 != null ? String(r.표시명) : null,
    비고: r.비고 != null ? String(r.비고) : null,
    매칭자재: 매칭.map((m) => ({
      자재코드: m.자재코드 != null ? Number(m.자재코드) : null,
      자재명: m.자재명 != null ? String(m.자재명) : null,
    })),
  };
}

// app/page.tsx(최초 로그인 직후 서버 컴포넌트 로딩)와 탭 재방문 시 재조회하는 여러 API Route
// Handler(client-list·pricing-list·invoice-list 등, 2026-08-09 신규)가 FastAPI 원본 JSON을
// 프론트 타입으로 바꾸는 로직을 공유하기 위한 모듈 — 두 곳에 각각 복사해두면 필드 하나 추가될
// 때마다 한쪽만 고치고 놓치는 문제(SKILL-27과 동일한 종류)가 생기므로 여기 하나만 둔다.
// Route Handler·서버 컴포넌트 둘 다 Next.js 서버 런타임에서 실행되므로 그대로 import해서 쓸 수 있다.

export function mapClientRow(r: Rec): 거래처행 {
  return {
    거래처명: String(r.거래처명 ?? ""),
    사업자등록번호: r.사업자등록번호 != null ? String(r.사업자등록번호) : "",
    수신이메일: r.수신이메일 != null ? String(r.수신이메일) : "",
    비고: r.비고 != null ? String(r.비고) : "",
    등록일: String(r.등록일 ?? ""),
    수정일: String(r.수정일 ?? ""),
  };
}

export function mapPricingRow(r: Rec): 단가행 {
  return {
    id: Number(r.id ?? 0),
    거래처명: String(r.거래처명 ?? ""),
    업무명: r.업무명 != null ? String(r.업무명) : "",
    작업명: r.작업명 != null ? String(r.작업명) : "",
    출력단가: Number(r.출력단가 ?? 0),
    봉입단가: Number(r.봉입단가 ?? 0),
    추가봉입단가: Number(r.추가봉입단가 ?? 0),
    동봉물삽입단가: Number(r.동봉물삽입단가 ?? 0),
    용지제작단가: Number(r.용지제작단가 ?? 0),
    봉투제작단가: Number(r.봉투제작단가 ?? 0),
    삽지제작단가: Number(r.삽지제작단가 ?? 0),
    각대대봉투단가: Number(r.각대대봉투단가 ?? 0),
    각대대봉투봉입단가: Number(r.각대대봉투봉입단가 ?? 0),
    부가세구분: r.부가세구분 === "포함" ? "포함" : "별도",
    인쇄면: r.인쇄면 === "단면" ? "단면" : "양면",
    비고: r.비고 != null ? String(r.비고) : "",
    등록일: String(r.등록일 ?? ""),
    수정일: String(r.수정일 ?? ""),
    자재단가목록: Array.isArray(r.자재단가목록) ? (r.자재단가목록 as Rec[]).map(mapMaterialPriceRow) : [],
  };
}

export function mapInvoiceRow(r: Rec): 미발행행 {
  return {
    의뢰서번호: String(r.의뢰서번호 ?? ""),
    담당자: String(r.담당자 ?? ""),
    사업부: String(r.사업부 ?? ""),
    거래처명: String(r.거래처명 ?? ""),
    업무명: String(r.업무명 ?? ""),
    업무명상세: String(r.업무명상세 ?? ""),
    작업일자: String(r.작업일자 ?? ""),
    청구페이지: Number(r.청구페이지 ?? 0),
    장수: Number(r.장수 ?? 0),
    봉입건수: Number(r.봉입건수 ?? 0),
    용지수량: Number(r.용지수량 ?? 0),
    봉투수량: Number(r.봉투수량 ?? 0),
    삽지수량: Number(r.삽지수량 ?? 0),
    예상공급가액: r.예상공급가액 != null ? Number(r.예상공급가액) : null,
  };
}
