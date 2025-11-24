import React from 'react';
import { useRouter } from 'next/router';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { CourseStats } from '@/types';
import { UNIVERSITIES, formatInstitutionLabel } from '@/lib/api';
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
  
  // Get display code - consistently remove "-1" suffix for all institutions
  // This matches how course codes are stored in the discovery scripts
  const getDisplayCode = (code: string, inst: string): string => {
    // For all institutions, only remove "-1" suffix (dash followed by 1 at the end)
    // This is the API format suffix, not part of the actual course code
    return code.replace(/-[0-9]+$/, '').trim();
  };
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Strip suffix from course code for URL (formatCourseCode will add it back when making API calls)
    const displayCode = getDisplayCode(course.courseCode, institution);
    router.push(`/sok?code=${encodeURIComponent(displayCode)}&uni=${institution}&year=${course.year}`);
  };
  
  const displayCourseCode = getDisplayCode(course.courseCode, institution);

  // Check if either Bestått or Ikke bestått exists in the distributions array
  const hasBestatt = course.distributions.some(d => d.grade === 'Bestått');
  const hasIkkeBestatt = course.distributions.some(d => d.grade === 'Ikke bestått');
  const hasAnyPassFailData = hasBestatt || hasIkkeBestatt;
  
  // Check if there are any A-F grades with actual data (count > 0)
  const hasLetterGrades = course.distributions.some(d => 
    ['A', 'B', 'C', 'D', 'E', 'F'].includes(d.grade) && d.count > 0
  );
  
  const letterGrades = ['A', 'B', 'C', 'D', 'E', 'F'];
  const distributionMap = new Map<string, { grade: string; percentage: number; count: number }>();
  
  // Only include A-F grades if they have data OR if there's no pass/fail data
  // This prevents showing empty A-F bars when only pass/fail grades exist
  if (hasLetterGrades || !hasAnyPassFailData) {
    letterGrades.forEach(grade => {
      const existing = course.distributions.find(d => d.grade === grade);
      distributionMap.set(grade, {
        grade,
        percentage: existing?.percentage || 0,
        count: existing?.count || 0,
      });
    });
  }
  
  // If either Bestått or Ikke bestått exists, we always include BOTH in the chart
  // This ensures both x-axis labels are shown even if one has zero count or is missing
  if (hasAnyPassFailData) {
    // Find the actual distribution entries (might be undefined if not present)
    const bestatt = course.distributions.find(d => d.grade === 'Bestått');
    const ikkeBestatt = course.distributions.find(d => d.grade === 'Ikke bestått');
    
    // Ensure we always have valid numbers, defaulting to 0 if missing or invalid
    const bestattPercentage = (bestatt?.percentage != null && !isNaN(bestatt.percentage)) ? bestatt.percentage : 0;
    const bestattCount = (bestatt?.count != null && !isNaN(bestatt.count)) ? bestatt.count : 0;
    const ikkeBestattPercentage = (ikkeBestatt?.percentage != null && !isNaN(ikkeBestatt.percentage)) ? ikkeBestatt.percentage : 0;
    const ikkeBestattCount = (ikkeBestatt?.count != null && !isNaN(ikkeBestatt.count)) ? ikkeBestatt.count : 0;
    
    // Always set both entries in the map, even if one has all zeros
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
  
  // Convert to array: A-F first (if included), then Bestått/Ikke bestått
  // If only pass/fail data exists, only show pass/fail grades (no empty A-F bars)
  const chartData = [
    ...(hasLetterGrades || !hasAnyPassFailData ? letterGrades.map(g => {
      const entry = distributionMap.get(g);
      return entry || { grade: g, percentage: 0, count: 0 };
    }) : []),
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
        <div className={styles.stat}>
          <span className={styles.statLabel}>Snitt</span>
          <span className={styles.statValue}>
            {course.averageGrade != null && !isNaN(course.averageGrade)
              ? course.averageGrade.toFixed(1)
              : '0'}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Kandidater</span>
          <span className={styles.statValue}>{course.totalStudents}</span>
        </div>
      </div>
    </div>
  );
}

