import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, ArrowUpDown, Filter, Search, ArrowUp, X } from 'lucide-react';
import Layout from '@/components/Layout';
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
  const [courseSortMetadata, setCourseSortMetadata] = useState<Map<string, { totalStudents: number; aPercent: number; avgGrade: number }>>(new Map());
  const [isLoadingSortMetadata, setIsLoadingSortMetadata] = useState(false);

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

  // Auto-load full data for top sorted courses (based on metadata sort)
  useEffect(() => {
    if (allCourses.length === 0 || isLoadingSortMetadata) return;
    if (!isAutoLoading) return;
    if (loadingCourses.size > 0) return; // Wait for current batch to finish

    // Filter courses by institution and search
    let filtered = selectedInstitution !== 'all'
      ? allCourses.filter(c => c.institution === selectedInstitution)
      : allCourses;
    
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toUpperCase();
      filtered = filtered.filter(c => 
        c.code.toUpperCase().includes(query) ||
        (c.name && c.name.toUpperCase().includes(query))
      );
    }

    // Sort by metadata
    const sorted = [...filtered].sort((a, b) => {
      const keyA = `${a.institution}-${a.code}`;
      const keyB = `${b.institution}-${b.code}`;
      const metaA = courseSortMetadata.get(keyA);
      const metaB = courseSortMetadata.get(keyB);
      
      if (!metaA || !metaB) return 0; // Can't sort without metadata
      
      switch (sortBy) {
        case 'most-a':
          return metaB.aPercent - metaA.aPercent;
        case 'least-a':
          return metaA.aPercent - metaB.aPercent;
        case 'highest-avg':
          return metaB.avgGrade - metaA.avgGrade;
        case 'lowest-avg':
          return metaA.avgGrade - metaB.avgGrade;
        case 'most-students':
          return metaB.totalStudents - metaA.totalStudents;
        case 'least-students':
          return metaA.totalStudents - metaB.totalStudents;
        default:
          return 0;
      }
    });

    // Get top courses that need data loaded
    const topCoursesNeedingData = sorted
      .slice(0, targetCount * 2) // Get more than target to ensure we have enough
      .filter(course => {
        const key = `${course.institution}-${course.code}`;
        return !coursesData.has(key) && !loadingCourses.has(key) && courseSortMetadata.has(key);
      })
      .slice(0, 10); // Load up to 10 at a time

    if (topCoursesNeedingData.length === 0) {
      // Check if we have enough courses with data
      const coursesWithData = sorted.filter(c => {
        const key = `${c.institution}-${c.code}`;
        return coursesData.has(key);
      });
      
      if (coursesWithData.length >= targetCount) {
        setIsAutoLoading(false);
      }
      return;
    }

    // Load next batch of 3
    loadCoursesData(topCoursesNeedingData, 3).then(loaded => {
      if (loaded > 0) {
        setLoadedCount(prev => prev + loaded);
      }
      // Check if we've loaded enough
      const coursesWithData = sorted.filter(c => {
        const key = `${c.institution}-${c.code}`;
        return coursesData.has(key);
      });
      
      if (coursesWithData.length >= targetCount) {
        setIsAutoLoading(false);
      }
    });
  }, [allCourses, selectedInstitution, searchQuery, courseSortMetadata, sortBy, loadCoursesData, loadedCount, targetCount, isAutoLoading, coursesData, loadingCourses, isLoadingSortMetadata]);

  // Fetch sorting metadata for courses (basic stats for sorting)
  const fetchSortMetadata = useCallback(async (courses: CourseInfo[], batchSize: number = 20) => {
    setIsLoadingSortMetadata(true);
    const metadata = new Map<string, { totalStudents: number; aPercent: number; avgGrade: number }>();
    
    // Process in batches
    for (let i = 0; i < courses.length; i += batchSize) {
      const batch = courses.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (course) => {
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
          
          const aPercent = stats.distributions.find(d => d.grade === 'A')?.percentage || 0;
          
          return {
            key: `${course.institution}-${course.code}`,
            metadata: {
              totalStudents: stats.totalStudents,
              aPercent,
              avgGrade: stats.averageGrade || 0,
            }
          };
        } catch (error) {
          return null;
        }
      });
      
      const results = await Promise.all(batchPromises);
      results.forEach(result => {
        if (result) {
          metadata.set(result.key, result.metadata);
        }
      });
    }
    
    setCourseSortMetadata(metadata);
    setIsLoadingSortMetadata(false);
  }, []);

  // Load sorting metadata when sort option or filters change
  useEffect(() => {
    if (allCourses.length === 0) return;
    if (isLoadingSortMetadata) return; // Don't start new fetch if already loading
    
    // Filter courses by institution
    const filtered = selectedInstitution !== 'all'
      ? allCourses.filter(c => c.institution === selectedInstitution)
      : allCourses;
    
    // Only fetch metadata for courses we don't have yet
    const coursesNeedingMetadata = filtered.filter(c => {
      const key = `${c.institution}-${c.code}`;
      return !courseSortMetadata.has(key);
    });
    
    if (coursesNeedingMetadata.length > 0) {
      // Fetch metadata in batches (limit to reasonable amount to avoid too many requests)
      // For performance, only fetch for first 1000 courses
      const limit = Math.min(1000, coursesNeedingMetadata.length);
      fetchSortMetadata(coursesNeedingMetadata.slice(0, limit), 20);
    }
  }, [sortBy, selectedInstitution, allCourses, courseSortMetadata, isLoadingSortMetadata, fetchSortMetadata]);

  // Filter and sort courses using metadata
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
    
    // Sort courses by metadata (if available) or fall back to loaded data
    const sorted = [...filtered].sort((a, b) => {
      const keyA = `${a.institution}-${a.code}`;
      const keyB = `${b.institution}-${b.code}`;
      const metaA = courseSortMetadata.get(keyA);
      const metaB = courseSortMetadata.get(keyB);
      
      // If we have metadata, use it for sorting
      if (metaA && metaB) {
        switch (sortBy) {
          case 'most-a':
            return metaB.aPercent - metaA.aPercent;
          case 'least-a':
            return metaA.aPercent - metaB.aPercent;
          case 'highest-avg':
            return metaB.avgGrade - metaA.avgGrade;
          case 'lowest-avg':
            return metaA.avgGrade - metaB.avgGrade;
          case 'most-students':
            return metaB.totalStudents - metaA.totalStudents;
          case 'least-students':
            return metaA.totalStudents - metaB.totalStudents;
          default:
            return 0;
        }
      }
      
      // Fall back to loaded data if available
      const dataA = coursesData.get(keyA);
      const dataB = coursesData.get(keyB);
      
      if (dataA && dataB) {
        switch (sortBy) {
          case 'most-a': {
            const aPercent = dataA.distributions.find(d => d.grade === 'A')?.percentage || 0;
            const bPercent = dataB.distributions.find(d => d.grade === 'A')?.percentage || 0;
            return bPercent - aPercent;
          }
          case 'least-a': {
            const aPercent = dataA.distributions.find(d => d.grade === 'A')?.percentage || 0;
            const bPercent = dataB.distributions.find(d => d.grade === 'A')?.percentage || 0;
            return aPercent - bPercent;
          }
          case 'highest-avg':
            return (dataB.averageGrade || 0) - (dataA.averageGrade || 0);
          case 'lowest-avg':
            return (dataA.averageGrade || 0) - (dataB.averageGrade || 0);
          case 'most-students':
            return dataB.totalStudents - dataA.totalStudents;
          case 'least-students':
            return dataA.totalStudents - dataB.totalStudents;
          default:
            return 0;
        }
      }
      
      // If no metadata or data, maintain order
      return 0;
    });
    
    // Get top N courses based on sort
    const topCourses = sorted.slice(0, Math.max(targetCount * 2, 100)); // Get more than we need to ensure we have enough with data
    
    // Return only courses with full data loaded, maintaining sort order
    const coursesWithFullData = topCourses
      .map(course => {
        const key = `${course.institution}-${course.code}`;
        const data = coursesData.get(key);
        return data ? { course, data, sortKey: key } : null;
      })
      .filter((c): c is { course: CourseInfo; data: CourseStats & { institution: string; courseName: string }; sortKey: string } => c !== null);
    
    // Re-sort by full data to ensure correct order (metadata might be slightly different)
    const finalSorted = coursesWithFullData.sort((a, b) => {
      switch (sortBy) {
        case 'most-a': {
          const aPercent = a.data.distributions.find(d => d.grade === 'A')?.percentage || 0;
          const bPercent = b.data.distributions.find(d => d.grade === 'A')?.percentage || 0;
          return bPercent - aPercent;
        }
        case 'least-a': {
          const aPercent = a.data.distributions.find(d => d.grade === 'A')?.percentage || 0;
          const bPercent = b.data.distributions.find(d => d.grade === 'A')?.percentage || 0;
          return aPercent - bPercent;
        }
        case 'highest-avg':
          return (b.data.averageGrade || 0) - (a.data.averageGrade || 0);
        case 'lowest-avg':
          return (a.data.averageGrade || 0) - (b.data.averageGrade || 0);
        case 'most-students':
          return b.data.totalStudents - a.data.totalStudents;
        case 'least-students':
          return a.data.totalStudents - b.data.totalStudents;
        default:
          return 0;
      }
    });
    
    return finalSorted.map(({ data }) => data);
  }, [allCourses, coursesData, courseSortMetadata, sortBy, selectedInstitution, searchQuery, targetCount]);

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
    setCourseSortMetadata(new Map());
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
                Utforsk alle emner med karakterstatistikk. Sorter etter enkle eller vanskelige emner.
              </p>
            </div>
            <div className={styles.actions}>
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

          {/* Sorting and Filtering Controls */}
          <form onSubmit={handleSearchSubmit} className={styles.controls}>
            <div className={styles.controlGroup}>
              <label htmlFor="search" className={styles.controlLabel}>
                <Search size={16} />
                Søk:
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
              <label htmlFor="sortBy" className={styles.controlLabel}>
                <ArrowUpDown size={16} />
                Sorter etter:
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
              <label htmlFor="institution" className={styles.controlLabel}>
                <Filter size={16} />
                Institusjon:
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
                  {isLoadingSortMetadata ? (
                    'Laster sorteringsdata...'
                  ) : searchQuery.trim() ? (
                    <>
                      Viser {filteredAndSortedCourses.length} emner som matcher "{searchQuery}"
                      {selectedInstitution !== 'all' && ` fra ${UNIVERSITIES[selectedInstitution]?.shortName || selectedInstitution}`}
                    </>
                  ) : (
                    <>
                      Viser {filteredAndSortedCourses.length} emner (sortert fra {selectedInstitution !== 'all' 
                        ? allCourses.filter(c => c.institution === selectedInstitution).length 
                        : allCourses.length} totalt)
                      {selectedInstitution !== 'all' && ` fra ${UNIVERSITIES[selectedInstitution]?.shortName || selectedInstitution}`}
                    </>
                  )}
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
