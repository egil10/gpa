import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, ArrowUpDown, Filter, Search } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 }); // Load first 50

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

  // Lazy load grade data for courses in visible range
  const loadCoursesData = useCallback(async (coursesToLoad: CourseInfo[]) => {
    const coursesToFetch = coursesToLoad.filter(course => {
      const key = `${course.institution}-${course.code}`;
      return !coursesData.has(key) && !loadingCourses.has(key);
    });

    if (coursesToFetch.length === 0) return;

    // Mark as loading
    setLoadingCourses(prev => {
      const next = new Set(prev);
      coursesToFetch.forEach(c => next.add(`${c.institution}-${c.code}`));
      return next;
    });

    // Fetch in batches
    const BATCH_SIZE = 5;
    for (let i = 0; i < coursesToFetch.length; i += BATCH_SIZE) {
      const batch = coursesToFetch.slice(i, i + BATCH_SIZE);
      
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
    }

    // Remove from loading set
    setLoadingCourses(prev => {
      const next = new Set(prev);
      coursesToFetch.forEach(c => next.delete(`${c.institution}-${c.code}`));
      return next;
    });
  }, [coursesData, loadingCourses]);

  // Load data for courses that need it (prioritize visible range)
  useEffect(() => {
    if (allCourses.length === 0) return;
    
    const filtered = selectedInstitution !== 'all' 
      ? allCourses.filter(c => c.institution === selectedInstitution)
      : allCourses;
    
    // Load courses in the visible range first
    const visibleCourses = filtered.slice(visibleRange.start, visibleRange.end);
    loadCoursesData(visibleCourses);
  }, [allCourses, visibleRange, selectedInstitution, loadCoursesData]);

  // Filter and sort courses (only those with loaded data)
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
        return data ? { course, data } : null;
      })
      .filter((c): c is { course: CourseInfo; data: CourseStats & { institution: string; courseName: string } } => c !== null);
    
    // Sort courses
    const sorted = [...coursesWithData].sort((a, b) => {
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
    
    return sorted.map(({ data }) => data);
  }, [allCourses, coursesData, sortBy, selectedInstitution, searchQuery]);

  // Load data for courses matching search query
  useEffect(() => {
    if (allCourses.length === 0 || !searchQuery.trim()) return;
    
    const query = searchQuery.trim().toUpperCase();
    const matchingCourses = allCourses.filter(c => {
      const matchesInstitution = selectedInstitution === 'all' || c.institution === selectedInstitution;
      const matchesSearch = c.code.toUpperCase().includes(query) ||
        (c.name && c.name.toUpperCase().includes(query));
      return matchesInstitution && matchesSearch;
    });
    
    // Load data for matching courses (limit to first 100 to avoid too many requests)
    loadCoursesData(matchingCourses.slice(0, 100));
  }, [searchQuery, allCourses, selectedInstitution, loadCoursesData]);

  // Load more courses when user clicks "load more"
  const handleLoadMore = useCallback(() => {
    setVisibleRange(prev => ({
      start: 0,
      end: Math.min(prev.end + 50, allCourses.length)
    }));
  }, [allCourses.length]);

  const handleRefresh = () => {
    // Clear cache and reload course list
    setCoursesData(new Map());
    setLoadingCourses(new Set());
    setVisibleRange({ start: 0, end: 50 });
    setSearchQuery('');
    // Reload course list
    loadAllCourses().then(courses => {
      setAllCourses(courses);
    }).catch(error => {
      console.error('Failed to reload courses:', error);
    });
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
          <div className={styles.controls}>
            <div className={styles.controlGroup}>
              <label htmlFor="search" className={styles.controlLabel}>
                <Search size={16} />
                Søk:
              </label>
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Søk etter emnekode eller navn..."
                className={styles.searchInput}
              />
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
          </div>

          {loading ? (
            <div className={styles.loading}>
              <p>Laster emneliste...</p>
            </div>
          ) : (
            <>
              <div className={styles.resultsInfo}>
                <p>
                  {searchQuery.trim() ? (
                    <>
                      Viser {filteredAndSortedCourses.length} emner som matcher "{searchQuery}"
                      {selectedInstitution !== 'all' && ` fra ${UNIVERSITIES[selectedInstitution]?.shortName || selectedInstitution}`}
                    </>
                  ) : (
                    <>
                      Viser {filteredAndSortedCourses.length} emner med data
                      {selectedInstitution !== 'all' && ` fra ${UNIVERSITIES[selectedInstitution]?.shortName || selectedInstitution}`}
                      {allCourses.length > 0 && ` (${allCourses.length} totalt)`}
                    </>
                  )}
                </p>
                {searchQuery.trim() && (
                  <button
                    onClick={() => setSearchQuery('')}
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
              {filteredAndSortedCourses.length < visibleRange.end && (
                <div className={styles.loadMoreContainer}>
                  <button onClick={handleLoadMore} className={styles.loadMoreButton} disabled={loadingCourses.size > 0}>
                    {loadingCourses.size > 0 ? 'Laster...' : 'Last flere emner'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}
