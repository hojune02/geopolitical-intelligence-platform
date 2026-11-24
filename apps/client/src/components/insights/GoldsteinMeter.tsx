import { describeGoldstein, goldsteinColor } from '../../lib/cameo';

interface GoldsteinMeterProps {
  value: number;
  compact?: boolean;
}

/* A −10…+10 track with a marker, so the scale reads without a legend. */
export function GoldsteinMeter({ value, compact = false }: GoldsteinMeterProps) {
  const clamped = Math.max(-10, Math.min(10, value));
  const position = ((clamped + 10) / 20) * 100;

  return (
    <div
      aria-label={`Goldstein ${value.toFixed(1)}: ${describeGoldstein(value)}`}
      className={compact ? 'goldstein-meter compact' : 'goldstein-meter'}
      role="meter"
      aria-valuemin={-10}
      aria-valuemax={10}
      aria-valuenow={value}
    >
      <div className="goldstein-track">
        <span className="goldstein-zero" />
        <span
          className="goldstein-marker"
          style={{ left: `${position.toFixed(1)}%`, background: goldsteinColor(value) }}
        />
      </div>
      {compact ? null : (
        <div className="goldstein-caption">
          <span>{value > 0 ? '+' : ''}{value.toFixed(1)}</span>
          <span>{describeGoldstein(value)}</span>
        </div>
      )}
    </div>
  );
}
