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

interface ImpactTrendChartProps {
  data: TrendPoint[];
}

export function ImpactTrendChart({ data }: ImpactTrendChartProps) {
  const palette = usePalette();

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <p className="eyebrow">Signals</p>

          <h3>Goldstein & Tone</h3>
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

            <YAxis axisLine={false} domain={[-10, 10]} tickLine={false} width={40} yAxisId="goldstein" />

            <YAxis
              axisLine={false}
              domain={[-100, 100]}
              orientation="right"
              yAxisId="tone"
            />

            <Tooltip />

            <Legend />

            <Line
              connectNulls
              dataKey="averageGoldstein"
              dot={false}
              name="Average Goldstein"
              stroke={palette.ink}
              strokeWidth={2}
              type="monotone"
              yAxisId="goldstein"
            />

            <Line
              connectNulls
              dataKey="averageTone"
              dot={false}
              name="Average Tone"
              stroke={palette.tension}
              strokeWidth={1.5}
              type="monotone"
              yAxisId="tone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
