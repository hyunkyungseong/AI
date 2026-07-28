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
  // 5개 요청 전부 즉시 시작(네트워크 병렬성 유지) — await는 가장 가볍고 빠른 것 하나만.
  const summaryResPromise = fastapiFetch("/summary");
  const invoiceResPromise = fastapiFetch("/미발행목록");
  const issuedResPromise = fastapiFetch("/발행목록");
  const clientResPromise = fastapiFetch("/거래처마스터");
  const pricingResPromise = fastapiFetch("/단가마스터");

  // 인증 확인은 가장 가벼운 호출(단순 SELECT, pandas 집계 없음) 하나만 기다려서 처리 —
  // 나머지 4개는 아래에서 Promise째로 Dashboard에 넘겨 각자 스트리밍되게 한다.
  const clientRes = await clientResPromise;
  if (clientRes.status === 401) redirect("/login");
  if (!clientRes.ok) {
    throw new Error(`거래처 마스터를 불러오지 못했습니다 (status ${clientRes.status})`);
  }
  const rawClients: 거래처원본행[] = await clientRes.json();
  const clientRows: 거래처행[] = rawClients.map((r) => ({
    거래처명: String(r.거래처명 ?? ""),
    사업자등록번호: r.사업자등록번호 != null ? String(r.사업자등록번호) : "",
    수신이메일: r.수신이메일 != null ? String(r.수신이메일) : "",
    비고: r.비고 != null ? String(r.비고) : "",
    등록일: String(r.등록일 ?? ""),
    수정일: String(r.수정일 ?? ""),
  }));

  async function loadSummary(): Promise<운영통계행[]> {
    const res = await summaryResPromise;
    if (!res.ok) {
      throw new Error(`작업현황 데이터를 불러오지 못했습니다 (status ${res.status})`);
    }
    const raw: 원본행[] = await res.json();
    // 화면에서 실제로 쓰는 필드만 추려서 클라이언트로 넘김 (전체 26개 컬럼 대신 10개만 전송)
    return raw.map((r) => ({
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
  }

  async function loadInvoice(): Promise<미발행행[]> {
    const res = await invoiceResPromise;
    if (!res.ok) {
      throw new Error(`미발행 목록을 불러오지 못했습니다 (status ${res.status})`);
    }
    const raw: 미발행원본행[] = await res.json();
    return raw.map((r) => ({
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
  }

  async function loadIssued(): Promise<발행행[]> {
    const res = await issuedResPromise;
    if (!res.ok) {
      throw new Error(`발행 목록을 불러오지 못했습니다 (status ${res.status})`);
    }
    const raw: 발행원본행[] = await res.json();
    return raw.map((r) => ({
      의뢰서번호: String(r.의뢰서번호 ?? ""),
      거래명세서번호: String(r.거래명세서번호 ?? ""),
      발송여부: Number(r.발송여부 ?? 0) === 1 ? 1 : 0,
      편집여부: Number(r.편집여부 ?? 0) === 1 ? 1 : 0,
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
  }

  async function loadPricing(): Promise<단가행[]> {
    const res = await pricingResPromise;
    if (!res.ok) {
      throw new Error(`단가 정보를 불러오지 못했습니다 (status ${res.status})`);
    }
    const raw: 단가원본행[] = await res.json();
    return raw.map((r) => ({
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
      비고: r.비고 != null ? String(r.비고) : "",
      등록일: String(r.등록일 ?? ""),
      수정일: String(r.수정일 ?? ""),
    }));
  }

  return (
    <Dashboard
      clientRows={clientRows}
      summaryPromise={loadSummary()}
      invoicePromise={loadInvoice()}
      issuedPromise={loadIssued()}
      pricingPromise={loadPricing()}
    />
  );
}
