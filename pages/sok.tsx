import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Search, X } from 'lucide-react';
import Layout from '@/components/Layout';
import GradeChart from '@/components/GradeChart';
import MultiYearChart from '@/components/MultiYearChart';
import CourseAutocomplete from '@/components/CourseAutocomplete';
import CourseExplorer from '@/components/CourseExplorer';
import DepartmentBrowser from '@/components/DepartmentBrowser';
import { fetchAllYearsData, UNIVERSITIES, formatCourseCode } from '@/lib/api';
import { processMultiYearData, combineAllYears } from '@/lib/utils';
import { CourseStats } from '@/types';
import { CourseInfo, getInstitutionForCourse } from '@/lib/courses';
import styles from '@/styles/Search.module.css';

export default function SearchPage() {
  const router = useRouter();
  const [courseCode, setCourseCode] = useState('');
  const [institution, setInstitution] = useState('UiO');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allYearsStats, setAllYearsStats] = useState<Record<number, CourseStats>>({});
  const [selectedCourse, setSelectedCourse] = useState<CourseInfo | null>(null);
  const [institutionLocked, setInstitutionLocked] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);
  const [showDepartmentBrowser, setShowDepartmentBrowser] = useState(false);


  const handleExplorerCourseSelect = (course: CourseInfo) => {
    setCourseCode(course.code);
    setInstitution(course.institution);
    setInstitutionLocked(true);
    setSelectedCourse(course);
    setShowExplorer(false);
    // Auto-trigger search
    setTimeout(() => {
      handleSearch();
    }, 100);
  };

  // Handle URL query parameters
  useEffect(() => {
    if (router.isReady) {
      const { code, uni } = router.query;
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
    }
  }, [router.isReady, router.query]);

  // Auto-search if query params are present
  useEffect(() => {
    if (router.isReady && router.query.code) {
      // Wait for state to update from URL params, then search
      const timer = setTimeout(() => {
        const codeFromUrl = String(router.query.code || '');
        const uniFromUrl = String(router.query.uni || institution);
        if (codeFromUrl && uniFromUrl && UNIVERSITIES[uniFromUrl]) {
          // Use values from URL directly for search
          const uniData = UNIVERSITIES[uniFromUrl];
          const formattedCode = formatCourseCode(codeFromUrl, uniFromUrl);
          
          setLoading(true);
          setError(null);
          setAllYearsStats({});
          
          fetchAllYearsData(uniData.code, formattedCode)
            .then(data => {
              if (data && data.length > 0) {
                const multiYearData = processMultiYearData(data);
                setAllYearsStats(multiYearData);
                setLoading(false);
                setError(null);
              } else {
                setError('Ingen data funnet for dette emnet');
                setLoading(false);
              }
            })
            .catch(err => {
              setError(err.message || 'Kunne ikke hente data');
              setLoading(false);
            });
        }
      }, 200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.code, router.query.uni, institution]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!courseCode.trim()) {
      setError('Vennligst oppgi en emnekode');
      return;
    }

    setLoading(true);
    setError(null);
    setAllYearsStats({});

    try {
      const uniData = UNIVERSITIES[institution];
      if (!uniData) {
        throw new Error('Ugyldig institusjon');
      }

      const formattedCode = formatCourseCode(courseCode, institution);
      // Fetch all years at once
      const data = await fetchAllYearsData(uniData.code, formattedCode);

      if (!data || data.length === 0) {
        setError('Ingen data funnet for dette emnet');
        return;
      }

      // Process data grouped by year
      const multiYearData = processMultiYearData(data);
      
      if (Object.keys(multiYearData).length === 0) {
        setError('Ingen data funnet for dette emnet');
        return;
      }

      setAllYearsStats(multiYearData);
      
      // Update URL without reload
      router.push({
        pathname: '/sok',
        query: { code: courseCode, uni: institution },
      }, undefined, { shallow: true });
    } catch (err) {
      setError(
        err instanceof Error 
          ? err.message 
          : 'Kunne ikke hente data. Sjekk at emnekoden er riktig.'
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
                }}
                className={styles.quickButton}
              >
                ECON1100 (UiO)
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExplorer(!showExplorer);
                  setShowDepartmentBrowser(false);
                }}
                className={`${styles.quickButton} ${styles.explorerToggle} ${showExplorer ? styles.active : ''}`}
              >
                {showExplorer ? (
                  <>
                    <X size={16} />
                    <span>Lukk</span>
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    <span>Utforsk alle emner</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDepartmentBrowser(!showDepartmentBrowser);
                  setShowExplorer(false);
                }}
                className={`${styles.quickButton} ${styles.explorerToggle} ${showDepartmentBrowser ? styles.active : ''}`}
              >
                {showDepartmentBrowser ? (
                  <>
                    <X size={16} />
                    <span>Lukk</span>
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    <span>Utforsk etter fakultet/institutt</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {showExplorer && (
            <CourseExplorer
              onCourseSelect={handleExplorerCourseSelect}
              selectedInstitution={institutionLocked ? institution : undefined}
            />
          )}

          {showDepartmentBrowser && (
            <DepartmentBrowser
              institutionCode={UNIVERSITIES[institution]?.code || '1110'}
              onCourseSelect={(courseCode) => {
                setCourseCode(courseCode);
                setSelectedCourse(null);
                setInstitutionLocked(false);
                // Auto-trigger search after a brief delay
                setTimeout(() => {
                  handleSearch();
                }, 100);
              }}
            />
          )}

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
              <p><strong>Feil:</strong> {error}</p>
              {error.includes('CORS') && (
                <p className={styles.errorHint}>
                  <small>
                    💡 Dette er et kjent problem med offentlige CORS-proxyer. 
                    For å løse dette permanent, deploy <code>api/proxy.js</code> til Vercel (gratis). 
                    Se <a href="https://github.com/egil10/gpa/blob/main/docs/CORS_SOLUTION.md" target="_blank" rel="noopener noreferrer">dokumentasjonen</a>.
                  </small>
                </p>
              )}
            </div>
          )}

          {Object.keys(allYearsStats).length > 0 && (
            <div className={styles.results}>
              <MultiYearChart
                allYearsData={allYearsStats}
                courseCode={courseCode}
                institution={institution}
              />
              
              <div className={styles.additionalStats}>
                <div className={styles.statBox}>
                  <h4>Tilgjengelige år</h4>
                  <p className={styles.statValue}>
                    {Object.keys(allYearsStats).length} år
                  </p>
                </div>
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

