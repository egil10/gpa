import React, { useState } from 'react';
import { CourseStats } from '@/types';
import GradeChart from './GradeChart';
import { normalizeGradeDistribution } from '@/lib/utils';
import styles from './MultiYearChart.module.css';

interface MultiYearChartProps {
  allYearsData: Record<number, CourseStats>;
  courseCode: string;
  institution: string;
}

type ViewMode = 'combined' | 'per-year';

export default function MultiYearChart({ allYearsData, courseCode, institution }: MultiYearChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('combined');
  const years = Object.keys(allYearsData).map(Number).sort((a, b) => b - a); // Newest first

  // Combine all years
  const combinedData = React.useMemo(() => {
    const allDistributions: Record<string, { count: number; percentage: number }> = {};
    let totalStudents = 0;

    Object.values(allYearsData).forEach((stats) => {
      stats.distributions.forEach((dist) => {
        if (!allDistributions[dist.grade]) {
          allDistributions[dist.grade] = { count: 0, percentage: 0 };
        }
        allDistributions[dist.grade].count += dist.count;
        totalStudents += dist.count;
      });
    });

    if (totalStudents === 0) return null;

    // Recalculate percentages
    Object.keys(allDistributions).forEach((grade) => {
      allDistributions[grade].percentage = Math.round((allDistributions[grade].count / totalStudents) * 100);
    });

    // Normalize to always include A-F
    const distributions = normalizeGradeDistribution(allDistributions, totalStudents);

    return {
      courseCode,
      year: 0,
      totalStudents,
      distributions,
    };
  }, [allYearsData, courseCode]);

  if (years.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>Ingen data tilgjengelig</p>
      </div>
    );
  }

  return (
    <div className={styles.multiYearContainer}>
      <div className={styles.viewToggle}>
        <button
          className={`${styles.toggleButton} ${viewMode === 'combined' ? styles.active : ''}`}
          onClick={() => setViewMode('combined')}
        >
          Kombinert ({years.length} år)
        </button>
        <button
          className={`${styles.toggleButton} ${viewMode === 'per-year' ? styles.active : ''}`}
          onClick={() => setViewMode('per-year')}
        >
          Per år ({years.length} år)
        </button>
      </div>

      {viewMode === 'combined' && combinedData && (
        <div className={styles.combinedView}>
          <GradeChart
            data={combinedData.distributions}
            totalStudents={combinedData.totalStudents}
            courseCode={courseCode}
          />
          <div className={styles.yearsList}>
            <p className={styles.yearsLabel}>Data fra:</p>
            <div className={styles.yearsTags}>
              {years.map((year) => (
                <span key={year} className={styles.yearTag}>
                  {year}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'per-year' && (
        <div className={styles.perYearView}>
          {years.map((year) => {
            const stats = allYearsData[year];
            if (!stats) return null;
            
            return (
              <div key={year} className={styles.yearChart}>
                <div className={styles.yearHeader}>
                  <h3>{year}</h3>
                  <span className={styles.yearStats}>
                    {stats.totalStudents} kandidater
                    {stats.averageGrade && ` • Snitt: ${stats.averageGrade.toFixed(2)}`}
                  </span>
                </div>
                <GradeChart
                  data={stats.distributions}
                  totalStudents={stats.totalStudents}
                  courseCode={courseCode}
                  year={year}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

