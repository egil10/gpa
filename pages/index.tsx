import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import Layout from '@/components/Layout';
import CourseDistributionCard from '@/components/CourseDistributionCard';
import { fetchAllYearsData, UNIVERSITIES, formatCourseCode } from '@/lib/api';
import { processGradeData } from '@/lib/utils';
import { CourseStats } from '@/types';
import { loadAllCourses, getPopularCourses } from '@/lib/all-courses';
import { CourseInfo } from '@/lib/courses';
import styles from '@/styles/Home.module.css';

export default function Home() {
  const [courses, setCourses] = useState<Array<CourseStats & { institution: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [cardCount, setCardCount] = useState(6);

  const fetchRandomCourses = async (count: number) => {
    setLoading(true);
    try {
      // Get all available courses
      const allCourses = await loadAllCourses();
      
      // Shuffle and take random courses
      const shuffled = [...allCourses].sort(() => Math.random() - 0.5);
      const selectedCourses = shuffled.slice(0, count);
      
      // Fetch grade data for each course
      const coursePromises = selectedCourses.map(async (course) => {
        try {
          const uniData = UNIVERSITIES[course.institution];
          if (!uniData) return null;
          
          const formattedCode = formatCourseCode(course.code, course.institution);
          const data = await fetchAllYearsData(uniData.code, formattedCode, undefined, course.institution);
          
          if (!data || data.length === 0) return null;
          
          // Get the most recent year's data
          const latestYear = Math.max(...data.map(d => parseInt(d.Årstall, 10)));
          const yearData = data.filter(d => parseInt(d.Årstall, 10) === latestYear);
          
          const stats = processGradeData(yearData);
          if (!stats) return null;
          
          return {
            ...stats,
            institution: course.institution,
          };
        } catch (error) {
          console.error(`Failed to fetch data for ${course.code}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(coursePromises);
      const validCourses = results.filter((c): c is CourseStats & { institution: string } => c !== null);
      
      // If we don't have enough, try to get more
      if (validCourses.length < count) {
        const remaining = count - validCourses.length;
        const additionalCourses = shuffled.slice(count, count + remaining * 2);
        
        for (const course of additionalCourses) {
          if (validCourses.length >= count) break;
          
          try {
            const uniData = UNIVERSITIES[course.institution];
            if (!uniData) continue;
            
            const formattedCode = formatCourseCode(course.code, course.institution);
            const data = await fetchAllYearsData(uniData.code, formattedCode);
            
            if (!data || data.length === 0) continue;
            
            const latestYear = Math.max(...data.map(d => parseInt(d.Årstall, 10)));
            const yearData = data.filter(d => parseInt(d.Årstall, 10) === latestYear);
            
            const stats = processGradeData(yearData);
            if (!stats) continue;
            
            validCourses.push({
              ...stats,
              institution: course.institution,
            });
          } catch (error) {
            continue;
          }
        }
      }
      
      setCourses(validCourses.slice(0, count));
    } catch (error) {
      console.error('Failed to fetch random courses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomCourses(cardCount);
  }, []);

  const handleRefresh = () => {
    fetchRandomCourses(cardCount);
  };

  const handleToggleCount = () => {
    const newCount = cardCount === 3 ? 6 : 3;
    setCardCount(newCount);
    fetchRandomCourses(newCount);
  };

  return (
    <Layout title="Hjem" description="Utforsk karakterstatistikk for norske universitetsemner">
      <div className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Karakterstatistikk
            </h1>
            <p className={styles.heroSubtitle}>
              Utforsk karakterfordelinger for emner ved norske universiteter. Data fra NSD.
            </p>
          </div>
        </div>
      </div>

      <section className={styles.distributionsSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Karakterfordelinger</h2>
              <p className={styles.sectionSubtitle}>
                Et tilfeldig utvalg av emner med karakterstatistikk
              </p>
            </div>
            <div className={styles.actions}>
              <button
                onClick={handleToggleCount}
                className={styles.toggleButton}
                aria-label="Toggle card count"
              >
                {cardCount === 3 ? 'Vis 6' : 'Vis 3'}
              </button>
              <button
                onClick={handleRefresh}
                className={styles.refreshButton}
                disabled={loading}
                aria-label="Refresh courses"
              >
                <RefreshCw size={18} className={loading ? styles.spinning : ''} />
                <span>Oppdater</span>
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className={styles.loading}>
              <p>Henter karakterstatistikk...</p>
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {courses.map((course, index) => (
                <CourseDistributionCard
                  key={`${course.courseCode}-${course.year}-${course.institution}-${index}`}
                  course={course}
                  institution={course.institution}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
