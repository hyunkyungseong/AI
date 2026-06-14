from contextlib import asynccontextmanager
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import text
from database import engine, env잠금, env잠금해제
from auth import api_key_인증


@asynccontextmanager
async def lifespan(app: FastAPI):
    env잠금()          # 서버 시작 시 .env 잠금
    yield
    env잠금해제()      # 서버 종료 시 .env 잠금 해제


app = FastAPI(title="공정관리 API 서버", lifespan=lifespan)


# ── 데이터 구조 정의 ─────────────────────────────────────────

class 공정등록요청(BaseModel):
    process_no:   str            # 공정번호  예) P-2024-001
    worker:       str            # 작업자    예) 홍길동
    product_code: str            # 제품코드  예) PROD-A
    quantity:     int            # 수량      예) 150
    status:       Optional[str] = "완료"          # 상태 (완료/불량/보류)


class 공정등록응답(BaseModel):
    result:     str
    id:         int
    process_no: str


class 공정일괄등록응답(BaseModel):
    result:      str
    총건수:      int
    저장된건수:  int
    실패건수:    int
    상세: List[dict]


# ── API 엔드포인트 ───────────────────────────────────────────

@app.get("/", summary="서버 상태 확인")
def 루트():
    return {"message": "공정관리 API 서버 작동 중", "status": "정상"}


@app.post("/process", response_model=공정등록응답, summary="공정 실적 등록")
def 공정등록(data: 공정등록요청, _=Depends(api_key_인증)):
    """공정관리시스템으로부터 공정 실적 데이터를 받아 DB에 저장합니다."""
    sql = text("""
        INSERT INTO process_log (process_no, worker, product_code, quantity, status, completed_at)
        VALUES (:process_no, :worker, :product_code, :quantity, :status, NOW())
    """)

    with engine.connect() as conn:
        result = conn.execute(sql, {
            "process_no":   data.process_no,
            "worker":       data.worker,
            "product_code": data.product_code,
            "quantity":     data.quantity,
            "status":       data.status,
        })
        conn.commit()
        new_id = result.lastrowid

    return 공정등록응답(result="저장 완료", id=new_id, process_no=data.process_no)


@app.post("/process/batch", response_model=공정일괄등록응답, summary="공정 실적 일괄 등록")
def 공정일괄등록(data: List[공정등록요청], _=Depends(api_key_인증)):
    """여러 건의 공정 실적을 한 번에 받아 DB에 저장합니다."""
    if not data:
        raise HTTPException(status_code=400, detail="데이터가 비어있습니다")
    if len(data) > 1000:
        raise HTTPException(status_code=400, detail="한 번에 최대 1000건까지 가능합니다")

    sql = text("""
        INSERT INTO process_log (process_no, worker, product_code, quantity, status, completed_at)
        VALUES (:process_no, :worker, :product_code, :quantity, :status, NOW())
    """)

    성공 = []
    실패 = []

    with engine.connect() as conn:
        for item in data:
            try:
                result = conn.execute(sql, {
                    "process_no":   item.process_no,
                    "worker":       item.worker,
                    "product_code": item.product_code,
                    "quantity":     item.quantity,
                    "status":       item.status,
                })
                성공.append({"process_no": item.process_no, "id": result.lastrowid, "result": "저장 완료"})
            except Exception as e:
                실패.append({"process_no": item.process_no, "result": f"실패: {str(e)}"})
        conn.commit()

    return 공정일괄등록응답(
        result="일괄 저장 완료",
        총건수=len(data),
        저장된건수=len(성공),
        실패건수=len(실패),
        상세=성공 + 실패,
    )


@app.get("/process", summary="공정 실적 목록 조회")
def 공정목록(_=Depends(api_key_인증)):
    """저장된 공정 실적 전체를 조회합니다."""
    sql = text("SELECT * FROM process_log ORDER BY created_at DESC LIMIT 100")
    with engine.connect() as conn:
        rows = conn.execute(sql).mappings().all()
    return {"total": len(rows), "data": [dict(r) for r in rows]}


@app.get("/process/{id}", summary="공정 실적 단건 조회")
def 공정단건조회(id: int, _=Depends(api_key_인증)):
    """ID로 특정 공정 실적을 조회합니다."""
    sql = text("SELECT * FROM process_log WHERE id = :id")
    with engine.connect() as conn:
        row = conn.execute(sql, {"id": id}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail=f"ID {id} 에 해당하는 공정 실적이 없습니다")
    return dict(row)
