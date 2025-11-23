import React, { useMemo } from 'react';
import { Search, Calculator } from 'lucide-react';
import Layout from '@/components/Layout';
import StatCard from '@/components/StatCard';
import CourseCard from '@/components/CourseCard';
import Link from 'next/link';
import styles from '@/styles/Home.module.css';
import { CourseStats } from '@/types';
import { POPULAR_COURSES, CourseInfo } from '@/lib/courses';
import { UNIVERSITIES } from '@/lib/api';

// Sample featured courses - in a real app, these would come from analytics
const FEATURED_COURSES: Array<CourseStats & { institution: string }> = [
  {
    courseCode: 'IN2010-1',
    year: 2022,
    institution: 'UiO',
    totalStudents: 396,
    averageGrade: 2.8,
    distributions: [
      { grade: 'A', count: 18, percentage: 5 },
      { grade: 'B', count: 40, percentage: 10 },
      { grade: 'C', count: 114, percentage: 29 },
      { grade: 'D', count: 74, percentage: 19 },
      { grade: 'E', count: 59, percentage: 15 },
      { grade: 'F', count: 91, percentage: 23 },
    ],
  },
  {
    courseCode: 'TDT4100-1',
    year: 2022,
    institution: 'NTNU',
    totalStudents: 450,
    averageGrade: 3.2,
    distributions: [
      { grade: 'A', count: 45, percentage: 10 },
      { grade: 'B', count: 90, percentage: 20 },
      { grade: 'C', count: 135, percentage: 30 },
      { grade: 'D', count: 90, percentage: 20 },
      { grade: 'E', count: 45, percentage: 10 },
      { grade: 'F', count: 45, percentage: 10 },
    ],
  },
  {
    courseCode: 'ECON1100-1',
    year: 2022,
    institution: 'UiO',
    totalStudents: 320,
    averageGrade: 3.0,
    distributions: [
      { grade: 'A', count: 32, percentage: 10 },
      { grade: 'B', count: 64, percentage: 20 },
      { grade: 'C', count: 96, percentage: 30 },
      { grade: 'D', count: 64, percentage: 20 },
      { grade: 'E', count: 32, percentage: 10 },
      { grade: 'F', count: 32, percentage: 10 },
    ],
  },
];

export default function Home() {
  // Get one random course from each institution
  const randomCourses = useMemo(() => {
    const institutions = ['UiO', 'NTNU', 'OsloMet', 'UiB', 'BI'];
    return institutions.map(inst => {
      const courses = POPULAR_COURSES.filter(c => c.institution === inst);
      if (courses.length === 0) return null;
      const randomIndex = Math.floor(Math.random() * courses.length);
      return courses[randomIndex];
    }).filter(Boolean) as CourseInfo[];
  }, []);

  return (
    <Layout title="Hjem" description="Utforsk karakterstatistikk for norske universitetsemner">
      <div className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Karakterstatistikk
            </h1>
            <p className={styles.heroSubtitle}>
              Utforsk karakterfordelinger for emner ved norske universiteter.
              Data fra NSD.
            </p>
            <div className={styles.ctaButtons}>
            <div className={styles.ctaButtons}>
              <Link href="/sok" className={styles.ctaButton}>
                <Search size={18} />
                <span>Start søk</span>
              </Link>
              <Link href="/kalkulator" className={`${styles.ctaButton} ${styles.ctaButtonSecondary}`}>
                <Calculator size={18} />
                <span>GPA Kalkulator</span>
              </Link>
            </div>
            </div>
          </div>
        </div>
      </div>

      <section className={styles.dashboardSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Eksempel-emner</h2>
            <p className={styles.sectionSubtitle}>
              Et tilfeldig utvalg fra hvert universitet
            </p>
          </div>
          <div className={styles.dashboardGrid}>
            {randomCourses.map((course) => (
              <Link
                key={`${course.code}-${course.institution}`}
                href={`/sok?code=${course.code}&uni=${course.institution}`}
                className={styles.dashboardCard}
              >
                <div className={styles.dashboardCardHeader}>
                  <span className={styles.dashboardCode}>{course.code}</span>
                  <span className={styles.dashboardInstitution}>
                    {UNIVERSITIES[course.institution]?.shortName || course.institution}
                  </span>
                </div>
                <h3 className={styles.dashboardTitle}>{course.name}</h3>
                <div className={styles.dashboardFooter}>
                  <span className={styles.dashboardLink}>Se statistikk →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.statsSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Oversikt</h2>
          <div className={styles.statsGrid}>
            <StatCard
              title="Universiteter"
              value="5"
              subtitle="UiO, NTNU, OsloMet, UiB, BI"
            />
            <StatCard
              title="Tilgjengelige år"
              value="2010–2023"
              subtitle="Historiske data"
            />
            <StatCard
              title="Data kilde"
              value="NSD"
              subtitle="Norsk senter for forskningsdata"
            />
          </div>
        </div>
      </section>

      <section className={styles.featuredSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Utvalgte emner</h2>
            <p className={styles.sectionSubtitle}>
              Eksempler på karakterfordelinger
            </p>
          </div>
          <div className={styles.coursesGrid}>
            {FEATURED_COURSES.map((course, index) => (
              <CourseCard
                key={`${course.courseCode}-${course.year}-${index}`}
                course={course}
                institution={course.institution}
              />
            ))}
          </div>
        </div>
      </section>

      <section className={styles.exploreSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Utforsk</h2>
          <div className={styles.exploreGrid}>
            <Link href="/sok" className={styles.exploreCard}>
              <h3>Søk etter emne</h3>
              <p>Finn karakterstatistikk for et spesifikt emne ved et universitet.</p>
            </Link>
            <Link href="/kalkulator" className={styles.exploreCard}>
              <h3>GPA Kalkulator</h3>
              <p>Beregn din gjennomsnittlige karakter med ECTS-poeng. Støtter både universitet og videregående.</p>
            </Link>
            <div className={styles.exploreCard}>
              <h3>Institusjonssammenligning</h3>
              <p>Sammenlign samme emne på tvers av universiteter.</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}


