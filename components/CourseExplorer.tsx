import React, { useState, useMemo } from 'react';
import { POPULAR_COURSES, CourseInfo, getCoursesForInstitution } from '@/lib/courses';
import { UNIVERSITIES } from '@/lib/api';
import styles from './CourseExplorer.module.css';

interface CourseExplorerProps {
  onCourseSelect: (course: CourseInfo) => void;
  selectedInstitution?: string;
}

export default function CourseExplorer({ onCourseSelect, selectedInstitution }: CourseExplorerProps) {
  const [selectedInst, setSelectedInst] = useState<string>(selectedInstitution || '');
  const [searchQuery, setSearchQuery] = useState('');

  // Get all unique institutions
  const institutions = useMemo(() => {
    const instSet = new Set(POPULAR_COURSES.map(c => c.institution));
    return Array.from(instSet).sort();
  }, []);

  // Filter courses based on institution and search query
  const filteredCourses = useMemo(() => {
    let courses = selectedInst 
      ? getCoursesForInstitution(selectedInst)
      : POPULAR_COURSES;

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toUpperCase();
      courses = courses.filter(c => 
        c.code.toUpperCase().includes(query) ||
        c.name.toUpperCase().includes(query)
      );
    }

    return courses.sort((a, b) => a.code.localeCompare(b.code));
  }, [selectedInst, searchQuery]);

  const handleCourseClick = (course: CourseInfo) => {
    onCourseSelect(course);
  };

  return (
    <div className={styles.explorer}>
      <div className={styles.explorerHeader}>
        <h3>Utforsk emner</h3>
        <p className={styles.explorerSubtitle}>
          Bla gjennom tilgjengelige emner
        </p>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Søk etter emnekode eller navn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.institutionFilter}>
          <label>Filtrer på institusjon:</label>
          <div className={styles.institutionButtons}>
            <button
              className={`${styles.instButton} ${!selectedInst ? styles.active : ''}`}
              onClick={() => setSelectedInst('')}
            >
              Alle
            </button>
            {institutions.map((inst) => (
              <button
                key={inst}
                className={`${styles.instButton} ${selectedInst === inst ? styles.active : ''}`}
                onClick={() => setSelectedInst(inst)}
              >
                {UNIVERSITIES[inst]?.shortName || inst}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.coursesList}>
        {filteredCourses.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Ingen emner funnet</p>
          </div>
        ) : (
          <div className={styles.coursesGrid}>
            {filteredCourses.map((course) => (
              <button
                key={`${course.code}-${course.institution}`}
                className={styles.courseItem}
                onClick={() => handleCourseClick(course)}
                title={`${course.name} - ${UNIVERSITIES[course.institution]?.shortName || course.institution}`}
              >
                <div className={styles.courseCode}>{course.code}</div>
                <div className={styles.courseName}>{course.name}</div>
                <div className={styles.courseInstitution}>
                  {UNIVERSITIES[course.institution]?.shortName || course.institution}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.explorerFooter}>
        <p className={styles.courseCount}>
          {filteredCourses.length} {filteredCourses.length === 1 ? 'emne' : 'emner'} 
          {selectedInst && ` fra ${UNIVERSITIES[selectedInst]?.shortName || selectedInst}`}
        </p>
      </div>
    </div>
  );
}

