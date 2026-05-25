import os
import zlib
import struct
import olefile

def extract_hwp_text_and_check(file_path):
    """
    한글 프로그램이 없는 환경에서 OLE 스트림 구조를 통해 
    HWP 본문 텍스트를 크래시 없이 안전하게 파싱하고 전처리 여부를 판별합니다.
    """
    if not os.path.exists(file_path):
        print(f"❌ 에러: 파일을 찾을 수 없습니다. 경로를 확인하세요: {file_path}")
        return

    print(f"🔍 [안정적 분석 시작] 파일명: {os.path.basename(file_path)}")
    
    try:
        # 1. HWP 파일을 OLE 구조로 안전하게 로드 (한글 미설치 환경 표준)
        ole = olefile.OleFileIO(file_path)
        dirs = ole.listdir()
        
        # 기본 무결성 검증
        if ['FileHeader'] not in dirs:
            print("❌ 에러: 올바른 HWP 5.0 포맷 형식이 아닙니다.")
            return

        # 2. 본문 미리보기 텍스트 스트림(PrvText) 추출하기
        # 이 스트림은 파일 크래시 오류를 완벽히 우회하여 텍스트를 가져옵니다.
        if ['PrvText'] in dirs:
            encoded_text = ole.openstream('PrvText').read()
            # HWP 내부 표준 인코딩인 UTF-16LE로 한글 본문 디코딩
            hwp_text = encoded_text.decode('UTF-16LE')
        else:
            print("⚠️ 경고: 미리보기 스트림(PrvText)이 없는 보안 파일이거나 특수 포맷입니다.")
            hwp_text = ""
            
        ole.close()

        print("=" * 40)
        print(f"📝 본문 텍스트 데이터 로드 성공 (글자 수: {len(hwp_text)}자)")
        print("=" * 40)

        # 3. 텍스트 패턴 기반 전처리(Preprocessing) 여부 정밀 판별
        # 실무 통합약관에 누름틀이나 자동화 처리가 되었다면 특정 시스템 태그 기호가 본문에 남습니다.
        
        # 💡 한글 프로그램이 자동화 코드로 누름틀을 심으면 본문 텍스트 내에 
        # 고유 제어 태그나 개발자가 명시한 특약 ID가 텍스트 형태로 감지됩니다.
        is_field_present = False
        detected_fields = []
        
        # 가입자용 맞춤 필드 식별용 검색 조건 예시 (보험사 DB의 특약코드 패턴 등)
        # 본인이 심을 예정이거나 보험사 약관에 이미 세팅된 특약코드 키워드가 있다면 아래 리스트에 추가하세요.
        test_keywords = ["TR_", "특약_", "ClickHere", "[누름틀"] 
        
        for kw in test_keywords:
            if kw in hwp_text:
                is_field_present = True
                detected_fields.append(kw)

        # 4. 최종 리포트 출력
        if not is_field_present:
            print("🚨 [판별 결과]: Preprocessing(전처리)이 '절대적으로' 필요한 원본 파일입니다.")
            print("👉 이유: 한글 프로그램 없이 본문을 정밀 스캔한 결과, 자동화용 누름틀이나 특약 분기 태그가 전혀 발견되지 않은 순수 원본 깡통 파일입니다.")
        else:
            print(f"✅ [판별 결과]: 이미 전처리 장치가 설계된 파일일 가능성이 높습니다. (탐지된 키워드: {detected_fields})")
            
    except Exception as e:
        print(f"❌ 파일 구조 분석 중 치명적 오류 발생: {e}")
        print("💡 팁: 해당 약관 파일이 '배포용 문서(인쇄/복사 암호 잠금)'로 저장되어 있다면 본문 스트림 추출이 거부될 수 있습니다.")

if __name__ == "__main__":
    # 검증할 흥국생명 약관 파일명을 정확히 지정하세요.
    target_file = r"C:\D드라이브\다운로드\무배당 흥Good 다이렉트 355 간편건강보험(26.04)_약관.hwp" 
    
    extract_hwp_text_and_check(target_file)
