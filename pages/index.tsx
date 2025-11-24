import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowUpDown, Filter, Search, ArrowUp, X, Plus } from 'lucide-react';
import Image from 'next/image';
import Layout from '@/components/Layout';
import BottomSearchBar from '@/components/BottomSearchBar';
import CourseDistributionCard from '@/components/CourseDistributionCard';
import { fetchAllYearsData, UNIVERSITIES, formatCourseCode } from '@/lib/api';
import { processGradeData } from '@/lib/utils';
import { CourseStats } from '@/types';
import { loadAllCourses, getMostPopularCoursesRoundRobin } from '@/lib/all-courses';
import { CourseInfo } from '@/lib/courses';
import styles from '@/styles/Home.module.css';

type SortOption = 'most-a' | 'least-a' | 'highest-avg' | 'lowest-avg' | 'most-students' | 'least-students' | 'alphabetical-az' | 'alphabetical-za';

const COURSES_PER_PAGE = 9;

// BasePath constant - matches next.config.js and _document.tsx
// In production (GitHub Pages), this is '/gpa'
const isProduction = process.env.NODE_ENV === 'production';
const BASEPATH = isProduction ? '/gpa' : '';
const INITIAL_COURSES_COUNT = 12; // Show 12 popular courses on initial load

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
  const [displayCount, setDisplayCount] = useState(INITIAL_COURSES_COUNT); // How many courses to show
  const [initialLoadComplete, setInitialLoadComplete] = useState(false); // Track if initial 12 courses are loaded
  const [lastSortBy, setLastSortBy] = useState<SortOption | null>(null); // Track last sort option to detect changes
  const [courseOrder, setCourseOrder] = useState<string[]>([]); // Maintain stable order of courses
  const [searchHint, setSearchHint] = useState<string>(''); // Hint message to show in search field
  const coursesDataRef = useRef<Map<string, CourseStats & { institution: string; courseName: string }>>(new Map());
  const loadingCoursesRef = useRef<Set<string>>(new Set());

  // Sync refs with state - do this early so refs are always up to date
  useEffect(() => {
    coursesDataRef.current = coursesData;
  }, [coursesData]);

  useEffect(() => {
    loadingCoursesRef.current = loadingCourses;
  }, [loadingCourses]);

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
      // Reset display count when institution changes
      setDisplayCount(COURSES_PER_PAGE);
    }
  }, [selectedInstitution]);

  // Sync refs with state
  useEffect(() => {
    coursesDataRef.current = coursesData;
  }, [coursesData]);

  useEffect(() => {
    loadingCoursesRef.current = loadingCourses;
  }, [loadingCourses]);

  // Check if initial load is complete (we have at least 9 courses loaded OR no more courses to load)
  useEffect(() => {
    if (searchQuery.trim() || initialLoadComplete) return;
    
    const filtered = selectedInstitution !== 'all'
      ? allCourses.filter(c => c.institution === selectedInstitution)
      : allCourses;
    
    const coursesWithData = filtered.filter(c => {
      const key = `${c.institution}-${c.code}`;
      return coursesDataRef.current.has(key);
    });
    
    const loadingCount = loadingCoursesRef.current.size;
    
    // Mark as complete if we have enough courses AND nothing is currently loading
    if (coursesWithData.length >= INITIAL_COURSES_COUNT && loadingCount === 0) {
      setInitialLoadComplete(true);
    }
    // Also mark as complete if we've tried loading but got fewer than 9 (some may have failed)
    // This prevents infinite waiting if some courses fail to load
    else if (loadingCount === 0 && coursesWithData.length > 0) {
      // Give it a bit more time before marking complete with fewer courses
      const timer = setTimeout(() => {
        if (coursesWithData.length > 0 && loadingCoursesRef.current.size === 0) {
          setInitialLoadComplete(true);
        }
      }, 2000); // Wait 2 seconds after loading stops
      return () => clearTimeout(timer);
    }
  }, [allCourses, selectedInstitution, searchQuery, initialLoadComplete, coursesData, loadingCourses]);

  // Helper function to load course data
  const loadCoursesData = useCallback((coursesToLoad: CourseInfo[]) => {
    if (coursesToLoad.length === 0) return;

    // Mark as loading
    setLoadingCourses(prev => {
      const next = new Set(prev);
      coursesToLoad.forEach(c => next.add(`${c.institution}-${c.code}`));
      return next;
    });

    // Fetch the courses
    let cancelled = false;
    
    Promise.all(
      coursesToLoad.map(async (course) => {
        try {
          const uniData = UNIVERSITIES[course.institution];
          if (!uniData) return null;
          
          const formattedCode = formatCourseCode(course.code, course.institution);
          const data = await fetchAllYearsData(uniData.code, formattedCode, undefined, course.institution);
          
          if (cancelled || !data || data.length === 0) return null;
          
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
          // Silently skip failed courses - they'll be retried if needed
          console.debug(`Failed to load course ${course.code}:`, error);
          return null;
        }
      })
    ).then(results => {
      if (cancelled) return;
      
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

      // If we got at least some results, update course order and mark progress
      if (validResults.length > 0) {
        setCourseOrder(prev => {
          const newKeys = validResults.map(r => r.key);
          return [...prev, ...newKeys.filter(k => !prev.includes(k))];
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load initial popular courses (12 courses with most candidates, distributed across institutions)
  useEffect(() => {
    if (allCourses.length === 0 || searchQuery.trim() || initialLoadComplete) return;
    
    // If institution filter is 'all', use popular courses in round-robin fashion
    if (selectedInstitution === 'all') {
      // Load most popular courses across all institutions (round-robin)
      getMostPopularCoursesRoundRobin(INITIAL_COURSES_COUNT).then(popularCourses => {
        // Filter out courses that are already loaded or loading
        const toLoad = popularCourses.filter(course => {
          const key = `${course.institution}-${course.code}`;
          return !coursesDataRef.current.has(key) && !loadingCoursesRef.current.has(key);
        });
        
        if (toLoad.length > 0) {
          loadCoursesData(toLoad);
        } else if (popularCourses.length > 0) {
          // All popular courses are already loaded or loading
          setInitialLoadComplete(true);
        }
      }).catch(error => {
        console.warn('Failed to load popular courses, falling back to regular selection:', error);
        // Fall back to regular selection
        const fallbackCourses = allCourses
          .filter(course => {
            const key = `${course.institution}-${course.code}`;
            return !coursesDataRef.current.has(key) && !loadingCoursesRef.current.has(key);
          })
          .slice(0, INITIAL_COURSES_COUNT);
        if (fallbackCourses.length > 0) {
          loadCoursesData(fallbackCourses);
        }
      });
      return; // Exit early - loading popular courses asynchronously
    }
    
    // Institution filter is active - use filtered courses
    const filtered = allCourses.filter(c => c.institution === selectedInstitution);
    const coursesToLoad = filtered
      .filter(course => {
        const key = `${course.institution}-${course.code}`;
        return !coursesDataRef.current.has(key) && !loadingCoursesRef.current.has(key);
      })
      .slice(0, INITIAL_COURSES_COUNT);

    if (coursesToLoad.length === 0) {
      // If no courses to load, check if we have enough loaded
      const filteredWithData = filtered.filter(c => {
        const key = `${c.institution}-${c.code}`;
        return coursesDataRef.current.has(key);
      });
      if (filteredWithData.length >= INITIAL_COURSES_COUNT) {
        setInitialLoadComplete(true);
      }
      return;
    }

    loadCoursesData(coursesToLoad);
  }, [allCourses, selectedInstitution, searchQuery, initialLoadComplete, loadCoursesData]);

  // Reset course order when sort option, institution, or search changes
  useEffect(() => {
    if (sortBy !== lastSortBy || selectedInstitution !== 'all' || searchQuery.trim()) {
      setCourseOrder([]);
      setLastSortBy(sortBy);
    }
  }, [sortBy, selectedInstitution, searchQuery, lastSortBy]);
  
  // Note: We don't clear coursesData when institution filter changes because:
  // 1. The filtering logic already ensures only courses from selected institution are shown
  // 2. Clearing would lose data if user switches back to "all"
  // 3. The safety check in filteredAndSortedCourses ensures institution matches

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

    // Get courses with loaded data, ensuring institution matches filter
    const coursesWithData = filtered
      .map(course => {
        const key = `${course.institution}-${course.code}`;
        const data = coursesData.get(key);
        // Double-check that the data's institution matches the selected institution filter
        if (data && (selectedInstitution === 'all' || data.institution === selectedInstitution)) {
          return data;
        }
        return null;
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
          case 'alphabetical-az':
            return a.courseCode.localeCompare(b.courseCode, 'no', { sensitivity: 'base' });
          case 'alphabetical-za':
            return b.courseCode.localeCompare(a.courseCode, 'no', { sensitivity: 'base' });
          default:
            return 0;
        }
      });
      
      return [...orderedCourses, ...unorderedCourses];
    }

    // Final safety check: filter out any courses that don't match the institution filter
    // This ensures we never show courses from the wrong institution, even if data was loaded incorrectly
    const finalCourses = coursesWithData.filter(course => {
      if (selectedInstitution === 'all') return true;
      return course.institution === selectedInstitution;
    });
    
    // Sort using loaded data only (when order should be reset)
    finalCourses.sort((a, b) => {
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
        case 'alphabetical-az':
          return a.courseCode.localeCompare(b.courseCode, 'no', { sensitivity: 'base' });
        case 'alphabetical-za':
          return b.courseCode.localeCompare(a.courseCode, 'no', { sensitivity: 'base' });
        default:
          return 0;
      }
    });
    
    return finalCourses;
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
    
    // Show hint in search field if no search query but filters are being applied
    const newSearchQuery = searchInput.trim();
    if (!newSearchQuery) {
      const institutionName = pendingInstitution !== 'all' 
        ? UNIVERSITIES[pendingInstitution]?.shortName || pendingInstitution
        : '';
      if (institutionName || pendingSortBy !== 'most-a') {
        setSearchHint('Legg til emnekode eller navn for å søke');
      } else {
        setSearchHint('Legg til emnekode eller navn');
      }
      // Clear hint after 3 seconds or when user starts typing
      setTimeout(() => setSearchHint(''), 3000);
    } else {
      setSearchHint('');
    }
    
    // Apply pending filters and sort
    setSortBy(pendingSortBy);
    setSelectedInstitution(pendingInstitution);
    
    // Apply search query from input
    setSearchQuery(newSearchQuery);
    
    // Reset display to initial state - start fresh
    setDisplayCount(newSearchQuery ? COURSES_PER_PAGE : INITIAL_COURSES_COUNT);
    
    // Reset course order and initial load state to force reload
    setCourseOrder([]);
    
    // If there's a search query, courses will reload via the search effect
    // If no search query and filters changed, reset initial load to reload popular courses
    if (!newSearchQuery) {
      setInitialLoadComplete(false);
    }
    
    // Force re-render by clearing any cached course data that might not match new filters
    // The effects will reload the appropriate courses based on new filters/search
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
    // Don't show "Load More" while still loading initial courses
    if (loading) return false;
    
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
    
    // Check if there are more courses that need data loaded (on initial load or after filtering)
    const filtered = selectedInstitution !== 'all'
      ? allCourses.filter(c => c.institution === selectedInstitution)
      : allCourses;
    
    // Count courses that have data loaded
    const coursesWithData = filtered.filter(c => {
      const key = `${c.institution}-${c.code}`;
      return coursesDataRef.current.has(key);
    });
    
    // On initial load (before initialLoadComplete), show button once we have at least one batch loaded
    // and there are more courses available
    if (!initialLoadComplete) {
      // Wait until we have at least COURSES_PER_PAGE courses loaded before showing button
      // This ensures we don't show the button while still loading the initial batch
      return coursesWithData.length >= COURSES_PER_PAGE && coursesWithData.length < filtered.length;
    }
    
    // After initial load is complete, show button if there are more courses to load
    return coursesWithData.length < filtered.length;
  }, [allCourses, selectedInstitution, searchQuery, displayCount, filteredAndSortedCourses.length, loading, initialLoadComplete]);

  return (
    <Layout title="Hjem" description="Utforsk karakterstatistikk for norske universitetsemner">
      <div className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              <span className={styles.heroLogo}>
                <Image 
                  src={`${BASEPATH}/dist.svg`}
                  alt="Logo" 
                  width={120} 
                  height={68}
                  priority
                  style={{ width: 'auto', height: '4rem' }}
                />
              </span>
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
          <form onSubmit={handleApply} className={styles.controls}>
            <div className={styles.controlGroup}>
              <label htmlFor="search" className={styles.controlLabel} title="Søk">
                <Search size={16} />
              </label>
              <div className={styles.searchInputWrapper}>
                <input
                  id="search"
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    // Clear hint when user starts typing
                    if (e.target.value.trim()) {
                      setSearchHint('');
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApply(e as any);
                    }
                  }}
                  placeholder={searchHint || "Søk etter emnekode eller navn..."}
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
                <option value="highest-avg">Høyest snitt</option>
                <option value="most-students">Flest kandidater</option>
                <option value="alphabetical-az">A-Z (emnekode)</option>
                <option value="alphabetical-za">Z-A (emnekode)</option>
                <option value="least-students">Færrest kandidater</option>
                <option value="lowest-avg">Lavest snitt</option>
                <option value="least-a">Færrest A-er</option>
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
                {Object.entries(UNIVERSITIES)
                  .sort(([, a], [, b]) => a.shortName.localeCompare(b.shortName, 'no'))
                  .map(([key, uni]) => (
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
                {loadingCourses.size > 0 && displayedCourses.length === 0 ? (
                  <div className={styles.fetchingIndicator}>
                    <span className={styles.fetchingText}>Henter</span>
                    <span className={styles.fetchingDots}>
                      <span className={styles.dot}>.</span>
                      <span className={styles.dot}>.</span>
                      <span className={styles.dot}>.</span>
                    </span>
                  </div>
                ) : (
                  <div className={styles.resultsInfoContent}>
                    <p className={styles.resultsCount}>
                      Viser {displayedCourses.length} emner
                    </p>
                    {searchQuery.trim() && (
                      <button
                        onClick={handleSearchClear}
                        className={styles.clearSearchButton}
                        aria-label="Clear search"
                        type="button"
                      >
                        Tøm søk
                      </button>
                    )}
                  </div>
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
              <div className={styles.loadMoreContainer}>
                <button 
                  onClick={handleLoadMore} 
                  className={`${styles.loadMoreButtonInline} ${!hasMoreCourses ? styles.loadMoreButtonDimmed : ''}`}
                  disabled={loadingCourses.size > 0 || !hasMoreCourses}
                  aria-label="Last flere emner"
                >
                  {loadingCourses.size > 0 ? 'Laster...' : !hasMoreCourses ? 'Alle emner lastet' : 'Last inn flere'}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}

