"use client";

import { useEffect, useMemo, useState } from "react";
import EditableCombo from "./EditableCombo";
import PricingMaterialSection from "./PricingMaterialSection";
import PricingProcessSection from "./PricingProcessSection";
import type { 단가행, 운영통계행, 자재단가행, 공정단가행 } from "@/components/Dashboard";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  justCreated?: boolean; // 방금 "새 단가 추가"를 저장하고 바로 이 수정모드로 넘어온 경우(2026-08-16)
  거래처명: string; // 부모(PricingMaster.tsx)가 넘겨주는 현재 선택된 거래처 — create/edit 둘 다 고정
  initial: 단가행 | null; // create 모드에선 null
  taskRows: 운영통계행[]; // 업무명·작업명 자동완성 후보 추출용(표시는 안 함)
  onClose: () => void;
  onCreated: (row: 단가행) => void;
  onUpdated: (
    id: number,
    patch: Pick<
      단가행,
      | "출력단가"
      | "봉입단가"
      | "추가봉입단가"
      | "동봉물삽입단가"
      | "용지제작단가"
      | "봉투제작단가"
      | "삽지제작단가"
      | "용지제작무상"
      | "봉투제작무상"
      | "삽지제작무상"
      | "각대대봉투단가"
      | "각대대봉투봉입단가"
      | "부가세구분"
      | "인쇄면"
      | "청구단위"
      | "비고"
      | "수정일"
    >
  ) => void;
  onMaterialPricesChanged: (id: number, 자재단가목록: 자재단가행[]) => void;
  onProcessPricesChanged: (id: number, 공정단가목록: 공정단가행[]) => void;
};

const label = "block text-sm text-gray-700 dark:text-gray-300";
const input =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";
const readonlyInput = `${input} cursor-not-allowed bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400`;

type 가격필드 =
  | "출력단가"
  | "봉입단가"
  | "추가봉입단가"
  | "동봉물삽입단가"
  | "각대대봉투봉입단가"
  | "용지제작단가"
  | "봉투제작단가"
  | "삽지제작단가"
  | "각대대봉투단가";

// 화면 표시 라벨은 Streamlit 원본과 동일하게 맞춤 — 각대대봉투봉입단가만 "수작업 단가"로 표시(기존
// 관례, scripts/app.py:1098 등). 순서도 Streamlit 입력 폼(app.py:1195~1204)과 동일하게 유지.
const 가격필드목록: { key: 가격필드; label: string }[] = [
  { key: "출력단가", label: "출력단가(원)" },
  { key: "봉입단가", label: "봉입단가(원)" },
  { key: "추가봉입단가", label: "추가봉입단가(원)" },
  { key: "동봉물삽입단가", label: "동봉물삽입단가(원)" },
  { key: "각대대봉투봉입단가", label: "수작업 단가(원)" },
  { key: "용지제작단가", label: "용지제작단가(원)" },
  { key: "봉투제작단가", label: "봉투제작단가(원)" },
  { key: "삽지제작단가", label: "삽지제작단가(원)" },
  { key: "각대대봉투단가", label: "각대대봉투단가(원)" },
];

// 재료비 무상(2026-08-25) — 용지제작단가·봉투제작단가·삽지제작단가와, 그 재료의 개별 단가를
// 등록하는 PricingMaterialSection.tsx의 "코드" 사이의 대응 관계. 무상 체크 시 해당 코드의 자재별
// 단가 신규 등록을 막고(정방향), 그 코드로 이미 등록된 자재단가가 있으면 무상 체크를 막는다
// (역방향) — 기본이 무상인데 특정 자재만 유상으로 등록되는 모순 방지. 상세:
// `.claude/plans/plan_재료비_무상표시.md`.
const 무상필드_코드맵: Record<"용지제작단가" | "봉투제작단가" | "삽지제작단가", 자재단가행["코드"]> = {
  용지제작단가: "출력자재비",
  봉투제작단가: "봉입자재비",
  삽지제작단가: "삽지비",
};

