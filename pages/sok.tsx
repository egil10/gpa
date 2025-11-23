import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Search, X, ArrowUp, RefreshCw } from 'lucide-react';
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
import { stripCourseCodeSuffix, loadAllCourses } from '@/lib/all-courses';
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
  const [randomCourses, setRandomCourses] = useState<CourseInfo[]>([]);


  // Load all courses and generate random courses on mount
  const loadRandomCourses = async () => {
    try {
      const courses = await loadAllCourses();
      // Generate 9 random courses (all courses from loadAllCourses already have data)
      const shuffled = [...courses].sort(() => Math.random() - 0.5);
      setRandomCourses(shuffled.slice(0, 9));
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  };

  useEffect(() => {
    loadRandomCourses();
  }, []);

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
        // Strip suffix from URL code for display (e.g., "IN2010-1" -> "IN2010")
        const codeStr = stripCourseCodeSuffix(String(code));
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
        // Strip suffix from URL code before formatting (formatCourseCode will add it back)
        const codeFromUrl = stripCourseCodeSuffix(String(router.query.code || ''));
        const uniFromUrl = String(router.query.uni || institution);
        if (codeFromUrl && uniFromUrl && UNIVERSITIES[uniFromUrl]) {
          // Use values from URL directly for search
          const uniData = UNIVERSITIES[uniFromUrl];
          const formattedCode = formatCourseCode(codeFromUrl, uniFromUrl);
          
          setLoading(true);
          setError(null);
          setAllYearsStats({});
          
          fetchAllYearsData(uniData.code, formattedCode, undefined, uniFromUrl)
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
      // Fetch all years at once (pass institution for caching)
      const data = await fetchAllYearsData(uniData.code, formattedCode, undefined, institution);

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
          {/* Main Search Bar - Centered and Prominent */}
          <div className={styles.centeredSearchBar}>
            <form onSubmit={handleSearch} className={styles.searchForm}>
              <div className={styles.inputWrapper}>
                <div className={styles.inputContainer}>
                  <div className={styles.searchIcon}>
                    <Search size={18} />
                  </div>
                  <div className={styles.inputContent}>
                    <div className={styles.autocompleteWrapper}>
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
                            setInstitutionLocked(false);
                          }
                        }}
                        institution={institutionLocked ? institution : undefined}
                        placeholder="Søk etter emnekode eller navn..."
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className={styles.actions}>
                    {courseCode && (
                      <button
                        type="button"
                        onClick={() => {
                          setCourseCode('');
                          setSelectedCourse(null);
                          setInstitutionLocked(false);
                          setError(null);
                        }}
                        className={styles.clearButton}
                        aria-label="Clear"
                      >
                        <X size={18} />
                      </button>
                    )}
                    <button
                      type="submit"
                      className={styles.submitButton}
                      aria-label="Search"
                      disabled={!courseCode.trim() || loading}
                    >
                      <ArrowUp size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Show Quick Search when no results */}
          {Object.keys(allYearsStats).length === 0 && !loading && !error && (
            <div className={styles.quickActions}>
            <div className={styles.quickActionsHeader}>
              <h3>Rask søk</h3>
              <button
                type="button"
                onClick={loadRandomCourses}
                className={styles.refreshButton}
                title="Last inn nye tilfeldige emner"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <div className={styles.quickButtons}>
              {randomCourses.map((course) => (
                <button
                  key={`${course.code}-${course.institution}`}
                  type="button"
                  onClick={() => {
                    setCourseCode(course.code);
                    setInstitution(course.institution);
                    setInstitutionLocked(true);
                    setSelectedCourse(course);
                    // Auto-trigger search
                    setTimeout(() => {
                      handleSearch();
                    }, 100);
                  }}
                  className={styles.quickButton}
                  title={course.name}
                >
                  {course.code} ({UNIVERSITIES[course.institution]?.shortName || course.institution})
                </button>
              ))}
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
          )}

          {showExplorer && (
            <CourseExplorer
              onCourseSelect={handleExplorerCourseSelect}
              selectedInstitution={institutionLocked ? institution : undefined}
            />
          )}

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

