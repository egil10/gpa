import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, ArrowUpDown, Filter, Search, ArrowUp, X } from 'lucide-react';
import Layout from '@/components/Layout';
import BottomSearchBar from '@/components/BottomSearchBar';
import CourseDistributionCard from '@/components/CourseDistributionCard';
import { fetchAllYearsData, UNIVERSITIES, formatCourseCode } from '@/lib/api';
import { processGradeData } from '@/lib/utils';
import { CourseStats } from '@/types';
import { loadAllCourses, getPopularCourses } from '@/lib/all-courses';
import { CourseInfo } from '@/lib/courses';
import styles from '@/styles/Home.module.css';

type SortOption = 'most-a' | 'least-a' | 'highest-avg' | 'lowest-avg' | 'most-students' | 'least-students';

export default function Home() {
  const [allCourses, setAllCourses] = useState<CourseInfo[]>([]);
  const [coursesData, setCoursesData] = useState<Map<string, CourseStats & { institution: string; courseName: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('most-a');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('all');
  const [searchInput, setSearchInput] = useState<string>(''); // What user types
  const [searchQuery, setSearchQuery] = useState<string>(''); // Actual filter value
  const [loadedCount, setLoadedCount] = useState(0); // Track how many courses we've loaded data for
  const [targetCount, setTargetCount] = useState(15); // Target: load 15 initially
  const [isAutoLoading, setIsAutoLoading] = useState(true); // Auto-load until we reach target

  // Load course list metadata (fast - just codes/names)
  useEffect(() => {
    const loadCourseList = async () => {
      setLoading(true);
      try {
        const courses = await loadAllCourses();
        setAllCourses(courses);
      } catch (error) {
        console.error('Failed to load courses:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCourseList();
  }, []);

  // Lazy load grade data for courses (loads 3 at a time)
  const loadCoursesData = useCallback(async (coursesToLoad: CourseInfo[], batchSize: number = 3) => {
    const coursesToFetch = coursesToLoad.filter(course => {
      const key = `${course.institution}-${course.code}`;
      return !coursesData.has(key) && !loadingCourses.has(key);
    });

    if (coursesToFetch.length === 0) return 0;

    // Take only the batch size we need
    const batch = coursesToFetch.slice(0, batchSize);
    
    // Mark as loading
    setLoadingCourses(prev => {
      const next = new Set(prev);
      batch.forEach(c => next.add(`${c.institution}-${c.code}`));
      return next;
    });

    // Fetch the batch
    const batchPromises = batch.map(async (course): Promise<{ key: string; data: CourseStats & { institution: string; courseName: string } } | null> => {
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
          key: `${course.institution}-${course.code}`,
          data: {
            ...stats,
            institution: course.institution,
            courseName: course.name,
          },
        };
      } catch (error) {
        return null;
      }
    });
    
    const results = await Promise.all(batchPromises);
    type ResultItem = { 
      key: string; 
      data: CourseStats & { institution: string; courseName: string } 
    };
    const validResults: ResultItem[] = results.filter((r): r is ResultItem => r !== null);
    
    // Update cache
    setCoursesData(prev => {
      const next = new Map(prev);
      validResults.forEach(({ key, data }) => next.set(key, data));
      return next;
    });

    // Remove from loading set
    setLoadingCourses(prev => {
      const next = new Set(prev);
      batch.forEach(c => next.delete(`${c.institution}-${c.code}`));
      return next;
    });

    return validResults.length;
  }, [coursesData, loadingCourses]);

  // Auto-load full data for courses (simple sequential loading)
  useEffect(() => {
    if (allCourses.length === 0) return;
    if (!isAutoLoading) return;
    if (loadingCourses.size > 0) return; // Wait for current batch to finish
    if (searchQuery.trim()) return; // Don't auto-load when searching

    // Filter courses by institution
    let filtered = selectedInstitution !== 'all'
      ? allCourses.filter(c => c.institution === selectedInstitution)
      : allCourses;

    // Find courses that need data loaded (just pick next ones sequentially)
    const coursesNeedingData = filtered
      .filter(course => {
        const key = `${course.institution}-${course.code}`;
        return !coursesData.has(key) && !loadingCourses.has(key);
      })
      .slice(0, 3); // Load 3 at a time

    if (coursesNeedingData.length === 0) {
      // Check if we have enough courses with data for current filter
      const coursesWithData = filtered.filter(c => {
        const key = `${c.institution}-${c.code}`;
        return coursesData.has(key);
      });
      
      if (coursesWithData.length >= targetCount) {
        setIsAutoLoading(false);
      }
      return;
    }

    // Load next batch of 3
    loadCoursesData(coursesNeedingData, 3).then(loaded => {
      if (loaded > 0) {
        setLoadedCount(prev => prev + loaded);
      }
    });
  }, [allCourses, selectedInstitution, searchQuery, loadCoursesData, targetCount, isAutoLoading, loadingCourses]);
  
  // Separate effect to check if we've loaded enough
  useEffect(() => {
    if (searchQuery.trim()) return;
    if (!isAutoLoading) return;
    
    let filtered = selectedInstitution !== 'all'
      ? allCourses.filter(c => c.institution === selectedInstitution)
      : allCourses;
    
    const coursesWithData = filtered.filter(c => {
      const key = `${c.institution}-${c.code}`;
      return coursesData.has(key);
    });
    
    if (coursesWithData.length >= targetCount) {
      setIsAutoLoading(false);
    }
  }, [coursesData, allCourses, selectedInstitution, searchQuery, targetCount, isAutoLoading]);

  // Filter and sort courses (only using already-loaded data)
  const filteredAndSortedCourses = useMemo(() => {
    // Filter courses by institution and search query
    let filtered = selectedInstitution !== 'all'
      ? allCourses.filter(c => c.institution === selectedInstitution)
      : allCourses;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toUpperCase();
      filtered = filtered.filter(c => 
        c.code.toUpperCase().includes(query) ||
        (c.name && c.name.toUpperCase().includes(query))
      );
    }

    // Get courses with loaded data
    const coursesWithData = filtered
      .map(course => {
        const key = `${course.institution}-${course.code}`;
        const data = coursesData.get(key);
        return data ? data : null;
      })
      .filter((item): item is CourseStats & { institution: string; courseName: string } => item !== null);

    // Sort using loaded data only
    coursesWithData.sort((a, b) => {
      switch (sortBy) {
        case 'most-a': {
          const aPercent = a.distributions.find(d => d.grade === 'A')?.percentage || 0;
          const bPercent = b.distributions.find(d => d.grade === 'A')?.percentage || 0;
          return bPercent - aPercent;
        }
        case 'least-a': {
          const aPercent = a.distributions.find(d => d.grade === 'A')?.percentage || 0;
          const bPercent = b.distributions.find(d => d.grade === 'A')?.percentage || 0;
          return aPercent - bPercent;
        }
        case 'highest-avg':
          return (b.averageGrade || 0) - (a.averageGrade || 0);
        case 'lowest-avg':
          return (a.averageGrade || 0) - (b.averageGrade || 0);
        case 'most-students':
          return b.totalStudents - a.totalStudents;
        case 'least-students':
          return a.totalStudents - b.totalStudents;
        default:
          return 0;
      }
    });
    
    return coursesWithData;
  }, [allCourses, coursesData, sortBy, selectedInstitution, searchQuery]);

  // Load data for courses matching search query
  useEffect(() => {
    if (allCourses.length === 0 || !searchQuery.trim()) {
      // Reset auto-loading when search is cleared
      if (!searchQuery.trim() && !isAutoLoading) {
        setIsAutoLoading(true);
        setLoadedCount(0);
        setTargetCount(15);
      }
      return;
    }
    
    // When searching, disable auto-loading and load search results
    setIsAutoLoading(false);
    const query = searchQuery.trim().toUpperCase();
    const matchingCourses = allCourses.filter(c => {
      const matchesInstitution = selectedInstitution === 'all' || c.institution === selectedInstitution;
      const matchesSearch = c.code.toUpperCase().includes(query) ||
        (c.name && c.name.toUpperCase().includes(query));
      return matchesInstitution && matchesSearch;
    });
    
    // Load data for matching courses (limit to first 100 to avoid too many requests)
    loadCoursesData(matchingCourses.slice(0, 100), 10); // Load 10 at a time for search
  }, [searchQuery, allCourses, selectedInstitution, loadCoursesData, isAutoLoading]);

  // Load more courses when user clicks "load more"
  const handleLoadMore = useCallback(() => {
    setTargetCount(prev => prev + 15); // Load 15 more
    setIsAutoLoading(true); // Re-enable auto-loading
  }, []);

  const handleRefresh = () => {
    // Clear cache and reload course list
    setCoursesData(new Map());
    setLoadingCourses(new Set());
    setLoadedCount(0);
    setTargetCount(15);
    setIsAutoLoading(true);
    setSearchQuery('');
    setSearchInput('');
    // Reload course list
    loadAllCourses().then(courses => {
      setAllCourses(courses);
    }).catch(error => {
      console.error('Failed to reload courses:', error);
    });
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const handleSearchClear = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  return (
    <Layout title="Hjem" description="Utforsk karakterstatistikk for norske universitetsemner">
      <div className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Karakterfordeling
            </h1>
            <BottomSearchBar />
          </div>
        </div>
      </div>

      <section className={styles.distributionsSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Karakterfordelinger</h2>
            <button
              onClick={handleRefresh}
              className={styles.refreshButton}
              disabled={loading}
              aria-label="Refresh courses"
              title="Oppdater"
            >
              <RefreshCw size={18} className={loading ? styles.spinning : ''} />
            </button>
          </div>

          {/* Sorting and Filtering Controls */}
          <form onSubmit={handleSearchSubmit} className={styles.controls}>
            <div className={styles.controlGroup}>
              <label htmlFor="search" className={styles.controlLabel} title="Søk">
                <Search size={16} />
              </label>
              <div className={styles.searchInputWrapper}>
                <input
                  id="search"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Søk etter emnekode eller navn..."
                  className={styles.searchInput}
                />
                {searchInput.trim() && (
                  <button
                    type="button"
                    onClick={handleSearchClear}
                    className={styles.searchClearButton}
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
                <button
                  type="submit"
                  className={styles.searchSubmitButton}
                  aria-label="Search"
                  disabled={!searchInput.trim()}
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </div>
            <div className={styles.controlGroup}>
              <label htmlFor="sortBy" className={styles.controlLabel} title="Sorter etter">
                <ArrowUpDown size={16} />
              </label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={styles.select}
              >
                <option value="most-a">Mest A-er</option>
                <option value="least-a">Færrest A-er</option>
                <option value="highest-avg">Høyest snitt</option>
                <option value="lowest-avg">Lavest snitt</option>
                <option value="most-students">Flest kandidater</option>
                <option value="least-students">Færrest kandidater</option>
              </select>
            </div>
            <div className={styles.controlGroup}>
              <label htmlFor="institution" className={styles.controlLabel} title="Institusjon">
                <Filter size={16} />
              </label>
              <select
                id="institution"
                value={selectedInstitution}
                onChange={(e) => setSelectedInstitution(e.target.value)}
                className={styles.select}
              >
                <option value="all">Alle</option>
                {Object.entries(UNIVERSITIES).map(([key, uni]) => (
                  <option key={key} value={key}>
                    {uni.shortName}
                  </option>
                ))}
              </select>
            </div>
          </form>

          {loading ? (
            <div className={styles.loading}>
              <p>Laster emneliste...</p>
            </div>
          ) : (
            <>
              <div className={styles.resultsInfo}>
                <p>
                  Viser {filteredAndSortedCourses.length} emner
                </p>
                {searchQuery.trim() && (
                  <button
                    onClick={handleSearchClear}
                    className={styles.clearSearchButton}
                    aria-label="Clear search"
                  >
                    Tøm søk
                  </button>
                )}
              </div>
              <div className={styles.cardsGrid}>
                {filteredAndSortedCourses.map((course, index) => (
                  <CourseDistributionCard
                    key={`${course.courseCode}-${course.year}-${course.institution}-${index}`}
                    course={course}
                    institution={course.institution}
                  />
                ))}
              </div>
              {!searchQuery.trim() && !isAutoLoading && filteredAndSortedCourses.length > 0 && (
                <div className={styles.loadMoreContainer}>
                  <button onClick={handleLoadMore} className={styles.loadMoreButton} disabled={loadingCourses.size > 0}>
                    {loadingCourses.size > 0 ? 'Laster...' : 'Last flere emner'}
                  </button>
                </div>
              )}
              {isAutoLoading && loadingCourses.size === 0 && filteredAndSortedCourses.length < targetCount && (
                <div className={styles.loadingMore}>
                  <p>Laster flere emner...</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}
