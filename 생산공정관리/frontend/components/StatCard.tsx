type Props = {
  label: string;
  value: number;
  deltaPct: number | null;
  deltaLabel: string;
};

export default function StatCard({ label, value, deltaPct, deltaLabel }: Props) {
  const positive = deltaPct !== null && deltaPct >= 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
        {value.toLocaleString()}
      </p>
      {deltaPct !== null ? (
        <p
          className={`mt-1 text-xs font-medium ${
            positive ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
          }`}
        >
          {positive ? "▲" : "▼"} {Math.abs(deltaPct).toFixed(1)}%{" "}
          <span className="font-normal text-gray-400">{deltaLabel}</span>
        </p>
      ) : (
        <p className="mt-1 text-xs text-gray-400">{deltaLabel} 데이터 없음</p>
      )}
    </div>
  );
}
