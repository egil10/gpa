import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import GradeChart from '@/components/GradeChart';
import { UNIVERSITIES } from '@/lib/api';
import { normalizeGradeDistribution, normalizeVGSGradeDistribution, VGS_GRADE_ORDER } from '@/lib/utils';
import { Building2, Calendar, TrendingUp, Users, BookOpen, Award, Loader2 } from 'lucide-react';
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
  const [selectedYear, setSelectedYear] = useState<string>('all'); // 'all' or year string

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

  // Get current distribution based on selected year
  const currentDistribution = selectedStats ? (() => {
    if (selectedYear === 'all') {
      return selectedStats.overallDistribution;
    } else {
      const yearNum = parseInt(selectedYear, 10);
      if (selectedStats.yearlyStats[yearNum]) {
        return selectedStats.yearlyStats[yearNum].distribution;
      }
      return selectedStats.overallDistribution;
    }
  })() : null;

  // Get current stats for display
  const currentStats = selectedStats ? (() => {
    if (selectedYear === 'all') {
      return {
        totalStudents: selectedStats.totalStudents,
        totalCourses: selectedStats.totalCourses,
        averageGrade: selectedStats.averageGrade,
      };
    } else {
      const yearNum = parseInt(selectedYear, 10);
      if (selectedStats.yearlyStats[yearNum]) {
        const yearStats = selectedStats.yearlyStats[yearNum];
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
    }
  })() : null;

  if (loading) {
    return (
      <Layout title="Statistikk" description="Institusjonsstatistikk for karakterfordelinger">
        <div className={styles.statisticsPage}>
          <div className="container">
            <div className={styles.loading}>
              <Loader2 size={24} className={styles.loadingSpinner} />
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
              <label htmlFor="institution-select" className={styles.controlLabel}>
                <Building2 size={16} />
                <span>Institusjon</span>
              </label>
              <div className={styles.selectWrapper}>
                <select
                  id="institution-select"
                  value={selectedInstitution || ''}
                  onChange={(e) => {
                    setSelectedInstitution(e.target.value);
                    setSelectedYear('all');
                  }}
                  className={styles.select}
                >
                  {Object.entries(data.institutions)
                    .sort(([, a], [, b]) => a.institutionName.localeCompare(b.institutionName, 'no'))
                    .map(([key, stats]) => (
                      <option key={key} value={key}>
                        {stats.institutionName} ({stats.totalCourses} emner)
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className={styles.controlGroup}>
              <label htmlFor="year-select" className={styles.controlLabel}>
                <Calendar size={16} />
                <span>År</span>
              </label>
              <div className={styles.selectWrapper}>
                <select
                  id="year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className={styles.select}
                >
                  <option value="all">Alle år</option>
                  {availableYears.map(year => (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {selectedStats && currentDistribution && currentStats && (
            <div className={styles.content}>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>
                    <Users size={20} />
                  </div>
                  <h3>Totalt antall studenter</h3>
                  <p className={styles.statValue}>{currentStats.totalStudents.toLocaleString('no-NO')}</p>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>
                    <BookOpen size={20} />
                  </div>
                  <h3>Antall emner</h3>
                  <p className={styles.statValue}>{currentStats.totalCourses.toLocaleString('no-NO')}</p>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>
                    <Award size={20} />
                  </div>
                  <h3>Gjennomsnittlig karakter</h3>
                  <p className={styles.statValue}>{currentStats.averageGrade.toFixed(2)}</p>
                </div>
                {selectedYear === 'all' && (
                  <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                      <Calendar size={20} />
                    </div>
                    <h3>År med data</h3>
                    <p className={styles.statValue}>
                      {selectedStats.yearRange.min} - {selectedStats.yearRange.max}
                    </p>
                  </div>
                )}
              </div>

              <div className={styles.chartContainer}>
                <h2>
                  {selectedYear === 'all' 
                    ? 'Karakterfordeling (alle år)'
                    : `Karakterfordeling ${selectedYear}`}
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

              {availableYears.length > 0 && (
                <div className={styles.trendSection}>
                  <div className={styles.trendHeader}>
                    <TrendingUp size={20} />
                    <h2>Utvikling over tid</h2>
                  </div>
                  <div className={styles.trendChart}>
                    <div className={styles.trendTableHeader}>
                      <div className={styles.trendHeaderCell}>
                        <Calendar size={14} />
                        <span>År</span>
                      </div>
                      <div className={styles.trendHeaderCell}>
                        <Users size={14} />
                        <span>Studenter</span>
                      </div>
                      <div className={styles.trendHeaderCell}>
                        <BookOpen size={14} />
                        <span>Emner</span>
                      </div>
                      <div className={styles.trendHeaderCell}>
                        <Award size={14} />
                        <span>Snitt</span>
                      </div>
                    </div>
                    {availableYears.map(year => {
                      const yearStats = selectedStats.yearlyStats[year];
                      if (!yearStats) return null;
                      const isSelected = selectedYear === year.toString();
                      return (
                        <div 
                          key={year} 
                          className={`${styles.trendRow} ${isSelected ? styles.trendRowSelected : ''}`}
                          onClick={() => {
                            setSelectedYear(year.toString());
                          }}
                        >
                          <div className={styles.trendCell}>
                            <strong>{year}</strong>
                          </div>
                          <div className={styles.trendCell} data-label="Studenter">
                            {yearStats.totalStudents.toLocaleString('no-NO')}
                          </div>
                          <div className={styles.trendCell} data-label="Emner">
                            {yearStats.totalCourses}
                          </div>
                          <div className={styles.trendCell} data-label="Snitt">
                            <strong>{yearStats.averageGrade.toFixed(2)}</strong>
                          </div>
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

