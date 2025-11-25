import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import GradeChart from '@/components/GradeChart';
import { UNIVERSITIES } from '@/lib/api';
import { normalizeGradeDistribution, normalizeVGSGradeDistribution, VGS_GRADE_ORDER } from '@/lib/utils';
import styles from '@/styles/Statistics.module.css';

interface InstitutionStatistics {
  institution: string;
  institutionCode: string;
  institutionName: string;
  totalCourses: number;
  totalStudents: number;
  coursesWithData: number;
  yearRange: {
    min: number;
    max: number;
  };
  overallDistribution: {
    grade: string;
    count: number;
    percentage: number;
  }[];
  averageGrade: number;
  yearlyStats: Record<number, {
    year: number;
    totalStudents: number;
    totalCourses: number;
    distribution: {
      grade: string;
      count: number;
      percentage: number;
    }[];
    averageGrade: number;
  }>;
  generatedAt: string;
}

interface StatisticsData {
  metadata: {
    generatedAt: string;
    totalInstitutions: number;
  };
  institutions: Record<string, InstitutionStatistics>;
}

export default function StatisticsPage() {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overall' | 'yearly'>('overall');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    async function loadStatistics() {
      try {
        const basePath = window.location.pathname.startsWith('/gpa') ? '/gpa' : '';
        const response = await fetch(`${basePath}/data/institution-statistics.json`);
        
        if (!response.ok) {
          throw new Error('Kunne ikke laste statistikkdata');
        }

        const statisticsData: StatisticsData = await response.json();
        setData(statisticsData);
        
        // Auto-select first institution if available
        const institutions = Object.keys(statisticsData.institutions);
        if (institutions.length > 0 && !selectedInstitution) {
          setSelectedInstitution(institutions[0]);
        }
      } catch (err) {
        console.error('Error loading statistics:', err);
        setError(err instanceof Error ? err.message : 'Ukjent feil');
      } finally {
        setLoading(false);
      }
    }

    loadStatistics();
  }, []);

  const selectedStats = selectedInstitution && data ? data.institutions[selectedInstitution] : null;
  const availableYears = selectedStats 
    ? Object.keys(selectedStats.yearlyStats).map(Number).sort((a, b) => b - a)
    : [];

  // Get current distribution based on view mode
  const currentDistribution = selectedStats ? (() => {
    if (viewMode === 'overall') {
      return selectedStats.overallDistribution;
    } else if (viewMode === 'yearly' && selectedYear && selectedStats.yearlyStats[selectedYear]) {
      return selectedStats.yearlyStats[selectedYear].distribution;
    }
    return selectedStats.overallDistribution;
  })() : null;

  // Get current stats for display
  const currentStats = selectedStats ? (() => {
    if (viewMode === 'overall') {
      return {
        totalStudents: selectedStats.totalStudents,
        totalCourses: selectedStats.totalCourses,
        averageGrade: selectedStats.averageGrade,
      };
    } else if (viewMode === 'yearly' && selectedYear && selectedStats.yearlyStats[selectedYear]) {
      const yearStats = selectedStats.yearlyStats[selectedYear];
      return {
        totalStudents: yearStats.totalStudents,
        totalCourses: yearStats.totalCourses,
        averageGrade: yearStats.averageGrade,
      };
    }
    return {
      totalStudents: selectedStats.totalStudents,
      totalCourses: selectedStats.totalCourses,
      averageGrade: selectedStats.averageGrade,
    };
  })() : null;

  if (loading) {
    return (
      <Layout title="Statistikk" description="Institusjonsstatistikk for karakterfordelinger">
        <div className={styles.statisticsPage}>
          <div className="container">
            <div className={styles.loading}>
              <p>Laster statistikk...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout title="Statistikk" description="Institusjonsstatistikk for karakterfordelinger">
        <div className={styles.statisticsPage}>
          <div className="container">
            <div className={styles.error}>
              <p><strong>Feil:</strong> {error || 'Kunne ikke laste statistikkdata'}</p>
              <p>
                Statistikkdata må genereres først. Kjør:{' '}
                <code>npm run build-institution-statistics</code>
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Statistikk" description="Institusjonsstatistikk for karakterfordelinger">
      <div className={styles.statisticsPage}>
        <div className="container">
          <div className={styles.header}>
            <h1>Institusjonsstatistikk</h1>
            <p className={styles.subtitle}>
              Oversikt over karakterfordelinger på tvers av alle emner per institusjon
            </p>
          </div>

          <div className={styles.controls}>
            <div className={styles.controlGroup}>
              <label htmlFor="institution-select">Institusjon:</label>
              <select
                id="institution-select"
                value={selectedInstitution || ''}
                onChange={(e) => {
                  setSelectedInstitution(e.target.value);
                  setSelectedYear(null);
                }}
                className={styles.select}
              >
                {Object.entries(data.institutions).map(([key, stats]) => (
                  <option key={key} value={key}>
                    {stats.institutionName} ({stats.totalCourses} emner)
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.controlGroup}>
              <label>
                <input
                  type="radio"
                  name="view-mode"
                  value="overall"
                  checked={viewMode === 'overall'}
                  onChange={() => {
                    setViewMode('overall');
                    setSelectedYear(null);
                  }}
                />
                {' '}Alle år
              </label>
              <label>
                <input
                  type="radio"
                  name="view-mode"
                  value="yearly"
                  checked={viewMode === 'yearly'}
                  onChange={() => setViewMode('yearly')}
                />
                {' '}Per år
              </label>
            </div>

            {viewMode === 'yearly' && availableYears.length > 0 && (
              <div className={styles.controlGroup}>
                <label htmlFor="year-select">År:</label>
                <select
                  id="year-select"
                  value={selectedYear || ''}
                  onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className={styles.select}
                >
                  <option value="">Velg år...</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {selectedStats && currentDistribution && currentStats && (
            <div className={styles.content}>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <h3>Totalt antall studenter</h3>
                  <p className={styles.statValue}>{currentStats.totalStudents.toLocaleString()}</p>
                </div>
                <div className={styles.statCard}>
                  <h3>Antall emner</h3>
                  <p className={styles.statValue}>{currentStats.totalCourses.toLocaleString()}</p>
                </div>
                <div className={styles.statCard}>
                  <h3>Gjennomsnittlig karakter</h3>
                  <p className={styles.statValue}>{currentStats.averageGrade.toFixed(2)}</p>
                </div>
                {viewMode === 'overall' && (
                  <div className={styles.statCard}>
                    <h3>År med data</h3>
                    <p className={styles.statValue}>
                      {selectedStats.yearRange.min} - {selectedStats.yearRange.max}
                    </p>
                  </div>
                )}
              </div>

              <div className={styles.chartContainer}>
                <h2>
                  {viewMode === 'overall' 
                    ? 'Karakterfordeling (alle år)'
                    : selectedYear 
                      ? `Karakterfordeling ${selectedYear}`
                      : 'Velg et år for å se fordeling'}
                </h2>
                {currentDistribution && currentDistribution.length > 0 ? (
                  <GradeChart
                    data={currentDistribution}
                    totalStudents={currentStats.totalStudents}
                  />
                ) : (
                  <p className={styles.noData}>Ingen data tilgjengelig</p>
                )}
              </div>

              {viewMode === 'yearly' && availableYears.length > 0 && (
                <div className={styles.trendSection}>
                  <h2>Utvikling over tid</h2>
                  <div className={styles.trendChart}>
                    <div className={styles.trendHeader}>
                      <div className={styles.trendHeaderCell}>År</div>
                      <div className={styles.trendHeaderCell}>Studenter</div>
                      <div className={styles.trendHeaderCell}>Emner</div>
                      <div className={styles.trendHeaderCell}>Snitt</div>
                    </div>
                    {availableYears.map(year => {
                      const yearStats = selectedStats.yearlyStats[year];
                      if (!yearStats) return null;
                      return (
                        <div 
                          key={year} 
                          className={`${styles.trendRow} ${selectedYear === year ? styles.trendRowSelected : ''}`}
                          onClick={() => {
                            setSelectedYear(year);
                            setViewMode('yearly');
                          }}
                        >
                          <div className={styles.trendCell}>{year}</div>
                          <div className={styles.trendCell}>{yearStats.totalStudents.toLocaleString()}</div>
                          <div className={styles.trendCell}>{yearStats.totalCourses}</div>
                          <div className={styles.trendCell}>{yearStats.averageGrade.toFixed(2)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={styles.info}>
            <p>
              <small>
                Statistikk generert: {new Date(data.metadata.generatedAt).toLocaleString('no-NO')}
              </small>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

