"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  title: string;
  message: string;
  items?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  dangerText?: string;
  reasonRequired?: boolean;
  reason?: string;
  onReasonChange?: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

// 프로젝트 첫 모달 컴포넌트 — Streamlit @st.dialog(불릿 리스트+"취소 후 복구 불가" 경고)와 동등한
// UX가 필요해서 신규 제작(window.confirm()은 다건 안내·다크모드 대응이 안 됨). 발행/되돌리기/
// 부분취소 3곳에서 재사용, 거래처마스터 삭제([4-D])에서도 재사용 — 문맥마다 경고 문구가 달라야 해서
// dangerText prop 추가(기본값은 기존 3곳과 동일하게 "취소 후 복구할 수 없습니다." 유지).
export default function ConfirmDialog({
  open,
  title,
  message,
  items,
  confirmLabel = "확인",
  cancelLabel = "닫기",
  danger = false,
  dangerText = "취소 후 복구할 수 없습니다.",
  reasonRequired = false,
  reason,
  onReasonChange,
  onConfirm,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const 확인비활성 = reasonRequired && !(reason ?? "").trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{message}</p>

        {items && items.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-md bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            {items.map((it, i) => (
              <li key={i}>• {it}</li>
            ))}
          </ul>
        )}

        {danger && (
          <p className="mt-3 text-xs font-medium text-red-600 dark:text-red-400">{dangerText}</p>
        )}

        {onReasonChange && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              사유{reasonRequired ? " (필수)" : " (선택)"}
            </label>
            <textarea
              value={reason ?? ""}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder={reasonRequired ? "취소 사유를 입력해 주세요" : "필요하면 사유를 입력하세요"}
            />
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={확인비활성}
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white ${
              확인비활성
                ? "cursor-not-allowed bg-gray-300 dark:bg-gray-700"
                : danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gray-900 hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
