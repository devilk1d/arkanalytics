'use client';

import { useMemo, memo, useId } from 'react';
import { AreaChart, Area, LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface SparklineChartProps {
  data: number[];
  color?: string;
  height?: number;
  strokeWidth?: number;
}

const SparklineChart = memo(({
  data,
  color = '#22c55e',
  height = 40,
  strokeWidth = 2,
}: SparklineChartProps) => {
  const gradientId = useId(); // Unique ID per component instance

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((value, index) => ({
      index,
      value: typeof value === 'number' ? value : 0,
    }));
  }, [data]);

  if (!chartData || chartData.length === 0) {
    return null;
  }

  // Calculate min and max for proper domain scaling
  const values = chartData.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  
  // Add padding to domain for better visualization
  const padding = range === 0 ? Math.max(Math.abs(maxValue) * 0.1, 1) : range * 0.1;
  const yMin = Math.max(0, minValue - padding);
  const yMax = maxValue + padding;

  // If only 1 data point, add a duplicate point so line/area can render
  const displayData = chartData.length === 1 
    ? [...chartData, chartData[0]]
    : chartData;

  const showDot = displayData.length <= 2;

  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0} debounce={350}>
      {displayData.length >= 2 ? (
        <AreaChart data={displayData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <YAxis 
            domain={[yMin, yMax]}
            hide={true}
            width={0}
          />
          <Area
            type="natural"
            dataKey="value"
            stroke={color}
            strokeWidth={strokeWidth}
            fill={`url(#${gradientId})`}
            dot={showDot ? { fill: color, r: 2 } : false}
            isAnimationActive={false}
          />
        </AreaChart>
      ) : (
        <LineChart data={displayData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis 
            domain={[yMin, yMax]}
            hide={true}
            width={0}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={strokeWidth}
            dot={{ fill: color, r: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
});

SparklineChart.displayName = 'SparklineChart';

export default SparklineChart;
