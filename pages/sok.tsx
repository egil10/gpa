import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import BottomSearchBar from '@/components/BottomSearchBar';
import MultiYearChart from '@/components/MultiYearChart';
import { fetchAllYearsData, UNIVERSITIES, formatCourseCode } from '@/lib/api';
import { processMultiYearData } from '@/lib/utils';
import { CourseStats } from '@/types';
import { getInstitutionForCourse } from '@/lib/courses';
import { stripCourseCodeSuffix, getCourseByCode } from '@/lib/all-courses';
import styles from '@/styles/Search.module.css';

export default function SearchPage() {
  const router = useRouter();
  const [courseCode, setCourseCode] = useState('');
  const [institution, setInstitution] = useState('UiO');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allYearsStats, setAllYearsStats] = useState<Record<number, CourseStats>>({});

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
        } else if (uni) {
          // Only use URL uni if course doesn't have known institution
          setInstitution(String(uni));
        }
      } else if (uni) {
        setInstitution(String(uni));
      }
    }
  }, [router.isReady, router.query]);

  // Auto-load data if query params are present
  useEffect(() => {
    if (router.isReady && router.query.code && courseCode && institution) {
      // Wait for state to update from URL params, then validate and load
      const timer = setTimeout(async () => {
        const uniData = UNIVERSITIES[institution];
        if (!uniData) {
          setError('Ugyldig institusjon');
          return;
        }

        // First, validate that the course code exists in our course list
        try {
          const course = await getCourseByCode(courseCode, institution);
          if (!course) {
            // Course code doesn't exist - show not found message
            setError(`Emnekode "${courseCode}" ikke funnet`);
            setLoading(false);
            setAllYearsStats({});
            return;
          }

          // Course exists, proceed to fetch data
        const formattedCode = formatCourseCode(courseCode, institution);
        
        setLoading(true);
        setError(null);
        setAllYearsStats({});
        
        fetchAllYearsData(uniData.code, formattedCode, undefined, institution)
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
              // Check if error is CORS-related or actual "no data"
              if (err.message && err.message.includes('CORS')) {
                setError(err.message);
              } else {
                setError('Ingen data funnet for dette emnet');
              }
            setLoading(false);
          });
        } catch (err) {
          // Error validating course - show error
          setError(`Emnekode "${courseCode}" ikke funnet`);
          setLoading(false);
          setAllYearsStats({});
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [router.isReady, router.query.code, courseCode, institution]);

  // Redirect to home if no course code in URL
  useEffect(() => {
    if (router.isReady && !router.query.code) {
      router.replace('/');
    }
  }, [router.isReady, router.query.code, router]);

  return (
    <Layout title={courseCode || 'Emne'} description={`Karakterstatistikk for ${courseCode}`}>
      <div className={styles.searchPage}>
        {courseCode && (
          <div className={styles.courseHeader}>
            <div className="container">
              <h1 className={styles.courseCode}>{courseCode}</h1>
              {UNIVERSITIES[institution] && (
                <p className={styles.institutionName}>{UNIVERSITIES[institution].name}</p>
              )}
            </div>
          </div>
        )}
        <div className="container">
          <div className={styles.inlineSearchBar}>
            <BottomSearchBar variant="inline" />
          </div>
          {loading && (
            <div className={styles.loading}>
              <p>Laster data...</p>
            </div>
          )}

          {error && (
            <div className={styles.error}>
              <p><strong>Feil:</strong> {error}</p>
              {error.includes('CORS') && !error.includes('ikke funnet') && (
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

