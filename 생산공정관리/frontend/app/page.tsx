import { redirect } from "next/navigation";
import { fastapiFetch } from "@/lib/fastapi";
import Dashboard, { type 운영통계행 } from "@/components/Dashboard";

type 원본행 = 운영통계행 & Record<string, unknown>;

export default async function Home() {
  const res = await fastapiFetch("/summary");
  if (res.status === 401) redirect("/login");
  if (!res.ok) {
    throw new Error(`작업현황 데이터를 불러오지 못했습니다 (status ${res.status})`);
  }
  const raw: 원본행[] = await res.json();

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
  }));

  return <Dashboard rows={rows} />;
}
