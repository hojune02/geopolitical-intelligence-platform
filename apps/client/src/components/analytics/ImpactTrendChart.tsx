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

interface ImpactTrendChartProps {
  data: TrendPoint[];
}

export function ImpactTrendChart({ data }: ImpactTrendChartProps) {
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
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="bucket" minTickGap={24} />

            <YAxis domain={[-10, 10]} yAxisId="goldstein" />

            <YAxis domain={[-100, 100]} orientation="right" yAxisId="tone" />

            <Tooltip />

            <Legend />

            <Line
              connectNulls
              dataKey="averageGoldstein"
              dot={false}
              name="Average Goldstein"
              type="monotone"
              yAxisId="goldstein"
            />

            <Line
              connectNulls
              dataKey="averageTone"
              dot={false}
              name="Average Tone"
              type="monotone"
              yAxisId="tone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
