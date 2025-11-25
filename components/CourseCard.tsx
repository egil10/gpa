import React from 'react';
import Link from 'next/link';
import { CourseStats } from '@/types';
import { stripCourseCodeSuffix } from '@/lib/all-courses';
import styles from './CourseCard.module.css';

interface CourseCardProps {
  course: CourseStats;
  institution: string;
}

export default function CourseCard({ course, institution }: CourseCardProps) {
  const topGrade = course.distributions.reduce((max, dist) => 
    dist.percentage > max.percentage ? dist : max
  );

  const displayCode = stripCourseCodeSuffix(course.courseCode);
  
  return (
    <Link href={`/sok?code=${encodeURIComponent(displayCode)}&year=${course.year}&uni=${institution}`}>
      <div className={`${styles.card} hover-lift`}>
        <div className={styles.header}>
          <h3 className={styles.courseCode}>{displayCode}</h3>
          <span className={styles.year}>{course.year}</span>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Kandidater</span>
            <span className={styles.statValue}>{course.totalStudents}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Mest vanlig</span>
            <span className={styles.statValue}>{topGrade.grade}</span>
          </div>
          {course.averageGrade && (
            <div className={styles.stat}>
              <span className={styles.statLabel}>Snitt</span>
              <span className={styles.statValue}>{course.averageGrade.toFixed(1)}</span>
            </div>
          )}
        </div>
        <div className={styles.bar}>
          {course.distributions.map((dist) => (
            <div
              key={dist.grade}
              className={styles.barSegment}
              style={{
                width: `${dist.percentage}%`,
                backgroundColor: dist.grade === 'F' || dist.grade === 'Ikke bestått' 
                  ? '#ff0000' 
                  : '#1a1a1a',
              }}
              title={`${dist.grade}: ${dist.percentage}%`}
            />
          ))}
        </div>
      </div>
    </Link>
  );
}