// 각대대봉투단가는 계산에서 더 이상 쓰이지 않는다(2026-08-17 — 큰 봉투도 그냥 "봉투제작단가" 밑에
// 자재단가(PricingMaterialSection)로 등록하는 방식으로 통합, 상세:
// `.claude/plans/plan_단가마스터_자재명정규화.md`). DB 컬럼·기존 값은 남겨두므로(이미 등록된
// 값이 있는 거래처의 값을 0으로 지우지 않기 위해) 저장 payload는 여전히 가격필드목록(전체)을
// 그대로 쓰고, 입력칸 렌더링에만 이 필터된 목록을 쓴다.
const 표시_가격필드목록 = 가격필드목록.filter((f) => f.key !== "각대대봉투단가");

// ClientFormDialog.tsx와 동일한 모달 뼈대(오버레이·Escape·formKey 리마운트로 초기화, 재동기화용
// useEffect 없음). 차이점: 업무명·작업명은 <input list>+<datalist>로 자유 입력과 기존 값 추천을
// 동시에 지원(별도 콤보박스 컴포넌트 불필요, 사용자 확정 — 실적 없는 신규 업무에도 미리 가격을
// 매길 수 있어야 함). 수정 모드에선 업무명·작업명이 읽기전용(거래처명이 [4-D]에서 그랬듯
// PUT 바디에 이 필드 자체가 없어 애초에 서버가 안 받음).
export default function PricingFormDialog({
  open,
  mode,
  justCreated,
  거래처명,
  initial,
  taskRows,
  onClose,
  onCreated,
  onUpdated,
  onMaterialPricesChanged,
  onProcessPricesChanged,
}: Props) {
  const [업무명, set업무명] = useState(initial?.업무명 ?? "");
  const [작업명, set작업명] = useState(initial?.작업명 ?? "");
  const [가격, set가격] = useState<Record<가격필드, string>>({
    출력단가: initial ? String(initial.출력단가) : "",
    봉입단가: initial ? String(initial.봉입단가) : "",
    추가봉입단가: initial ? String(initial.추가봉입단가) : "",
    동봉물삽입단가: initial ? String(initial.동봉물삽입단가) : "",
    각대대봉투봉입단가: initial ? String(initial.각대대봉투봉입단가) : "",
    용지제작단가: initial ? String(initial.용지제작단가) : "",
    봉투제작단가: initial ? String(initial.봉투제작단가) : "",
    삽지제작단가: initial ? String(initial.삽지제작단가) : "",
    각대대봉투단가: initial ? String(initial.각대대봉투단가) : "",
  });
  // 부가세구분: 이 거래처와의 계약이 단가에 부가세가 이미 포함됐는지("포함") 별도 10%를 더 청구
  // 해야 하는지("별도") — 거래처 기본단가(업무명·작업명 공란) 행 값이 실제 계산에 쓰인다
  // (billing.부가세_계산(), 2026-07-28). 기본값 "별도"는 DB 컬럼 기본값과 동일.
  const [부가세구분, set부가세구분] = useState<"포함" | "별도">(initial?.부가세구분 ?? "별도");
  // 인쇄면(2026-08-17): 청구페이지 원본이 없는 업무의 출력비를 용지 자재사용량으로 대체 계산할 때
  // 몇 배로 환산할지(단면=1배/양면=2배) — 실사용 데이터 절대다수가 양면이라 기본값 양면.
  const [인쇄면, set인쇄면] = useState<"단면" | "양면">(initial?.인쇄면 ?? "양면");
  // 청구단위(2026-08-22): 위 인쇄면 배율을 적용할 때 "페이지 수" 기준으로 청구할지, 인쇄면과 무관하게
  // 물리적 "장 수" 그대로 청구할지 — 거래처와의 계약 조건. 기본값 "페이지기준"은 지금까지의 유일한
  // 동작과 동일(회귀 없음). 인쇄면(단면/양면) 자체는 자재별 단가 등록에서도 따로 설정 가능해짐.
  const [청구단위, set청구단위] = useState<"페이지기준" | "장수기준">(initial?.청구단위 ?? "페이지기준");
  // 재료비 무상(2026-08-25) — 대부분 유상이라 기본값은 항상 미체크(신규 등록 시 initial이 없어
  // 자동으로 false). 상세: `.claude/plans/plan_재료비_무상표시.md`.
  const [용지제작무상, set용지제작무상] = useState(initial?.용지제작무상 ?? false);
  const [봉투제작무상, set봉투제작무상] = useState(initial?.봉투제작무상 ?? false);
  const [삽지제작무상, set삽지제작무상] = useState(initial?.삽지제작무상 ?? false);
  const [비고, set비고] = useState(initial?.비고 ?? "");

  // 역방향 차단: 이미 등록된 자재별 단가가 있는 코드는 무상 체크박스를 비활성화한다(2026-08-25).
  const 기존자재코드셋 = useMemo(
    () => new Set((initial?.자재단가목록 ?? []).map((r) => r.코드)),
    [initial]
  );
  // 정방향 차단: 지금 체크된 무상 필드에 대응하는 코드는 PricingMaterialSection의 등록 대상에서 뺀다.
  const 무상차단코드 = useMemo(() => {
    const set = new Set<자재단가행["코드"]>();
    if (용지제작무상) set.add(무상필드_코드맵.용지제작단가);
    if (봉투제작무상) set.add(무상필드_코드맵.봉투제작단가);
    if (삽지제작무상) set.add(무상필드_코드맵.삽지제작단가);
    return set;
  }, [용지제작무상, 봉투제작무상, 삽지제작무상]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const 업무명후보 = useMemo(() => {
    const set = new Set(taskRows.filter((t) => t.거래처명 === 거래처명).map((t) => t.업무명));
    return Array.from(set).filter(Boolean).sort();
  }, [taskRows, 거래처명]);

  const 작업명후보 = useMemo(() => {
    const set = new Set(
      taskRows.filter((t) => t.거래처명 === 거래처명 && t.업무명 === 업무명).map((t) => t.작업명)
    );
    return Array.from(set).filter(Boolean).sort();
  }, [taskRows, 거래처명, 업무명]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function 숫자값(key: 가격필드): number {
    const n = Number(가격[key]);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "create") {
        const payload = {
          거래처명,
          업무명: 업무명.trim() || null,
          작업명: 작업명.trim() || null,
          ...Object.fromEntries(가격필드목록.map(({ key }) => [key, 숫자값(key)])),
          용지제작무상,
          봉투제작무상,
          삽지제작무상,
          부가세구분,
          인쇄면,
          청구단위,
          비고: 비고.trim() || null,
        };
        const res = await fetch("/api/pricing-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.detail ?? "저장 중 오류가 발생했습니다.");
          return;
        }
        const 오늘 = new Date().toISOString().slice(0, 10);
        onCreated({
          id: data.id,
          거래처명,
          업무명: 업무명.trim(),
          작업명: 작업명.trim(),
          출력단가: 숫자값("출력단가"),
          봉입단가: 숫자값("봉입단가"),
          추가봉입단가: 숫자값("추가봉입단가"),
          동봉물삽입단가: 숫자값("동봉물삽입단가"),
          각대대봉투봉입단가: 숫자값("각대대봉투봉입단가"),
          용지제작단가: 숫자값("용지제작단가"),
          봉투제작단가: 숫자값("봉투제작단가"),
          삽지제작단가: 숫자값("삽지제작단가"),
          용지제작무상,
          봉투제작무상,
          삽지제작무상,
          각대대봉투단가: 숫자값("각대대봉투단가"),
          부가세구분,
          인쇄면,
          청구단위,
          비고: 비고.trim(),
          등록일: 오늘,
          수정일: 오늘,
          자재단가목록: [],
          공정단가목록: [],
        });
      } else {
        const payload = {
          id: initial!.id,
          ...Object.fromEntries(가격필드목록.map(({ key }) => [key, 숫자값(key)])),
          용지제작무상,
          봉투제작무상,
          삽지제작무상,
          부가세구분,
          인쇄면,
          청구단위,
          비고: 비고.trim() || null,
        };
        const res = await fetch("/api/pricing-update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.detail ?? "수정 중 오류가 발생했습니다.");
          return;
        }
        const 오늘 = new Date().toISOString().slice(0, 10);
        onUpdated(initial!.id, {
          출력단가: 숫자값("출력단가"),
          봉입단가: 숫자값("봉입단가"),
          추가봉입단가: 숫자값("추가봉입단가"),
          동봉물삽입단가: 숫자값("동봉물삽입단가"),
          각대대봉투봉입단가: 숫자값("각대대봉투봉입단가"),
          용지제작단가: 숫자값("용지제작단가"),
          봉투제작단가: 숫자값("봉투제작단가"),
          삽지제작단가: 숫자값("삽지제작단가"),
          용지제작무상,
          봉투제작무상,
          삽지제작무상,
          각대대봉투단가: 숫자값("각대대봉투단가"),
          부가세구분,
          인쇄면,
          청구단위,
          비고: 비고.trim(),
          수정일: 오늘,
        });
      }
    } catch {
      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* 자재별 단가 편집창이 펼쳐지면 내용이 화면 높이를 넘어설 수 있어(2026-08-16 실사용 제보 —
          아래 저장/취소 버튼이 화면 밖으로 밀려남) 팝업 전체를 세로 스크롤 가능하게 높이 제한. */}
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {mode === "create" ? `새 단가 추가 — ${거래처명}` : `단가 수정 — ${거래처명}`}
        </h2>

        {error && (
          <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* 드롭다운 목록(EditableCombo)이 있는 필드는 <label>로 감싸지 않는다 — <label> 안에
              후보 목록(<ul>)까지 들어가면 label의 접근성 텍스트가 "업무명"+후보 항목 전체로
              합쳐져 버려서(2026-07-19 Playwright 실측으로 발견), aria-label을 입력에 직접
              달고 <div>+<span> 조합으로 대체했다. */}
          <div>
            <span className={label}>업무명</span>
            {mode === "edit" ? (
              <input value={업무명} readOnly aria-label="업무명" className={readonlyInput} />
            ) : (
              <EditableCombo
                value={업무명}
                onChange={set업무명}
                options={업무명후보}
                placeholder="비워두면 거래처 기본단가"
                aria-label="업무명"
                className={input}
              />
            )}
          </div>
          <div>
            <span className={label}>작업명</span>
            {mode === "edit" ? (
              <input value={작업명} readOnly aria-label="작업명" className={readonlyInput} />
            ) : (
              <EditableCombo
                value={작업명}
                onChange={set작업명}
                options={작업명후보}
                placeholder="비워두면 업무명 기본단가"
                aria-label="작업명"
                className={input}
              />
            )}
          </div>

          {/* 클릭 시 전체 선택 — Tab으로 넘어올 땐 브라우저가 기본으로 전체 선택해주지만
              마우스 클릭은 커서만 놓이는 게 기본 동작이라 둘의 느낌이 다름(사용자 요청,
              SKILL-08 관례와 동일). onFocus만으론 이미 포커스된 입력을 다시 클릭했을 때
              재적용이 안 되므로(EditableCombo.tsx에서 실측으로 확인된 것과 동일한 이유)
              onClick에도 같이 건다. */}
          {표시_가격필드목록.map(({ key, label: 필드라벨 }) => {
            // 재료비 무상(2026-08-25) — 용지/봉투/삽지제작단가 3개 필드에만 체크박스를 붙인다.
            const 무상필드 =
              key === "용지제작단가" || key === "봉투제작단가" || key === "삽지제작단가" ? key : null;
            const 무상상태 =
              무상필드 === "용지제작단가"
                ? { checked: 용지제작무상, set: set용지제작무상 }
                : 무상필드 === "봉투제작단가"
                  ? { checked: 봉투제작무상, set: set봉투제작무상 }
                  : 무상필드 === "삽지제작단가"
                    ? { checked: 삽지제작무상, set: set삽지제작무상 }
                    : null;
            const 자재등록됨 = 무상필드 ? 기존자재코드셋.has(무상필드_코드맵[무상필드]) : false;
            return (
              <label key={key} className={label}>
                {필드라벨}
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={가격[key]}
                  onChange={(e) => set가격((prev) => ({ ...prev, [key]: e.target.value }))}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.currentTarget.select()}
                  placeholder="0.00"
                  className={input}
                />
                {무상상태 && (
                  <span
                    className="mt-1 flex items-center gap-1 text-xs font-normal text-gray-500 dark:text-gray-400"
                    title={
                      자재등록됨
                        ? "이미 등록된 자재별 단가가 있어 무상으로 설정할 수 없습니다 — 먼저 삭제해 주세요"
                        : undefined
                    }
                  >
                    <input
                      type="checkbox"
                      checked={무상상태.checked}
                      disabled={자재등록됨}
                      onChange={(e) => 무상상태.set(e.target.checked)}
                    />
                    무상(고객사 제공)
                  </span>
                )}
              </label>
            );
          })}

          <label className={`${label} col-span-2`}>
            부가세
            <select
              value={부가세구분}
              onChange={(e) => set부가세구분(e.target.value as "포함" | "별도")}
              className={input}
            >
              <option value="별도">별도(공급가액에 10% 추가 청구)</option>
              <option value="포함">포함(단가에 부가세가 이미 포함됨)</option>
            </select>
            <span className="mt-1 block text-xs font-normal text-gray-400">
              거래처 기본단가(업무명·작업명 공란) 행에 설정한 값이 이 거래처의 실제 청구 계산에 쓰입니다.
            </span>
          </label>

          <label className={`${label} col-span-2`}>
            인쇄면
            <select
              value={인쇄면}
              onChange={(e) => set인쇄면(e.target.value as "단면" | "양면")}
              className={input}
            >
              <option value="양면">양면(한 장에 앞뒤 2쪽)</option>
              <option value="단면">단면(한 장에 1쪽)</option>
            </select>
            <span className="mt-1 block text-xs font-normal text-gray-400">
              청구페이지 원본이 없는 업무의 출력비를 용지 자재사용량으로 계산할 때 몇 배로 셀지
              결정합니다(자재별로 따로 설정하려면 아래 &quot;자재별 단가&quot;에서 개별 등록).
            </span>
          </label>

          <label className={`${label} col-span-2`}>
            청구단위
            <select
              value={청구단위}
              onChange={(e) => set청구단위(e.target.value as "페이지기준" | "장수기준")}
              className={input}
            >
              <option value="페이지기준">페이지기준(양면은 장 수의 2배로 청구)</option>
              <option value="장수기준">장수기준(인쇄면과 무관하게 물리적 장 수 그대로 청구)</option>
            </select>
            <span className="mt-1 block text-xs font-normal text-gray-400">
              이 거래처와의 계약이 출력비를 페이지 수로 받는지 장 수로 받는지 결정합니다.
            </span>
          </label>

          <label className={`${label} col-span-2`}>
            비고
            <input
              value={비고}
              onChange={(e) => set비고(e.target.value)}
              onFocus={(e) => e.target.select()}
              onClick={(e) => e.currentTarget.select()}
              className={input}
            />
          </label>

          {/* 방금 "새 단가 추가"를 저장하고 바로 수정모드로 넘어온 경우, 자재별 단가 등록을
              눈에 띄게 안내(2026-08-16 사용자 요청 — 창이 안 닫히고 바로 이어지는 흐름이라
              "왜 이 화면이 또 떴지" 하지 않도록 이유를 알려줌). */}
          {mode === "edit" && justCreated && (
            <div className="col-span-2 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
              단가가 저장되었습니다. 용지·봉투 종류 등 자재별로 단가가 다르면 아래{" "}
              <strong>&quot;자재별 단가&quot;</strong>에서 예외 단가를 등록해 주세요. 없으면 그냥
              닫으셔도 됩니다.
            </div>
          )}

          {/* 자재별 단가(2026-08-15) — 저장된 id가 있어야 하위 자재단가를 연결할 수 있어 수정
              모드에서만 노출(등록은 별도 엔드포인트라 이 폼의 "저장" 버튼과 묶이지 않음). */}
          {mode === "edit" && initial ? (
            <PricingMaterialSection
              단가마스터_id={initial.id}
              거래처명={거래처명}
              업무명={initial.업무명}
              작업명={initial.작업명}
              rows={initial.자재단가목록}
              onChange={(rows) => onMaterialPricesChanged(initial.id, rows)}
              무상차단코드={무상차단코드}
            />
          ) : (
            <p className="col-span-2 text-xs text-gray-400">
              자재별로 다른 단가(용지·봉투 종류별 등)는 먼저 저장한 뒤 “수정”에서 추가할 수 있습니다.
            </p>
          )}

          {/* 공정별 단가(2026-08-21, 공정별 단가 청구) — 자재별 단가와 동일하게 저장된 id가 있어야
              하위 공정단가를 연결할 수 있어 수정 모드에서만 노출. */}
          {mode === "edit" && initial ? (
            <PricingProcessSection
              단가마스터_id={initial.id}
              rows={initial.공정단가목록}
              onChange={(rows) => onProcessPricesChanged(initial.id, rows)}
            />
          ) : (
            <p className="col-span-2 text-xs text-gray-400">
              압착·중철·제본 등 공정별 단가는 먼저 저장한 뒤 “수정”에서 추가할 수 있습니다.
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
