import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import BottomSearchBar from '@/components/BottomSearchBar';
import MultiYearChart from '@/components/MultiYearChart';
import { fetchAllYearsData, UNIVERSITIES, formatCourseCode } from '@/lib/api';
import { markCourseAsUnavailable } from '@/lib/course-availability';
import { processMultiYearData } from '@/lib/utils';
import { CourseStats } from '@/types';
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
        const uniFromUrl = uni ? String(uni) : undefined;
        const codeStr = stripCourseCodeSuffix(String(code), uniFromUrl);
        setCourseCode(codeStr);
        // If uni is provided in URL, use it directly (prioritize URL parameter)
        // Otherwise, try to find the institution by searching all courses
        if (uniFromUrl) {
          setInstitution(uniFromUrl);
          // Validate that the course exists for this institution
          getCourseByCode(codeStr, uniFromUrl).then(foundCourse => {
            if (!foundCourse) {
              console.warn(`[Search] Course ${codeStr} not found for institution ${uniFromUrl}, but continuing with URL institution`);
            }
          }).catch(() => {
            // Ignore validation errors, just use the URL institution
          });
        } else {
          // No institution in URL - try to find it by searching all courses
          getCourseByCode(codeStr, undefined).then(foundCourse => {
            if (foundCourse) {
              setInstitution(foundCourse.institution);
            }
          }).catch(() => {
            // If search fails, keep default institution
          });
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
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);
        setAllYearsStats({});

        // STEP 1: Check if course exists in our data
        let normalizedCode = stripCourseCodeSuffix(courseCode, institution);
        let formattedCode = formatCourseCode(normalizedCode, institution);

        try {
          console.log(`[Search] Validating course: ${courseCode} (${institution})`);
          const course = await getCourseByCode(courseCode, institution);

          if (course) {
            console.log(`[Search] ✅ Course found in pre-loaded list: ${course.code} (${course.institution})`);
            // Use the actual course code from the found course
            normalizedCode = stripCourseCodeSuffix(course.code, institution);
            formattedCode = formatCourseCode(normalizedCode, institution);
          } else {
            // Course doesn't exist in our data - provide immediate feedback
            console.warn(`[Search] ❌ Course not found in data: ${courseCode} (${institution})`);
            setError('Ingen data funnet for dette emnet');
            setLoading(false);
            markCourseAsUnavailable(normalizedCode, institution);
            return; // Don't make API call
          }
        } catch (err) {
          console.error(`[Search] Error validating course:`, err);
          setError('Feil ved validering av emne');
          setLoading(false);
          return;
        }

        // STEP 2: Fetch grade data (only if course exists)
        fetchAllYearsData(uniData.code, formattedCode, undefined, institution)
          .then(data => {
            if (data && data.length > 0) {
              console.log(`[Search] Fetched ${data.length} data entries for ${courseCode}`);
              const multiYearData = processMultiYearData(data);
              console.log(`[Search] Processed ${Object.keys(multiYearData).length} years:`, Object.keys(multiYearData));
              if (Object.keys(multiYearData).length > 0) {
                setAllYearsStats(multiYearData);
                setLoading(false);
                setError(null);
              } else {
                setError('Ingen data funnet for dette emnet');
                markCourseAsUnavailable(normalizedCode, institution);
                setLoading(false);
              }
            } else {
              setError('Ingen data funnet for dette emnet');
              markCourseAsUnavailable(normalizedCode, institution);
              setLoading(false);
            }
          })
          .catch(err => {
            console.error(`[Search] Error fetching data for ${courseCode}:`, err);
            setError('Kunne ikke laste data. Vennligst prøv igjen.');
            setLoading(false);
          });
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
              {(error.includes('CORS') || error.includes('GitHub Pages') || error.includes('proxy')) && !error.includes('ikke funnet') && (
                <div className={styles.errorHint}>
                  <p><strong>Løsning:</strong></p>
                  <ol>
                    <li><strong>Rask løsning:</strong> Deploy til <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">Vercel</a> (gratis) - proxy vil fungere automatisk</li>
                    <li><strong>Behold GitHub Pages:</strong> Sett opp en Cloudflare Worker proxy og legg URL i <code>public/proxy-config.json</code></li>
                    <li>Se <a href="https://github.com/egil10/gpa/blob/main/docs/GITHUB_PAGES_PROXY_SETUP.md" target="_blank" rel="noopener noreferrer">dokumentasjonen</a> for detaljer</li>
                  </ol>
                </div>
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

