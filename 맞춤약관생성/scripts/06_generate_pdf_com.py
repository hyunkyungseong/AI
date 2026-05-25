"""
맞춤약관 PDF 생성 — 한컴오피스 COM 자동화
- 맞춤약관_출력.xml 을 한컴오피스로 열어 PDF로 저장합니다.
- 서식이 원본 HWP와 100% 동일하게 출력됩니다.
- 사전 조건: 한컴오피스(한글 2010 이상)가 설치되어 있어야 합니다.
"""

import os
import win32com.client

# ════════════════════════════════════════════════════════════════
#  ★ 경로 설정
# ════════════════════════════════════════════════════════════════
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
XML_PATH = os.path.join(BASE_DIR, "output", "맞춤약관_출력.xml")
OUT_PDF  = os.path.join(BASE_DIR, "output", "맞춤약관_출력.pdf")
# ════════════════════════════════════════════════════════════════

# 한컴오피스 버전별 COM ProgID 목록 (최신 버전부터 시도)
COM_IDS = [
    "HWPFrame.HwpObject",   # 한컴오피스 2014 이상
    "Hwp.Application",      # 한컴오피스 2010
]


def get_hwp_com():
    """설치된 한컴오피스 버전에 맞는 COM 객체를 반환합니다."""
    for prog_id in COM_IDS:
        try:
            hwp = win32com.client.Dispatch(prog_id)
            print(f"  ->COM 연결 성공: {prog_id}")
            return hwp
        except Exception:
            continue
    raise RuntimeError(
        "한컴오피스 COM 객체를 찾을 수 없습니다.\n"
        "한컴오피스(한글 2010 이상)가 설치되어 있는지 확인하세요."
    )


print("=" * 60)
print("맞춤약관 PDF 생성 (한컴오피스 COM)")
print("=" * 60)

# ── 입력 파일 존재 확인 ───────────────────────────────────────
if not os.path.exists(XML_PATH):
    print(f"\n[오류] 입력 파일이 없습니다: {XML_PATH}")
    print("먼저 generate_맞춤약관.py 를 실행하여 맞춤약관_출력.xml 을 생성하세요.")
    exit(1)

# ── 1. 한컴오피스 COM 연결 ────────────────────────────────────
print("\n[1단계] 한컴오피스 실행 중...")
hwp = None
try:
    hwp = get_hwp_com()

    # 보안 모듈 등록 — 파일 열기 시 경로 확인 팝업 방지
    try:
        hwp.RegisterModule("FilePathCheckDLL", "SecurityModule")
        print("  ->보안 모듈 등록 완료")
    except Exception:
        # 버전에 따라 없을 수 있음 — 무시
        pass

    # 화면 표시 여부 (False = 백그라운드 실행)
    hwp.XHwpWindows.Item(0).Visible = False

    # ── 2. XML 파일 열기 ──────────────────────────────────────
    print(f"\n[2단계] XML 파일 열기 중...")
    print(f"  ->파일: {XML_PATH}")

    # HWPML2X: 한글 XML 형식 필터
    # forceopen: 오류가 있어도 강제로 열기
    result = hwp.Open(XML_PATH, "HWPML2X", "forceopen:true")
    if not result:
        raise RuntimeError("파일 열기 실패 — Open() 이 False 를 반환했습니다.")
    print("  ->열기 성공")

    # ── 3. PDF 저장 ───────────────────────────────────────────
    print(f"\n[3단계] PDF 저장 중...")
    print(f"  ->저장 경로: {OUT_PDF}")

    # PDF 저장 옵션 문자열
    # - Embedding:1   : 폰트 서브셋 임베딩 (기본값이나 명시)
    # - Security:1    : 편집 금지 (법적 문서 보호)
    # - Resolution:300: 이미지 해상도 300dpi
    pdf_option = "Embedding:1;Security:1;Resolution:300;"

    result = hwp.SaveAs(OUT_PDF, "PDF", pdf_option)
    if not result:
        # 일부 버전은 옵션 미지원 → 옵션 없이 재시도
        print("  [!] 옵션 적용 실패 — 기본 옵션으로 재시도...")
        result = hwp.SaveAs(OUT_PDF, "PDF", "")
        if not result:
            raise RuntimeError("PDF 저장 실패 — SaveAs() 가 False 를 반환했습니다.")

    if os.path.exists(OUT_PDF):
        size_kb = os.path.getsize(OUT_PDF) / 1024
        print(f"  ->저장 완료")
        print(f"  ->파일 크기: {size_kb:.1f} KB ({size_kb/1024:.1f} MB)")
    else:
        raise RuntimeError(f"PDF 파일이 생성되지 않았습니다: {OUT_PDF}")

except Exception as e:
    print(f"\n[오류] {e}")
    print("\n[해결 방법]")
    print("  1. 한컴오피스가 설치되어 있는지 확인하세요.")
    print("  2. 한컴오피스를 한 번 수동으로 실행한 후 다시 시도하세요.")
    print("  3. 오류 메시지를 그대로 복사하여 문의하세요.")

finally:
    # ── 4. 한컴오피스 종료 ────────────────────────────────────
    if hwp is not None:
        try:
            hwp.Quit()
            print("\n[4단계] 한컴오피스 종료 완료")
        except Exception:
            pass

print("\n" + "=" * 60)
print("완료!")
print(f"PDF 파일: {OUT_PDF}")
print("=" * 60)
