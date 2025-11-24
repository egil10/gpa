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

  // Check if either Bestått or Ikke bestått exists with actual data (count > 0)
  // Also check if they exist in the distributions array at all (even with 0 count)
  const hasBestatt = course.distributions.some(d => d.grade === 'Bestått' && d.count > 0);
  const hasIkkeBestatt = course.distributions.some(d => d.grade === 'Ikke bestått' && d.count > 0);
  const hasBestattEntry = course.distributions.some(d => d.grade === 'Bestått');
  const hasIkkeBestattEntry = course.distributions.some(d => d.grade === 'Ikke bestått');
  const hasAnyPassFailData = hasBestatt || hasIkkeBestatt || hasBestattEntry || hasIkkeBestattEntry;
  
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
  
  // If either Bestått or Ikke bestått has data OR exists in distributions, we always include BOTH in the chart
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
  const chartData: Array<{ grade: string; percentage: number; count: number }> = [];
  
  // Add A-F grades if they have data OR if there's no pass/fail data
  if (hasLetterGrades || !hasAnyPassFailData) {
    letterGrades.forEach(g => {
      const entry = distributionMap.get(g);
      if (entry) {
        chartData.push(entry);
      }
    });
  }
  
  // Always add both Bestått and Ikke bestått if we have any pass/fail data
  // This ensures both bars are shown even if one has 0 count
  if (hasAnyPassFailData) {
    const bestattEntry = distributionMap.get('Bestått') || { grade: 'Bestått', percentage: 0, count: 0 };
    const ikkeBestattEntry = distributionMap.get('Ikke bestått') || { grade: 'Ikke bestått', percentage: 0, count: 0 };
    chartData.push(bestattEntry);
    chartData.push(ikkeBestattEntry);
  }

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
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart 
              data={chartData} 
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              barCategoryGap="20%"
            >
              <XAxis 
                dataKey="grade" 
                tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                axisLine={{ stroke: 'var(--border)' }}
              />
              <YAxis 
                hide
                domain={[0, (dataMax: number) => {
                  // For pass/fail only data, always use 100 as max to show full scale
                  if (hasAnyPassFailData && !hasLetterGrades) {
                    return 100;
                  }
                  // For letter grades, use at least 5% to ensure visibility
                  return Math.max(dataMax || 0, 5);
                }]}
              />
              <Bar 
                dataKey="percentage" 
                radius={[4, 4, 0, 0]}
                minPointSize={3}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={GRADE_COLORS[entry.grade] || '#000000'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <span>Ingen data</span>
          </div>
        )}
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

