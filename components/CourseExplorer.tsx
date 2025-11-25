import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { CourseInfo, getCoursesForInstitution } from '@/lib/courses';
import { UNIVERSITIES, formatInstitutionLabel } from '@/lib/api';
import { getAvailableInstitutions, loadInstitutionCourses, loadAllCourses, stripCourseCodeSuffix } from '@/lib/all-courses';
import styles from './CourseExplorer.module.css';

interface CourseExplorerProps {
  onCourseSelect: (course: CourseInfo) => void;
  selectedInstitution?: string;
}

const ITEMS_PER_PAGE = 100;

export default function CourseExplorer({ onCourseSelect, selectedInstitution }: CourseExplorerProps) {
  const [selectedInst, setSelectedInst] = useState<string>(selectedInstitution || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableCourses, setAvailableCourses] = useState<CourseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [allCoursesLoaded, setAllCoursesLoaded] = useState(false);

  // Load courses for selected institution (or all if none selected)
  const loadCourses = useCallback(async (institution: string) => {
    setLoading(true);
    setDisplayedCount(ITEMS_PER_PAGE);
    setAllCoursesLoaded(false);
    
    try {
      let courses: CourseInfo[];
      if (institution) {
        // Load only courses for this institution (much faster)
        courses = await loadInstitutionCourses(institution);
      } else {
        // Load all courses but we'll paginate the display
        courses = await loadAllCourses();
        setAllCoursesLoaded(true);
      }
      setAvailableCourses(courses);
    } catch (error) {
      console.error('Failed to load courses:', error);
      setAvailableCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load courses when institution changes
  useEffect(() => {
    loadCourses(selectedInst);
  }, [selectedInst, loadCourses]);

  // Get available institutions (only those with data)
  const institutions = useMemo(() => {
    return getAvailableInstitutions().sort((a, b) =>
      formatInstitutionLabel(a, 'full').localeCompare(
        formatInstitutionLabel(b, 'full'),
        'no'
      )
    );
  }, []);

  // Filter courses based on search query
  const filteredCourses = useMemo(() => {
    if (loading) return [];

    let courses = availableCourses;

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toUpperCase();
      courses = courses.filter(c => {
        const codeMatch = c.code.toUpperCase().includes(query);
        const nameMatch = c.name.toUpperCase().includes(query);
        const institutionName = UNIVERSITIES[c.institution]?.name?.toUpperCase() || '';
        const institutionShort = UNIVERSITIES[c.institution]?.shortName?.toUpperCase() || '';
        const institutionMatch =
          institutionName.includes(query) || institutionShort.includes(query);
        return codeMatch || nameMatch || institutionMatch;
      });
    }

    return courses.sort((a, b) => a.code.localeCompare(b.code));
  }, [searchQuery, availableCourses, loading]);

  // Get displayed courses (paginated)
  const displayedCourses = useMemo(() => {
    return filteredCourses.slice(0, displayedCount);
  }, [filteredCourses, displayedCount]);

  const handleLoadMore = () => {
    setDisplayedCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredCourses.length));
  };

  const hasMore = displayedCount < filteredCourses.length;

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
                title={formatInstitutionLabel(inst, 'full-short')}
              >
                {UNIVERSITIES[inst]?.shortName || inst}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.coursesList}>
        {loading ? (
          <div className={styles.emptyState}>
            <p>Laster emner...</p>
          </div>
        ) : displayedCourses.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Ingen emner funnet</p>
          </div>
        ) : (
          <>
            <div className={styles.coursesGrid}>
              {displayedCourses.map((course) => (
                <button
                  key={`${course.code}-${course.institution}`}
                  className={styles.courseItem}
                  onClick={() => handleCourseClick(course)}
                  title={`${course.name} – ${formatInstitutionLabel(course.institution, 'short-full')}`}
                >
                  <div className={styles.courseCode}>{stripCourseCodeSuffix(course.code)}</div>
                  {course.name && course.name !== course.code && (
                    <div className={styles.courseName}>{course.name}</div>
                  )}
                  <div className={styles.courseInstitution}>
                    {formatInstitutionLabel(course.institution, 'short-full')}
                  </div>
                </button>
              ))}
            </div>
            {hasMore && (
              <div className={styles.loadMoreContainer}>
                <button
                  onClick={handleLoadMore}
                  className={styles.loadMoreButton}
                >
                  Last flere emner ({displayedCount} av {filteredCourses.length})
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className={styles.explorerFooter}>
        <p className={styles.courseCount}>
          {loading ? (
            'Laster...'
          ) : (
            <>
              {displayedCourses.length} av {filteredCourses.length} {filteredCourses.length === 1 ? 'emne' : 'emner'}
              {selectedInst && ` fra ${formatInstitutionLabel(selectedInst, 'short-full')}`}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

