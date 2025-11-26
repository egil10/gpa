import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from 'recharts';
import styles from './TrendChart.module.css';

export interface TrendPoint {
  year: number;
  value: number;
}

interface TrendChartProps {
  title: string;
  data: TrendPoint[];
  unit?: string;
  yLabel?: string;
  emptyMessage?: string;
  precision?: number;
  seriesLabel?: string;
}

const defaultEmptyMessage = 'Ingen tidsdata tilgjengelig';

export default function TrendChart({
  title,
  data,
  unit,
  yLabel,
  emptyMessage = defaultEmptyMessage,
  precision = 2,
  seriesLabel,
}: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h3>{title}</h3>
        </div>
        <p className={styles.emptyState}>{emptyMessage}</p>
      </div>
    );
  }

  const chartData = [...data].sort((a, b) => a.year - b.year);
  const latestValue = chartData[chartData.length - 1]?.value;
  const formattedValue =
    latestValue !== undefined ? `${latestValue.toFixed(precision)}${unit ?? ''}` : '–';

  const label = seriesLabel || title;

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div>
          <h3>{title}</h3>
          <p className={styles.currentValue}>{formattedValue}</p>
        </div>
        <span className={styles.rangeLabel}>
          {chartData[0].year} – {chartData[chartData.length - 1].year}
        </span>
      </div>
      <div className={styles.chartBody}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="year"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
              width={45}
              tickFormatter={(value) => `${Number(value).toFixed(precision)}`}
              label={
                yLabel
                  ? {
                      value: yLabel,
                      angle: -90,
                      position: 'insideLeft',
                      fill: 'var(--text-secondary)',
                    }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--surface)',
                border: `1px solid var(--border)`,
                borderRadius: '0.5rem',
                color: 'var(--text-primary)',
              }}
              formatter={(value: number) => [
                `${value.toFixed(precision)}${unit ?? ''}`,
                label,
              ]}
              labelFormatter={(valueLabel) => `År: ${valueLabel}`}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 1, fill: 'var(--accent)', stroke: 'var(--surface)' }}
              activeDot={{ r: 5 }}
              connectNulls
              name={label}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


