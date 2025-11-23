import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowUpDown, Filter, Search, ArrowUp, X, Plus } from 'lucide-react';
import Layout from '@/components/Layout';
import BottomSearchBar from '@/components/BottomSearchBar';
import CourseDistributionCard from '@/components/CourseDistributionCard';
import { fetchAllYearsData, UNIVERSITIES, formatCourseCode } from '@/lib/api';
import { processGradeData } from '@/lib/utils';
import { CourseStats } from '@/types';
import { loadAllCourses } from '@/lib/all-courses';
import { CourseInfo } from '@/lib/courses';
import styles from '@/styles/Home.module.css';

type SortOption = 'most-a' | 'least-a' | 'highest-avg' | 'lowest-avg' | 'most-students' | 'least-students';

const COURSES_PER_PAGE = 9;

export default function Home() {
  const [allCourses, setAllCourses] = useState<CourseInfo[]>([]);
  const [coursesData, setCoursesData] = useState<Map<string, CourseStats & { institution: string; courseName: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('most-a');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('all');
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pendingSortBy, setPendingSortBy] = useState<SortOption>('most-a');
  const [pendingInstitution, setPendingInstitution] = useState<string>('all');
  const [displayCount, setDisplayCount] = useState(COURSES_PER_PAGE); // How many courses to show
  const [initialLoadComplete, setInitialLoadComplete] = useState(false); // Track if initial 9 courses are loaded
  const [lastSortBy, setLastSortBy] = useState<SortOption | null>(null); // Track last sort option to detect changes
  const [courseOrder, setCourseOrder] = useState<string[]>([]); // Maintain stable order of courses
  const coursesDataRef = useRef<Map<string, CourseStats & { institution: string; courseName: string }>>(new Map());
  const loadingCoursesRef = useRef<Set<string>>(new Set());

  // Load course list metadata
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

  // Reset initial load when institution changes
  useEffect(() => {
    if (allCourses.length > 0) {
      setInitialLoadComplete(false);
    }
  }, [selectedInstitution]);

  // Check if initial load is complete (we have at least 9 courses loaded)
  useEffect(() => {
    if (searchQuery.trim() || initialLoadComplete) return;
    
    const filtered = selectedInstitution !== 'all'
      ? allCourses.filter(c => c.institution === selectedInstitution)
      : allCourses;
    
    const coursesWithData = filtered.filter(c => {
      const key = `${c.institution}-${c.code}`;
      return coursesDataRef.current.has(key);
    });
    
    if (coursesWithData.length >= COURSES_PER_PAGE && loadingCoursesRef.current.size === 0) {
      setInitialLoadComplete(true);
    }
  }, [allCourses, selectedInstitution, searchQuery, initialLoadComplete]);

  // Load initial 9 courses
  useEffect(() => {
    if (allCourses.length === 0 || searchQuery.trim() || initialLoadComplete) return;
    
    const filtered = selectedInstitution !== 'all'
      ? allCourses.filter(c => c.institution === selectedInstitution)
      : allCourses;

    const coursesToLoad = filtered
      .filter(course => {
        const key = `${course.institution}-${course.code}`;
        return !coursesDataRef.current.has(key) && !loadingCoursesRef.current.has(key);
      })
      .slice(0, COURSES_PER_PAGE);

    if (coursesToLoad.length === 0) {
      // If no courses to load, check if we have enough loaded
      const filteredWithData = filtered.filter(c => {
        const key = `${c.institution}-${c.code}`;
        return coursesDataRef.current.has(key);
      });
      if (filteredWithData.length >= COURSES_PER_PAGE) {
        setInitialLoadComplete(true);
      }
      return;
    }

    // Mark as loading
    setLoadingCourses(prev => {
      const next = new Set(prev);
      coursesToLoad.forEach(c => next.add(`${c.institution}-${c.code}`));
      return next;
    });

    // Fetch the courses
    Promise.all(
      coursesToLoad.map(async (course) => {
        try {
          const uniData = UNIVERSITIES[course.institution];
          if (!uniData) return null;
          
          const formattedCode = formatCourseCode(course.code, course.institution);
          const data = await fetchAllYearsData(uniData.code, formattedCode, undefined, course.institution);
          
          if (!data || data.length === 0) return null;
          
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
      })
    ).then(results => {
      const validResults = results.filter((r): r is { key: string; data: CourseStats & { institution: string; courseName: string } } => r !== null);
      
      setCoursesData(prev => {
        const next = new Map(prev);
        validResults.forEach(({ key, data }) => next.set(key, data));
        return next;
      });

      setLoadingCourses(prev => {
        const next = new Set(prev);
        coursesToLoad.forEach(c => next.delete(`${c.institution}-${c.code}`));
        return next;
      });
    });
  }, [allCourses, selectedInstitution, searchQuery, initialLoadComplete]);

  // Reset course order when sort option, institution, or search changes
  useEffect(() => {
    if (sortBy !== lastSortBy || selectedInstitution !== 'all' || searchQuery.trim()) {
      setCourseOrder([]);
      setLastSortBy(sortBy);
    }
  }, [sortBy, selectedInstitution, searchQuery, lastSortBy]);

  // Filter and sort courses (only using already-loaded data)
  const filteredAndSortedCourses = useMemo(() => {
    // Filter courses by institution and search query
    let filtered = selectedInstitution !== 'all'
      ? allCourses.filter(c => c.institution === selectedInstitution)
      : allCourses;
    
    // Apply search filter with priority: code starts with > code contains > name starts with > name contains
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toUpperCase();
      const codeStartsWith: typeof filtered = [];
      const codeContains: typeof filtered = [];
      const nameStartsWith: typeof filtered = [];
      const nameContains: typeof filtered = [];
      
      filtered.forEach(c => {
        const codeUpper = c.code.toUpperCase();
        const nameUpper = c.name ? c.name.toUpperCase() : '';
        
        if (codeUpper.startsWith(query)) {
          codeStartsWith.push(c);
        } else if (codeUpper.includes(query)) {
          codeContains.push(c);
        } else if (nameUpper.startsWith(query)) {
          nameStartsWith.push(c);
        } else if (nameUpper.includes(query)) {
          nameContains.push(c);
        }
      });
      
      // Combine with priority order
      filtered = [...codeStartsWith, ...codeContains, ...nameStartsWith, ...nameContains];
    }

    // Get courses with loaded data
    const coursesWithData = filtered
      .map(course => {
        const key = `${course.institution}-${course.code}`;
        const data = coursesData.get(key);
        return data ? data : null;
      })
      .filter((item): item is CourseStats & { institution: string; courseName: string } => item !== null);

    // If we have a stable order and sort hasn't changed, maintain it
    if (courseOrder.length > 0 && sortBy === lastSortBy && !searchQuery.trim()) {
      // Sort by existing order first, then append new courses
      const orderedCourses: (CourseStats & { institution: string; courseName: string })[] = [];
      const unorderedCourses: (CourseStats & { institution: string; courseName: string })[] = [];
      
      coursesWithData.forEach(course => {
        const key = `${course.institution}-${course.courseCode}`;
        if (courseOrder.includes(key)) {
          orderedCourses.push(course);
        } else {
          unorderedCourses.push(course);
        }
      });
      
      // Sort ordered courses by their position in courseOrder
      orderedCourses.sort((a, b) => {
        const keyA = `${a.institution}-${a.courseCode}`;
        const keyB = `${b.institution}-${b.courseCode}`;
        return courseOrder.indexOf(keyA) - courseOrder.indexOf(keyB);
      });
      
      // Sort new courses and append
      unorderedCourses.sort((a, b) => {
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
      
      return [...orderedCourses, ...unorderedCourses];
    }

    // Sort using loaded data only (when order should be reset)
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
  }, [allCourses, coursesData, sortBy, selectedInstitution, searchQuery, courseOrder, lastSortBy]);

  // Update course order when sorting (separate effect to avoid infinite loop)
  useEffect(() => {
    if (filteredAndSortedCourses.length > 0 && (courseOrder.length === 0 || sortBy !== lastSortBy) && !searchQuery.trim()) {
      const newOrder = filteredAndSortedCourses.map(c => `${c.institution}-${c.courseCode}`);
      setCourseOrder(newOrder);
      setLastSortBy(sortBy);
    }
  }, [filteredAndSortedCourses, sortBy, courseOrder.length, lastSortBy, searchQuery]);

  // Load more courses when user clicks "load more"
  const handleLoadMore = useCallback(() => {
    // First, check if we have more courses already loaded that we can show
    if (displayCount < filteredAndSortedCourses.length) {
      // Just increment display count to show more already-loaded courses
      setDisplayCount(prev => prev + COURSES_PER_PAGE);
      return;
    }

    // Otherwise, load new course data
    let coursesToLoad: typeof allCourses = [];
    
    if (searchQuery.trim()) {
      // If searching, load matching courses with priority sorting
      const query = searchQuery.trim().toUpperCase();
      const codeStartsWith: typeof allCourses = [];
      const codeContains: typeof allCourses = [];
      const nameStartsWith: typeof allCourses = [];
      const nameContains: typeof allCourses = [];
      
      allCourses.forEach(c => {
        const matchesInstitution = selectedInstitution === 'all' || c.institution === selectedInstitution;
        if (!matchesInstitution) return;
        
        const codeUpper = c.code.toUpperCase();
        const nameUpper = c.name ? c.name.toUpperCase() : '';
        
        if (codeUpper.startsWith(query)) {
          codeStartsWith.push(c);
        } else if (codeUpper.includes(query)) {
          codeContains.push(c);
        } else if (nameUpper.startsWith(query)) {
          nameStartsWith.push(c);
        } else if (nameUpper.includes(query)) {
          nameContains.push(c);
        }
      });
      
      const matchingCourses = [...codeStartsWith, ...codeContains, ...nameStartsWith, ...nameContains];
      
      // Use refs to check which courses are already loaded
      coursesToLoad = matchingCourses
        .filter(course => {
          const key = `${course.institution}-${course.code}`;
          return !coursesDataRef.current.has(key) && !loadingCoursesRef.current.has(key);
        })
        .slice(0, COURSES_PER_PAGE);
    } else {
      // If not searching, load filtered courses
      const filtered = selectedInstitution !== 'all'
        ? allCourses.filter(c => c.institution === selectedInstitution)
        : allCourses;

      // Use refs to check which courses are already loaded
      coursesToLoad = filtered
        .filter(course => {
          const key = `${course.institution}-${course.code}`;
          return !coursesDataRef.current.has(key) && !loadingCoursesRef.current.has(key);
        })
        .slice(0, COURSES_PER_PAGE);
    }

    if (coursesToLoad.length === 0) return;

    // Mark as loading
    setLoadingCourses(prev => {
      const next = new Set(prev);
      coursesToLoad.forEach(c => next.add(`${c.institution}-${c.code}`));
      return next;
    });

    // Fetch the courses
    Promise.all(
      coursesToLoad.map(async (course) => {
        try {
          const uniData = UNIVERSITIES[course.institution];
          if (!uniData) return null;
          
          const formattedCode = formatCourseCode(course.code, course.institution);
          const data = await fetchAllYearsData(uniData.code, formattedCode, undefined, course.institution);
          
          if (!data || data.length === 0) return null;
          
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
      })
    ).then(results => {
      const validResults = results.filter((r): r is { key: string; data: CourseStats & { institution: string; courseName: string } } => r !== null);
      
      setCoursesData(prev => {
        const next = new Map(prev);
        validResults.forEach(({ key, data }) => next.set(key, data));
        return next;
      });

      setLoadingCourses(prev => {
        const next = new Set(prev);
        coursesToLoad.forEach(c => next.delete(`${c.institution}-${c.code}`));
        return next;
      });

      // Append new course keys to the order (maintain stable order)
      setCourseOrder(prev => {
        const newKeys = validResults.map(r => r.key);
        return [...prev, ...newKeys.filter(k => !prev.includes(k))];
      });

      setDisplayCount(prev => prev + COURSES_PER_PAGE);
    });
  }, [allCourses, selectedInstitution, displayCount, filteredAndSortedCourses.length, searchQuery]);

  // Sync refs with state
  useEffect(() => {
    coursesDataRef.current = coursesData;
  }, [coursesData]);

  useEffect(() => {
    loadingCoursesRef.current = loadingCourses;
  }, [loadingCourses]);

  // Load data for courses matching search query (with debouncing - only load initial batch)
  useEffect(() => {
    if (allCourses.length === 0 || !searchQuery.trim()) {
      // Reset display count when search is cleared
      if (!searchQuery.trim()) {
        setDisplayCount(COURSES_PER_PAGE);
      }
      return;
    }
    
    let cancelled = false;
    const INITIAL_BATCH_SIZE = 50; // Load initial 50 courses
    const MAX_CONCURRENT_REQUESTS = 10; // Limit concurrent API calls
    
    const debounceTimer = setTimeout(() => {
      if (cancelled) return;
      
      const query = searchQuery.trim().toUpperCase();
      // Filter and sort matches by priority: code starts with > code contains > name starts with > name contains
      const codeStartsWith: typeof allCourses = [];
      const codeContains: typeof allCourses = [];
      const nameStartsWith: typeof allCourses = [];
      const nameContains: typeof allCourses = [];
      
      allCourses.forEach(c => {
        const matchesInstitution = selectedInstitution === 'all' || c.institution === selectedInstitution;
        if (!matchesInstitution) return;
        
        const codeUpper = c.code.toUpperCase();
        const nameUpper = c.name ? c.name.toUpperCase() : '';
        
        if (codeUpper.startsWith(query)) {
          codeStartsWith.push(c);
        } else if (codeUpper.includes(query)) {
          codeContains.push(c);
        } else if (nameUpper.startsWith(query)) {
          nameStartsWith.push(c);
        } else if (nameUpper.includes(query)) {
          nameContains.push(c);
        }
      });
      
      const matchingCourses = [...codeStartsWith, ...codeContains, ...nameStartsWith, ...nameContains];
      
      // Only load initial batch - user can load more via "Load More" button
      const initialBatch = matchingCourses.slice(0, INITIAL_BATCH_SIZE);
      
      // Use refs to check current state
      const coursesToLoad = initialBatch.filter(course => {
        const key = `${course.institution}-${course.code}`;
        return !coursesDataRef.current.has(key) && !loadingCoursesRef.current.has(key);
      });

      if (coursesToLoad.length === 0 || cancelled) {
        return;
      }

      // Mark as loading
      setLoadingCourses(prev => {
        const next = new Set(prev);
        coursesToLoad.forEach(c => next.add(`${c.institution}-${c.code}`));
        return next;
      });

      // Fetch courses in chunks to avoid overwhelming the server
      const chunkSize = MAX_CONCURRENT_REQUESTS;
      (async () => {
        for (let i = 0; i < coursesToLoad.length; i += chunkSize) {
          if (cancelled) break;
          
          const chunk = coursesToLoad.slice(i, i + chunkSize);
          const results = await Promise.all(
            chunk.map(async (course) => {
              if (cancelled) return null;
              try {
                const uniData = UNIVERSITIES[course.institution];
                if (!uniData) return null;
                
                const formattedCode = formatCourseCode(course.code, course.institution);
                const data = await fetchAllYearsData(uniData.code, formattedCode, undefined, course.institution);
                
                if (!data || data.length === 0) return null;
                
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
            })
          );
          
          if (cancelled) break;
          
          const validResults = results.filter((r): r is { key: string; data: CourseStats & { institution: string; courseName: string } } => r !== null);
          
          // Update courses data
          setCoursesData(prev => {
            const next = new Map(prev);
            validResults.forEach(({ key, data }) => next.set(key, data));
            return next;
          });

          // Small delay between chunks to avoid rate limiting
          if (i + chunkSize < coursesToLoad.length && !cancelled) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        // Update loading state
        if (!cancelled) {
          setLoadingCourses(prev => {
            const next = new Set(prev);
            coursesToLoad.forEach(c => next.delete(`${c.institution}-${c.code}`));
            return next;
          });
        }
      })();
    }, 300); // Debounce search to reduce lag

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
    };
  }, [searchQuery, allCourses, selectedInstitution]);

  // Initialize pending values
  useEffect(() => {
    setPendingSortBy(sortBy);
    setPendingInstitution(selectedInstitution);
  }, []);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setSortBy(pendingSortBy);
    setSelectedInstitution(pendingInstitution);
    setSearchQuery(searchInput.trim());
    setDisplayCount(COURSES_PER_PAGE); // Reset to 9 when applying
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchQuery(searchInput.trim());
    setDisplayCount(COURSES_PER_PAGE); // Reset to 9 when searching
  };

  const handleSearchClear = () => {
    setSearchInput('');
    setSearchQuery('');
    setDisplayCount(COURSES_PER_PAGE);
  };

  // Limit displayed courses to displayCount (always limit to 9 at a time)
  const displayedCourses = useMemo(() => {
    return filteredAndSortedCourses.slice(0, displayCount);
  }, [filteredAndSortedCourses, displayCount]);

  // Check if there are more courses to load or display
  const hasMoreCourses = useMemo(() => {
    // Check if we have more courses already loaded that we haven't displayed
    if (displayCount < filteredAndSortedCourses.length) {
      return true;
    }
    
    // If searching, check if there are more matching courses that need data loaded
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toUpperCase();
      // Filter with priority sorting (same as above)
      const codeStartsWith: typeof allCourses = [];
      const codeContains: typeof allCourses = [];
      const nameStartsWith: typeof allCourses = [];
      const nameContains: typeof allCourses = [];
      
      allCourses.forEach(c => {
        const matchesInstitution = selectedInstitution === 'all' || c.institution === selectedInstitution;
        if (!matchesInstitution) return;
        
        const codeUpper = c.code.toUpperCase();
        const nameUpper = c.name ? c.name.toUpperCase() : '';
        
        if (codeUpper.startsWith(query)) {
          codeStartsWith.push(c);
        } else if (codeUpper.includes(query)) {
          codeContains.push(c);
        } else if (nameUpper.startsWith(query)) {
          nameStartsWith.push(c);
        } else if (nameUpper.includes(query)) {
          nameContains.push(c);
        }
      });
      
      const matchingCourses = [...codeStartsWith, ...codeContains, ...nameStartsWith, ...nameContains];
      
      const coursesWithData = matchingCourses.filter(c => {
        const key = `${c.institution}-${c.code}`;
        return coursesDataRef.current.has(key);
      });
      
      return coursesWithData.length < matchingCourses.length;
    }
    
    // Check if there are more courses that need data loaded
    const filtered = selectedInstitution !== 'all'
      ? allCourses.filter(c => c.institution === selectedInstitution)
      : allCourses;
    
    const coursesWithData = filtered.filter(c => {
      const key = `${c.institution}-${c.code}`;
      return coursesDataRef.current.has(key);
    });
    
    return coursesWithData.length < filtered.length;
  }, [allCourses, selectedInstitution, searchQuery, displayCount, filteredAndSortedCourses.length]);

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
                value={pendingSortBy}
                onChange={(e) => setPendingSortBy(e.target.value as SortOption)}
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
                value={pendingInstitution}
                onChange={(e) => setPendingInstitution(e.target.value)}
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
            <div className={styles.controlGroup}>
              <button
                type="submit"
                className={styles.applyButton}
                aria-label="Apply filters"
              >
                <ArrowUp size={16} />
                <span>Bruk</span>
              </button>
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
                  Viser {displayedCourses.length} emner
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
                {displayedCourses.map((course, index) => (
                  <CourseDistributionCard
                    key={`${course.courseCode}-${course.year}-${course.institution}-${index}`}
                    course={course}
                    institution={course.institution}
                  />
                ))}
              </div>
              {hasMoreCourses && (
                <div className={styles.loadMoreContainer}>
                  <button 
                    onClick={handleLoadMore} 
                    className={styles.loadMoreButtonInline} 
                    disabled={loadingCourses.size > 0}
                    aria-label="Last flere emner"
                  >
                    {loadingCourses.size > 0 ? 'Laster...' : 'Last inn flere'}
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
