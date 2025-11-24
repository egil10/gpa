import React from 'react';
import { useRouter } from 'next/router';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { CourseStats } from '@/types';
import { UNIVERSITIES, formatCourseCode, formatInstitutionLabel } from '@/lib/api';
import { stripCourseCodeSuffix } from '@/lib/all-courses';
import styles from './CourseDistributionCard.module.css';

interface CourseDistributionCardProps {
  course: CourseStats;
  institution: string;
}

const GRADE_COLORS: Record<string, string> = {
  'A': '#000000',
  'B': '#262626',
  'C': '#525252',
  'D': '#737373',
  'E': '#a3a3a3',
  'F': '#ef4444',
  'Bestått': '#000000',
  'Ikke bestått': '#ef4444',
};

export default function CourseDistributionCard({ course, institution }: CourseDistributionCardProps) {
  const router = useRouter();
  
  // Get display code - for UiB, ensure we don't truncate codes incorrectly
  // If courseCode already has no dash (like "INF100"), use it directly
  // Otherwise, strip suffix appropriately
  const getDisplayCode = (code: string, inst: string): string => {
    // For UiB, only split if there's actually a dash (e.g., "EXPHIL-HFEKS-0" -> "EXPHIL")
    // If no dash (e.g., "INF100"), use as-is
    if (inst === 'UiB' && code.includes('-')) {
      return code.split('-')[0].trim();
    }
    // For other institutions, just remove "-1" suffix
    return code.replace(/-1$/, '').trim();
  };
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Strip suffix from course code for URL (formatCourseCode will add it back when making API calls)
    const displayCode = getDisplayCode(course.courseCode, institution);
    router.push(`/sok?code=${encodeURIComponent(displayCode)}&uni=${institution}&year=${course.year}`);
  };
  
  const displayCourseCode = getDisplayCode(course.courseCode, institution);

  // Always show all A-F grades (even if count is 0), plus Bestått/Ikke bestått if they exist
  // This ensures we can see the full distribution
  const letterGrades = ['A', 'B', 'C', 'D', 'E', 'F'];
  const distributionMap = new Map<string, { grade: string; percentage: number; count: number }>();
  
  // First, populate all A-F grades with 0 if not present
  letterGrades.forEach(grade => {
    const existing = course.distributions.find(d => d.grade === grade);
    distributionMap.set(grade, {
      grade,
      percentage: existing?.percentage || 0,
      count: existing?.count || 0,
    });
  });
  
  // Check if either Bestått or Ikke bestått exists (even if count is 0)
  const bestatt = course.distributions.find(d => d.grade === 'Bestått');
  const ikkeBestatt = course.distributions.find(d => d.grade === 'Ikke bestått');
  // If either exists, we want to show both labels (even if one has 0 count)
  const hasAnyPassFailData = !!(bestatt || ikkeBestatt);
  
  // If either Bestått or Ikke bestått exists (even with 0 count), include both in the chart
  // This ensures both x-axis labels are shown even if one has zero count
  if (hasAnyPassFailData) {
    // Ensure we always have valid numbers, defaulting to 0
    const bestattPercentage = (bestatt?.percentage != null && !isNaN(bestatt.percentage)) ? bestatt.percentage : 0;
    const bestattCount = (bestatt?.count != null && !isNaN(bestatt.count)) ? bestatt.count : 0;
    const ikkeBestattPercentage = (ikkeBestatt?.percentage != null && !isNaN(ikkeBestatt.percentage)) ? ikkeBestatt.percentage : 0;
    const ikkeBestattCount = (ikkeBestatt?.count != null && !isNaN(ikkeBestatt.count)) ? ikkeBestatt.count : 0;
    
    distributionMap.set('Bestått', {
      grade: 'Bestått',
      percentage: bestattPercentage,
      count: bestattCount,
    });
    distributionMap.set('Ikke bestått', {
      grade: 'Ikke bestått',
      percentage: ikkeBestattPercentage,
      count: ikkeBestattCount,
    });
  }
  
  // Convert to array, keeping A-F order first, then Bestått/Ikke bestått
  // Ensure all entries have valid data (no undefined/null/NaN)
  const chartData = [
    ...letterGrades.map(g => {
      const entry = distributionMap.get(g);
      return entry || { grade: g, percentage: 0, count: 0 };
    }),
    ...(hasAnyPassFailData ? [
      distributionMap.get('Bestått') || { grade: 'Bestått', percentage: 0, count: 0 },
      distributionMap.get('Ikke bestått') || { grade: 'Ikke bestått', percentage: 0, count: 0 }
    ] : []),
  ].filter(entry => entry && entry.grade); // Remove any invalid entries

  return (
    <div className={styles.card} onClick={handleClick}>
      <div className={styles.header}>
        <div className={styles.courseInfo}>
          <span className={styles.courseCode}>{displayCourseCode}</span>
          <span className={styles.institution}>
            {formatInstitutionLabel(institution, 'short-full')}
          </span>
        </div>
        <div className={styles.year}>{course.year}</div>
      </div>
      
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <XAxis 
              dataKey="grade" 
              tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
              axisLine={{ stroke: 'var(--border)' }}
            />
            <YAxis 
              hide
            />
            <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={GRADE_COLORS[entry.grade] || '#000000'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>A-er</span>
          <span className={styles.statValue}>
            {course.distributions.find(d => d.grade === 'A')?.percentage || 0}%
          </span>
        </div>
        {course.averageGrade && (
          <div className={styles.stat}>
            <span className={styles.statLabel}>Snitt</span>
            <span className={styles.statValue}>{course.averageGrade.toFixed(1)}</span>
          </div>
        )}
        <div className={styles.stat}>
          <span className={styles.statLabel}>Kandidater</span>
          <span className={styles.statValue}>{course.totalStudents}</span>
        </div>
      </div>
    </div>
  );
}

