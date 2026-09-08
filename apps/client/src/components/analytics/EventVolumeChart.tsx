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
            <CartesianGrid stroke="#203128" strokeDasharray="3 5" />

            <XAxis axisLine={{ stroke: '#385544' }} dataKey="bucket" minTickGap={24} />

            <YAxis allowDecimals={false} axisLine={{ stroke: '#385544' }} />

            <Tooltip />

            <Legend />

            <Line
              dataKey="eventCount"
              dot={false}
              name="Events"
              stroke="#b7f34a"
              strokeWidth={2}
              type="monotone"
            />

            <Line
              dataKey="conflictEvents"
              dot={false}
              name="Conflict Events"
              stroke="#f26b5e"
              strokeWidth={1.5}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
