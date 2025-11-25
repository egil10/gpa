import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { GradeDistribution } from '@/types';
import { VGS_GRADE_ORDER } from '@/lib/utils';
import styles from './GradeChart.module.css';

interface GradeChartProps {
  data: GradeDistribution[];
  totalStudents: number;
  courseCode?: string;
  year?: number;
}

const GRADE_COLORS: Record<string, string> = {
  'A': '#1a1a1a',
  'B': '#333333',
  'C': '#666666',
  'D': '#999999',
  'E': '#cccccc',
  'F': '#ff0000',
  'Bestått': '#1a1a1a',
  'Ikke bestått': '#ff0000',
  // VGS grades (1-6 scale)
  '1': '#ff0000',
  '2': '#ff4444',
  '3': '#ff8888',
  '4': '#88ff88',
  '5': '#44ff44',
  '6': '#00ff00',
};

export default function GradeChart({ data, totalStudents, courseCode, year }: GradeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>Ingen data tilgjengelig</p>
      </div>
    );
  }

  // Check if this is VGS data (1-6 scale, but displayed as 6-1)
  const isVGS = data.some((dist) => ['1', '2', '3', '4', '5', '6'].includes(dist.grade));
  
  // Filter data: include pass/fail grades if EITHER has data
  // If either Bestått or Ikke bestått exists, we always include BOTH in the chart
  const hasBestatt = data.some((dist) => dist.grade === 'Bestått');
  const hasIkkeBestatt = data.some((dist) => dist.grade === 'Ikke bestått');
  const hasAnyPassFailData = hasBestatt || hasIkkeBestatt;
  
  // If either has data, ensure both are included (even if one has 0 count)
  let chartData: GradeDistribution[];
  if (hasAnyPassFailData) {
    // Start with existing data, but ensure both Bestått and Ikke bestått are present
    chartData = [...data];
    
    // Add missing pass/fail grades with 0 values if they don't exist
    if (!hasBestatt) {
      chartData.push({ grade: 'Bestått', percentage: 0, count: 0 });
    }
    if (!hasIkkeBestatt) {
      chartData.push({ grade: 'Ikke bestått', percentage: 0, count: 0 });
    }
  } else {
    // If neither has data, filter them out
    chartData = data.filter((dist) => dist.grade !== 'Bestått' && dist.grade !== 'Ikke bestått');
  }
  
  // For VGS, ensure grades are ordered 6-1 (highest to lowest) - sort after filtering
  if (isVGS) {
    // Sort VGS grades in 6-1 order (highest to lowest, matching VGS_GRADE_ORDER)
    const vgsGrades = chartData.filter((dist) => VGS_GRADE_ORDER.includes(dist.grade));
    const nonVgsGrades = chartData.filter((dist) => !VGS_GRADE_ORDER.includes(dist.grade));
    // Sort VGS grades according to VGS_GRADE_ORDER (6-1)
    vgsGrades.sort((a, b) => VGS_GRADE_ORDER.indexOf(a.grade) - VGS_GRADE_ORDER.indexOf(b.grade));
    chartData = [...vgsGrades, ...nonVgsGrades];
  }

  return (
    <div className={styles.chartContainer}>
      {courseCode && !year && (
        <div className={styles.chartHeader}>
          <h3>{courseCode}</h3>
        </div>
      )}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="grade" 
            tick={{ fill: '#666', fontSize: 12 }}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <YAxis 
            tick={{ fill: '#666', fontSize: 12 }}
            axisLine={{ stroke: '#e0e0e0' }}
            label={{ value: 'Prosent (%)', angle: -90, position: 'insideLeft', fill: '#666' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string) => [
              `${value}%`,
              'Prosent',
            ]}
            labelFormatter={(label) => `Karakter: ${label}`}
          />
          <Bar dataKey="percentage" name="Prosent">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={GRADE_COLORS[entry.grade] || '#666'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className={styles.stats}>
        {chartData
          .filter((dist) => dist.grade !== 'Bestått' && dist.grade !== 'Ikke bestått')
          .map((dist) => (
            <div key={dist.grade} className={styles.statItem}>
              <span className={styles.grade}>{dist.grade}</span>
              <span className={styles.count}>{dist.count}</span>
              <span className={styles.percentage}>{dist.percentage}%</span>
            </div>
          ))}
      </div>

      {hasAnyPassFailData && (
        <div className={styles.passFailStats}>
          {chartData
            .filter((dist) => dist.grade === 'Bestått' || dist.grade === 'Ikke bestått')
            .map((dist) => (
              <div key={dist.grade} className={`${styles.statItem} ${styles.passFailItem}`}>
                <span className={styles.grade}>{dist.grade}</span>
                <span className={styles.count}>{dist.count}</span>
                <span className={styles.percentage}>{dist.percentage}%</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}


