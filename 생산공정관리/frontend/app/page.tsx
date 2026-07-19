import { redirect } from "next/navigation";
import { fastapiFetch } from "@/lib/fastapi";
import Dashboard, {
  type 운영통계행,
  type 미발행행,
  type 발행행,
  type 거래처행,
  type 단가행,
} from "@/components/Dashboard";

type 원본행 = 운영통계행 & Record<string, unknown>;
type 미발행원본행 = 미발행행 & Record<string, unknown>;
type 발행원본행 = 발행행 & Record<string, unknown>;
type 거래처원본행 = 거래처행 & Record<string, unknown>;
type 단가원본행 = 단가행 & Record<string, unknown>;

export default async function Home() {
  const [summaryRes, invoiceRes, issuedRes, clientRes, pricingRes] = await Promise.all([
    fastapiFetch("/summary"),
    fastapiFetch("/미발행목록"),
    fastapiFetch("/발행목록"),
    fastapiFetch("/거래처마스터"),
    fastapiFetch("/단가마스터"),
  ]);

  if (
    summaryRes.status === 401 ||
    invoiceRes.status === 401 ||
    issuedRes.status === 401 ||
    clientRes.status === 401 ||
    pricingRes.status === 401
  )
    redirect("/login");
  if (!summaryRes.ok) {
    throw new Error(`작업현황 데이터를 불러오지 못했습니다 (status ${summaryRes.status})`);
  }
  if (!invoiceRes.ok) {
    throw new Error(`미발행 목록을 불러오지 못했습니다 (status ${invoiceRes.status})`);
  }
  if (!issuedRes.ok) {
    throw new Error(`발행 목록을 불러오지 못했습니다 (status ${issuedRes.status})`);
  }
  if (!clientRes.ok) {
    throw new Error(`거래처 마스터를 불러오지 못했습니다 (status ${clientRes.status})`);
  }
  if (!pricingRes.ok) {
    throw new Error(`단가 정보를 불러오지 못했습니다 (status ${pricingRes.status})`);
  }

  const raw: 원본행[] = await summaryRes.json();

  // 화면에서 실제로 쓰는 필드만 추려서 클라이언트로 넘김 (전체 26개 컬럼 대신 10개만 전송)
  const rows: 운영통계행[] = raw.map((r) => ({
    연월: String(r.연월 ?? ""),
    날짜: String(r.날짜 ?? ""),
    사업부: String(r.사업부 ?? ""),
    거래처명: String(r.거래처명 ?? ""),
    마케팅담당자: String(r.마케팅담당자 ?? ""),
    등록자: r.등록자 != null ? String(r.등록자) : "",
    업무명: String(r.업무명 ?? ""),
    출력페이지: Number(r.출력페이지 ?? 0),
    장수: Number(r.장수 ?? 0),
    건수: Number(r.건수 ?? 0),
    확정청구페이지: Number(r.확정청구페이지 ?? 0),
    시간대: r.시간대 != null ? Number(r.시간대) : null,
    업무의뢰서번호: String(r.업무의뢰서번호 ?? ""),
    업무명상세: String(r.업무명상세 ?? ""),
    작업내역서상세: r.작업내역서상세 != null ? String(r.작업내역서상세) : "",
    P수: String(r.P수 ?? ""),
    작업명: r.작업명 != null ? String(r.작업명) : "",
  }));

  const rawInvoice: 미발행원본행[] = await invoiceRes.json();
  const invoiceRows: 미발행행[] = rawInvoice.map((r) => ({
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
  }));

  const rawIssued: 발행원본행[] = await issuedRes.json();
  const issuedRows: 발행행[] = rawIssued.map((r) => ({
    의뢰서번호: String(r.의뢰서번호 ?? ""),
    거래명세서번호: String(r.거래명세서번호 ?? ""),
    발송여부: Number(r.발송여부 ?? 0) === 1 ? 1 : 0,
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
  }));

  const rawClients: 거래처원본행[] = await clientRes.json();
  const clientRows: 거래처행[] = rawClients.map((r) => ({
    거래처명: String(r.거래처명 ?? ""),
    사업자등록번호: r.사업자등록번호 != null ? String(r.사업자등록번호) : "",
    수신이메일: r.수신이메일 != null ? String(r.수신이메일) : "",
    비고: r.비고 != null ? String(r.비고) : "",
    등록일: String(r.등록일 ?? ""),
    수정일: String(r.수정일 ?? ""),
  }));

  const rawPricing: 단가원본행[] = await pricingRes.json();
  const pricingRows: 단가행[] = rawPricing.map((r) => ({
    id: Number(r.id ?? 0),
    거래처명: String(r.거래처명 ?? ""),
    업무명: r.업무명 != null ? String(r.업무명) : "",
    작업명: r.작업명 != null ? String(r.작업명) : "",
    출력단가: Number(r.출력단가 ?? 0),
    봉입단가: Number(r.봉입단가 ?? 0),
    추가봉입단가: Number(r.추가봉입단가 ?? 0),
    용지제작단가: Number(r.용지제작단가 ?? 0),
    봉투제작단가: Number(r.봉투제작단가 ?? 0),
    삽지제작단가: Number(r.삽지제작단가 ?? 0),
    각대대봉투단가: Number(r.각대대봉투단가 ?? 0),
    각대대봉투봉입단가: Number(r.각대대봉투봉입단가 ?? 0),
    비고: r.비고 != null ? String(r.비고) : "",
    등록일: String(r.등록일 ?? ""),
    수정일: String(r.수정일 ?? ""),
  }));

  return (
    <Dashboard
      rows={rows}
      invoiceRows={invoiceRows}
      issuedRows={issuedRows}
      clientRows={clientRows}
      pricingRows={pricingRows}
    />
  );
}
