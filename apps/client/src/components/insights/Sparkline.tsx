interface SparklineProps {
  points: { total: number; conflict: number }[];
  width?: number;
  height?: number;
  label: string;
}

/* Volume as a faint area, conflict events as the bright line. */
export function Sparkline({ points, width = 120, height = 32, label }: SparklineProps) {
  if (points.length < 2) {
    return <span className="sparkline-empty">—</span>;
  }

  const max = Math.max(1, ...points.map((point) => point.total));
  const step = width / (points.length - 1);

  const y = (value: number) => height - 2 - (value / max) * (height - 4);

  const totalPath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${(index * step).toFixed(1)},${y(point.total).toFixed(1)}`)
    .join(' ');

  const conflictPath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${(index * step).toFixed(1)},${y(point.conflict).toFixed(1)}`)
    .join(' ');

  const last = points[points.length - 1];

  return (
    <svg
      aria-label={label}
      className="sparkline"
      height={height}
      role="img"
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      width={width}
    >
      <path className="sparkline-area" d={`${totalPath} L${String(width)},${String(height)} L0,${String(height)} Z`} />
      <path className="sparkline-line" d={conflictPath} />
      {last !== undefined ? (
        <circle className="sparkline-dot" cx={width} cy={y(last.conflict)} r={2.5} />
      ) : null}
    </svg>
  );
}
