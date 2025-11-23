import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import GradeChart from '@/components/GradeChart';
import CourseAutocomplete from '@/components/CourseAutocomplete';
import { fetchGradeData, UNIVERSITIES, formatCourseCode } from '@/lib/api';
import { processGradeData, getAvailableYears } from '@/lib/utils';
import { CourseStats } from '@/types';
import { CourseInfo, getInstitutionForCourse } from '@/lib/courses';
import styles from '@/styles/Search.module.css';

export default function SearchPage() {
  const router = useRouter();
  const [courseCode, setCourseCode] = useState('');
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [institution, setInstitution] = useState('UiO');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<CourseInfo | null>(null);
  const [institutionLocked, setInstitutionLocked] = useState(false);

  const availableYears = getAvailableYears();

  // Handle URL query parameters
  useEffect(() => {
    if (router.isReady) {
      const { code, year: yearParam, uni } = router.query;
      if (code) {
        const codeStr = String(code);
        setCourseCode(codeStr);
        const courseInstitution = getInstitutionForCourse(codeStr);
        if (courseInstitution) {
          setInstitution(courseInstitution);
          setInstitutionLocked(true);
        } else if (uni) {
          // Only use URL uni if course doesn't have known institution
          setInstitution(String(uni));
          setInstitutionLocked(false);
        }
      } else if (uni) {
        setInstitution(String(uni));
        setInstitutionLocked(false);
      }
      if (yearParam) setYear(Number(yearParam));
    }
  }, [router.isReady, router.query]);

  // Auto-search if query params are present
  useEffect(() => {
    if (router.isReady && router.query.code && router.query.year && router.query.uni) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!courseCode.trim()) {
      setError('Vennligst oppgi en emnekode');
      return;
    }

    setLoading(true);
    setError(null);
    setStats(null);

    try {
      const uniData = UNIVERSITIES[institution];
      if (!uniData) {
        throw new Error('Ugyldig institusjon');
      }

      const formattedCode = formatCourseCode(courseCode, institution);
      const data = await fetchGradeData(uniData.code, formattedCode, year);
      const processed = processGradeData(data);

      if (!processed) {
        setError('Ingen data funnet for dette emnet');
        return;
      }

      setStats(processed);
      
      // Update URL without reload
      router.push({
        pathname: '/sok',
        query: { code: courseCode, year, uni: institution },
      }, undefined, { shallow: true });
    } catch (err) {
      setError(
        err instanceof Error 
          ? err.message 
          : 'Kunne ikke hente data. Sjekk at emnekoden og året er riktig.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Søk" description="Søk etter karakterstatistikk for et emne">
      <div className={styles.searchPage}>
        <div className="container">
          <div className={styles.header}>
            <h1>Søk etter emne</h1>
            <p className="text-light">
              Finn karakterfordelinger for et spesifikt emne ved et universitet
            </p>
          </div>

          <div className={styles.quickActions}>
            <h3>Rask søk</h3>
            <div className={styles.quickButtons}>
              <button
                type="button"
                onClick={() => {
                  setCourseCode('IN2010');
                  setInstitution('UiO');
                  setYear(2022);
                }}
                className={styles.quickButton}
              >
                IN2010 (UiO)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCourseCode('TDT4100');
                  setInstitution('NTNU');
                  setYear(2022);
                }}
                className={styles.quickButton}
              >
                TDT4100 (NTNU)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCourseCode('ECON1100');
                  setInstitution('UiO');
                  setYear(2022);
                }}
                className={styles.quickButton}
              >
                ECON1100 (UiO)
              </button>
            </div>
          </div>

          <form onSubmit={handleSearch} className={styles.searchForm}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="courseCode">Emnekode</label>
                <CourseAutocomplete
                  value={courseCode}
                  onChange={(code) => {
                    setCourseCode(code);
                    setError(null);
                    
                    // Check if code has known institution
                    if (code.trim()) {
                      const courseInstitution = getInstitutionForCourse(code);
                      if (courseInstitution) {
                        setInstitution(courseInstitution);
                        setInstitutionLocked(true);
                      } else if (!selectedCourse) {
                        // Only unlock if no course is selected
                        setInstitutionLocked(false);
                      }
                    } else {
                      setInstitutionLocked(false);
                      setSelectedCourse(null);
                    }
                  }}
                  onCourseSelect={(course) => {
                    setSelectedCourse(course);
                    if (course) {
                      setInstitution(course.institution);
                      setInstitutionLocked(true);
                    } else if (!courseCode.trim()) {
                      // Only unlock if course code is cleared
                      setInstitutionLocked(false);
                    }
                  }}
                  institution={institutionLocked ? institution : undefined}
                  placeholder="Søk etter emnekode eller navn..."
                  disabled={loading}
                />
                {selectedCourse && (
                  <div className={styles.courseInfo}>
                    <span className={styles.courseInfoText}>
                      {selectedCourse.name} • {UNIVERSITIES[selectedCourse.institution]?.name}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="institution">
                  Institusjon
                  {institutionLocked && (
                    <span className={styles.lockedIndicator} title="Låst basert på valgt emne">
                      🔒
                    </span>
                  )}
                </label>
                <select
                  id="institution"
                  value={institution}
                  onChange={(e) => {
                    if (!institutionLocked) {
                      setInstitution(e.target.value);
                    }
                  }}
                  className={styles.select}
                  disabled={institutionLocked || loading}
                >
                  {Object.entries(UNIVERSITIES).map(([key, uni]) => (
                    <option key={key} value={key}>
                      {uni.shortName}
                    </option>
                  ))}
                </select>
                {institutionLocked && (
                  <p className={styles.lockedMessage}>
                    Institusjonen er låst basert på valgt emne
                  </p>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="year">År</label>
                <select
                  id="year"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className={styles.select}
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={styles.submitButton}
              >
                {loading ? 'Laster...' : 'Søk'}
              </button>
            </div>
          </form>

          {error && (
            <div className={styles.error}>
              <p>{error}</p>
            </div>
          )}

          {stats && (
            <div className={styles.results}>
              <GradeChart
                data={stats.distributions}
                totalStudents={stats.totalStudents}
                courseCode={stats.courseCode}
                year={stats.year}
              />
              
              <div className={styles.additionalStats}>
                <div className={styles.statBox}>
                  <h4>Total antall kandidater</h4>
                  <p className={styles.statValue}>{stats.totalStudents}</p>
                </div>
                {stats.averageGrade && (
                  <div className={styles.statBox}>
                    <h4>Gjennomsnittlig karakter</h4>
                    <p className={styles.statValue}>{stats.averageGrade.toFixed(2)}</p>
                  </div>
                )}
                <div className={styles.statBox}>
                  <h4>Institusjon</h4>
                  <p className={styles.statValue}>
                    {UNIVERSITIES[institution]?.name || institution}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

