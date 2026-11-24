import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { TrendPoint } from '../../schemas/analytics.schema';

import { usePalette } from '../../stores/useThemeStore';

interface EventVolumeChartProps {
  data: TrendPoint[];
}

export function EventVolumeChart({ data }: EventVolumeChartProps) {
  const palette = usePalette();

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <p className="eyebrow">Volume</p>

          <h3>Event Activity</h3>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart
            data={data}
            margin={{
              top: 10,
              right: 20,
              bottom: 10,
              left: 0,
            }}
          >
            <CartesianGrid stroke={palette.grid} vertical={false} />

            <XAxis axisLine={{ stroke: palette.axis }} dataKey="bucket" minTickGap={24} tickLine={false} />

            <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={48} />

            <Tooltip />

            <Legend />

            <Line
              dataKey="eventCount"
              dot={false}
              name="Events"
              stroke={palette.ink}
              strokeWidth={2}
              type="monotone"
            />

            <Line
              dataKey="conflictEvents"
              dot={false}
              name="Conflict Events"
              stroke={palette.violence}
              strokeWidth={1.5}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
