# 맞춤약관 생성 — 작업 이력 (CHANGELOG)

> 완료된 작업 기록 및 다음 할 일을 관리합니다.
> CLAUDE.md 관리 지침에 따라 이 파일에만 이력을 기록합니다.

---

## ✅ 완료된 작업

- [x] 프로젝트 시작
- [x] XML/XSL 파일 구조 분석 (2026-05-23)
- [x] 보통약관 계층 구조 파악: 관 → 조 (2026-05-23)
- [x] 특약 계층 구조 파악: 장 → 특약명(TABLE) → 조 (2026-05-23)
- [x] 엑셀 조건표 분석 및 KEY 구조 확정 (2026-05-23)
- [x] 맞춤약관 생성 알고리즘 방향 확정: 삭제 방식 (2026-05-23)
- [x] 엑셀 조건표 파싱 (담보코드 ↔ 목차명 딕셔너리) — SKILL-01 (2026-05-23)
- [x] 엑셀 목차명 ↔ XML 텍스트 일치 검증 — 76개 100% 완전 일치 (2026-05-23)
- [x] XML 특약별 시작~끝 범위 탐색 — 41개 담보코드 매핑 (2026-05-23)
- [x] 삭제 로직 구현 및 테스트 — `05_generate_맞춤약관.py` (2026-05-23)
- [x] TOC(목차) 정리 — 삭제 특약 항목 + 서브항목 제거 (2026-05-23)
- [x] 한컴오피스 COM PDF 생성 — `06_generate_pdf_com.py` (2026-05-23)
- [x] 임시 HTML 미리보기 — `임시_weasyprint_pdf생성.py` (2026-05-23)
- [x] 폴더 구조 정리 — data/scripts/output/work/docs 분리 (2026-05-24)
- [x] 스크립트 경로 동적화 — BASE_DIR 하드코딩 → `__file__` 기준 자동 계산 (2026-05-24)
- [x] CLAUDE.md 구조 개선 — 관리 지침 추가, 이력 분리 (2026-05-26)
- [x] 06_generate_pdf_com.py 수정 — XHwpWindows try/except, time.sleep(2) 추가 (2026-05-26)
- [x] 05_generate_맞춤약관.py 수정 — XSL href 상대경로 자동 변환 (output/ 기준) (2026-05-26)
- [x] COM PDF 생성 실패 원인 파악 — HWPML SubVersion 불일치 (XML:10.0.0.0 vs 한컴 2010) (2026-05-26)

---

## 📝 작업 이력

### 2026-05-23 — XML/XSL 파일 구조 분석
- XML(본문+구조) + XSL(서식 CSS 정의) 분리 구조 확인
- 약관 조항 계층(관/조) 구분 기준 파악 (ParaShape/CharShape ID + 텍스트 패턴)
- 산출물: `docs/XML-XSL-구조-KNOWLEDGE.md`

### 2026-05-23 — 엑셀 조건표 분석 및 알고리즘 확정
- XML `<INDEXMARK>` 태그(19개)는 전체 특약 커버 불가 → 엑셀 조건표를 마스터 데이터로 확정
- KEY 구조: 상품코드(L3912/L3913) + 담보코드(LK501G 등)
- 알고리즘: 삭제 방식 (전체 − L00000 − 가입자 담보코드)

### 2026-05-23 — 검증 + 범위 탐색 + 삭제 로직 구현
- `03_validate_toc.py`: 엑셀 76개 목차명 ↔ XML 완전 일치 100% 확인
- `04_build_range_map.py`: 41개 담보코드 범위 매핑, LN531G 다중 범위 지원
- `05_generate_맞춤약관.py`: 담보코드 입력 → 미가입 특약 삭제 → XML 생성
  - 장(章) 헤더 보호: `indices_to_delete.discard(header_idx)`
  - TOC 서브항목 삭제: 그룹 상태 추적 방식

### 2026-05-23 — PDF 생성 구현
- `06_generate_pdf_com.py`: 한컴오피스 COM 자동화 (버전 자동 감지, 편집 금지, 서브셋 임베딩)
- `임시_weasyprint_pdf생성.py`: XSLT → HTML 미리보기 (CSS 주석 제거 처리 포함)

### 2026-05-24 — 폴더 구조 정리
- data / scripts(번호 prefix) / output / work / docs/results 로 분리
- 전체 스크립트 내부 경로 업데이트

### 2026-05-24 — 스크립트 경로 동적화 (다중 컴퓨터 대응)
- 기존 하드코딩 `BASE_DIR = r"C:\WORK드라이브\..."` → `os.path.dirname(__file__)` 기반 자동 계산으로 전환
- 수정 파일: 01, 03, 04, 05, 06, 임시_weasyprint (6개 전체)
- 03/04/05는 `import os` 미포함 상태였으므로 추가
- `01_format_xml.py`의 `input_path`(원본 XML 소스)는 컴퓨터마다 위치가 달라 수동 설정 유지
- 효과: 프로젝트 폴더를 복사하면 어느 PC·어느 드라이브에서도 경로 수정 없이 바로 실행 가능

### 2026-05-26 — CLAUDE.md 구조 개선
- 공식 가이드(200줄 이하) 기준으로 리팩터링
- 작업 이력·완료 체크리스트·다음 할 일 → 이 파일(CHANGELOG.md)로 분리
- CLAUDE.md에 관리 지침 섹션 추가
- 메모리 파일 경로 수정 (shk → hyunkyung)

### 2026-05-26 — COM PDF 생성 디버깅

**증상:** `hwp.SaveAs("PDF")` 호출 시 `-2147023170 RPC 크래시`

**원인 분석 과정:**
1. `XHwpWindows.Item(0).Visible = False` → 한컴 2010 미지원, try/except 처리
2. SaveAs 옵션 문자열(`Security:1` 등) → 한컴 2010 크래시 유발, 옵션 제거
3. XSL 파일 경로 불일치 → `output/` 기준 상대경로(`../data/`)로 자동 변환
4. **근본 원인 확인**: HWPML `SubVersion="10.0.0.0"` (한컴 2020+)과 한컴 2010 COM 불호환
   - 하위버전 한컴으로 상위버전 XML을 `forceopen`하면 문서 객체 불완전 → SaveAs 크래시

**수정된 파일:**
- `scripts/06_generate_pdf_com.py`: import time 추가, XHwpWindows try/except, time.sleep(2), SaveAs 옵션 제거
- `scripts/05_generate_맞춤약관.py`: XSL href를 output/ 기준 상대경로로 자동 변환

**결론:** 한컴오피스 상위버전(XML 생성 버전 이상) 설치 필요. 타 PC 이전 시 `pip install pywin32` + 폴더 복사만으로 실행 가능.

---

## ⏭ 다음 할 일

- [ ] **한컴오피스 상위버전 설치 후 `06_generate_pdf_com.py` PDF 생성 테스트** ← 최우선
  - XML SubVersion(10.0.0.0) 이상 버전 설치 필요
  - 타 PC(상위버전 설치됨) 또는 현재 PC 업그레이드 후 진행
  - 성공 시 SaveAs 옵션(`Embedding:1;Security:1;Resolution:300;`) 재적용 검토
- [ ] `05_generate_맞춤약관.py` + `06_generate_pdf_com.py` 통합 실행 스크립트 구현
- [ ] 담보코드를 외부(엑셀·CSV 등)에서 읽어오는 인터페이스 추가 검토
