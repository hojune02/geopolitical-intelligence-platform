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

interface EventVolumeChartProps {
  data: TrendPoint[];
}

export function EventVolumeChart({ data }: EventVolumeChartProps) {
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
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="bucket" minTickGap={24} />

            <YAxis allowDecimals={false} />

            <Tooltip />

            <Legend />

            <Line dataKey="eventCount" dot={false} name="Events" type="monotone" />

            <Line dataKey="conflictEvents" dot={false} name="Conflict Events" type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
