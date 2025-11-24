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
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Strip suffix from course code for URL (formatCourseCode will add it back when making API calls)
    const displayCode = stripCourseCodeSuffix(course.courseCode);
    router.push(`/sok?code=${encodeURIComponent(displayCode)}&uni=${institution}&year=${course.year}`);
  };

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
  
  // Then add Bestått and Ikke bestått if they exist (even if count is 0)
  const bestatt = course.distributions.find(d => d.grade === 'Bestått');
  const ikkeBestatt = course.distributions.find(d => d.grade === 'Ikke bestått');
  
  if (bestatt) {
    distributionMap.set('Bestått', {
      grade: 'Bestått',
      percentage: bestatt.percentage,
      count: bestatt.count,
    });
  }
  
  if (ikkeBestatt) {
    distributionMap.set('Ikke bestått', {
      grade: 'Ikke bestått',
      percentage: ikkeBestatt.percentage,
      count: ikkeBestatt.count,
    });
  }
  
  // Convert to array, keeping A-F order first, then Bestått/Ikke bestått
  const chartData = [
    ...letterGrades.map(g => distributionMap.get(g)!),
    ...(bestatt ? [distributionMap.get('Bestått')!] : []),
    ...(ikkeBestatt ? [distributionMap.get('Ikke bestått')!] : []),
  ].filter(Boolean); // Remove any undefined entries

  const topGrade = course.distributions.reduce((max, dist) => 
    dist.percentage > max.percentage ? dist : max
  );

  return (
    <div className={styles.card} onClick={handleClick}>
      <div className={styles.header}>
        <div className={styles.courseInfo}>
          <span className={styles.courseCode}>{stripCourseCodeSuffix(course.courseCode)}</span>
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

