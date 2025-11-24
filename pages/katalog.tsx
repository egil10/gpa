import React, { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import { loadAllCourses } from '@/lib/all-courses';
import { CourseInfo } from '@/lib/courses';
import { UNIVERSITIES, formatInstitutionLabel } from '@/lib/api';
import { Search, Filter } from 'lucide-react';
import styles from '@/styles/Katalog.module.css';

const COURSES_PER_PAGE = 25;

export default function KatalogPage() {
  const [allCourses, setAllCourses] = useState<CourseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('all');
  const [displayCount, setDisplayCount] = useState(COURSES_PER_PAGE);

  // Load all courses on mount
  useEffect(() => {
    loadAllCourses().then((courses) => {
      setAllCourses(courses);
      setLoading(false);
    });
  }, []);

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(COURSES_PER_PAGE);
  }, [searchQuery, selectedInstitution]);

  // Filter courses based on search and institution
  const filteredCourses = useMemo(() => {
    let filtered = allCourses;

    // Filter by institution
    if (selectedInstitution !== 'all') {
      filtered = filtered.filter(c => c.institution === selectedInstitution);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toUpperCase();
      filtered = filtered.filter(c => {
        const codeMatch = c.code.toUpperCase().includes(query);
        const nameMatch = c.name && c.name.toUpperCase().includes(query);
        const institutionName = UNIVERSITIES[c.institution]?.name?.toUpperCase() || '';
        const institutionShort = UNIVERSITIES[c.institution]?.shortName?.toUpperCase() || '';
        const institutionMatch =
          institutionName.includes(query) || institutionShort.includes(query);
        return codeMatch || nameMatch || institutionMatch;
      });
    }

    // Sort alphabetically by code
    return filtered.sort((a, b) => a.code.localeCompare(b.code, 'no'));
  }, [allCourses, searchQuery, selectedInstitution]);

  // Get courses to display (paginated)
  const displayedCourses = useMemo(() => {
    return filteredCourses.slice(0, displayCount);
  }, [filteredCourses, displayCount]);

  const hasMore = filteredCourses.length > displayCount;

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + COURSES_PER_PAGE);
  };

  return (
    <Layout 
      title="Emnekatalog" 
      description="Søk og bla gjennom alle emnekoder fra alle norske universiteter."
    >
      <div className={styles.katalogPage}>
        <div className="container">
          <div className={styles.header}>
            <h1 className={styles.title}>Emnekatalog</h1>
            <p className={styles.subtitle}>
              Bla gjennom alle emnekoder fra alle universiteter. Søk etter emnekode eller navn.
            </p>
          </div>

          <div className={styles.filters}>
            <div className={styles.searchContainer}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Søk etter emnekode eller navn..."
                className={styles.searchInput}
                autoFocus
              />
            </div>
            <div className={styles.institutionFilter}>
              <Filter size={16} className={styles.filterIcon} />
              <select
                value={selectedInstitution}
                onChange={(e) => setSelectedInstitution(e.target.value)}
                className={styles.select}
              >
                <option value="all">Alle institusjoner</option>
                {Object.entries(UNIVERSITIES)
                  .sort(([, a], [, b]) => a.name.localeCompare(b.name, 'no'))
                  .map(([key, uni]) => (
                    <option key={key} value={key}>
                      {formatInstitutionLabel(key, 'full-short')}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>
              <p>Laster emner...</p>
            </div>
          ) : (
            <>
              <div className={styles.resultsInfo}>
                <p>
                  {filteredCourses.length === 0 
                    ? 'Ingen emner funnet' 
                    : `Viser ${displayedCourses.length.toLocaleString()} av ${filteredCourses.length.toLocaleString()} emner`}
                </p>
              </div>

              <div className={styles.coursesList}>
                {displayedCourses.map((course) => {
                  const institutionName = formatInstitutionLabel(course.institution, 'short-full');
                  
                  return (
                    <div key={`${course.institution}-${course.code}`} className={styles.courseItem}>
                      <div className={styles.courseInstitution}>{institutionName}</div>
                      <div className={styles.courseCode}>{course.code}</div>
                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <div className={styles.loadMoreContainer}>
                  <button 
                    onClick={handleLoadMore} 
                    className={styles.loadMoreButton}
                  >
                    Last inn flere
                  </button>
                </div>
              )}

              {!hasMore && filteredCourses.length > 0 && (
                <div className={styles.loadMoreContainer}>
                  <button 
                    disabled
                    className={`${styles.loadMoreButton} ${styles.loadMoreButtonDimmed}`}
                  >
                    Alle emner lastet
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

