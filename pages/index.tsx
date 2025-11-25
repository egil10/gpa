import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowUpDown, Filter, Search, ArrowUp, X, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import BottomSearchBar from '@/components/BottomSearchBar';
import CourseDistributionCard from '@/components/CourseDistributionCard';
import { fetchAllYearsData, UNIVERSITIES, formatCourseCode, formatInstitutionLabel } from '@/lib/api';
import { processGradeData } from '@/lib/utils';
import { CourseStats } from '@/types';
import { loadAllCourses, getMostPopularCoursesRoundRobin } from '@/lib/all-courses';
import { CourseInfo } from '@/lib/courses';
import { loadHomepageTopCourses, HomepageTopDataset } from '@/lib/homepage-data';
import { loadHomepageGradeData, HomepageGradeDataPayload } from '@/lib/homepage-grade-data';
import { loadHardcoded28Data, Hardcoded28Payload } from '@/lib/hardcoded-28-data';
import styles from '@/styles/Home.module.css';

type SortOption = 'most-a' | 'least-a' | 'highest-avg' | 'lowest-avg' | 'most-students' | 'least-students' | 'alphabetical-az' | 'alphabetical-za';

const COURSES_PER_PAGE = 9;

// BasePath helper - get basePath from router or detect at runtime
// IMPORTANT: On Vercel, basePath should ALWAYS be empty
// This function explicitly returns empty string on Vercel to prevent /gpa prefix
function getBasePath(routerBasePath?: string): string {
  // Runtime detection (client-side): ALWAYS check hostname first to override router basePath
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Explicitly check for Vercel domains FIRST - force empty basePath
    // This overrides router.basePath which might be incorrectly set
    if (hostname.includes('.vercel.app') || hostname.includes('vercel.com')) {
      console.log('[getBasePath] Vercel detected - forcing empty basePath, ignoring router.basePath:', routerBasePath);
      return ''; // Force empty on Vercel, ignore router.basePath completely
    }
    // Check for GitHub Pages
    if (hostname.includes('github.io') || hostname.includes('github.com')) {
      return '/gpa';
    }
  }
  
  // Server-side: check environment variables (for SSR)
  if (typeof process !== 'undefined') {
    const isVercel = !!process.env.VERCEL;
    if (isVercel) {
      return ''; // Force empty on Vercel
    }
    
    const isProduction = process.env.NODE_ENV === 'production';
    const isGitHubPages = isProduction && !isVercel;
    return isGitHubPages ? '/gpa' : '';
  }
  
  // Fallback: use router basePath (should only be used if runtime detection fails)
  // But we've already checked runtime above, so this is just a safety net
  if (routerBasePath !== undefined && typeof window !== 'undefined') {
    // Final check: if we're on Vercel, ignore router basePath
    const hostname = window.location.hostname;
    if (hostname.includes('.vercel.app') || hostname.includes('vercel.com')) {
      return ''; // Force empty on Vercel, ignore router basePath
    }
    return routerBasePath;
  }
  
  return '';
}
const INITIAL_COURSES_COUNT = 12; // Show 12 courses on initial load (one per institution, loaded in increments of 12)
const COURSES_PER_INCREMENT = 12; // Load courses in increments of 12 (12, 12, 12 = 36 total)
const TOTAL_INSTITUTIONS = 36; // Total institutions (36 = one chart per institution)

export default function Home() {
  const router = useRouter();
  const [allCourses, setAllCourses] = useState<CourseInfo[]>([]);
  const [topDataset, setTopDataset] = useState<HomepageTopDataset | null>(null);
  const [preRenderedData, setPreRenderedData] = useState<HomepageGradeDataPayload | null>(null);
  const [hardcoded28Data, setHardcoded28Data] = useState<Hardcoded28Payload | null>(null);
  const [coursesData, setCoursesData] = useState<Map<string, CourseStats & { institution: string; courseName: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState<Set<string>>(new Set());
  const [loadingDots, setLoadingDots] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('most-students');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('all');
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pendingSortBy, setPendingSortBy] = useState<SortOption>('most-students');
  const [pendingInstitution, setPendingInstitution] = useState<string>('all');
  const [displayCount, setDisplayCount] = useState(INITIAL_COURSES_COUNT); // How many courses to show
  const [initialLoadComplete, setInitialLoadComplete] = useState(false); // Track if initial 12 courses are loaded
  const [lastSortBy, setLastSortBy] = useState<SortOption | null>(null); // Track last sort option to detect changes
  const [courseOrder, setCourseOrder] = useState<string[]>([]); // Maintain stable order of courses
  const [searchHint, setSearchHint] = useState<string>(''); // Hint message to show in search field
  const [heroPlaceholderCode, setHeroPlaceholderCode] = useState<string | null>(null);
  const coursesDataRef = useRef<Map<string, CourseStats & { institution: string; courseName: string }>>(new Map());
  const loadingCoursesRef = useRef<Set<string>>(new Set());
  const topInitialDisplaySet = useRef(false);
  const topInstitutionCourses = useMemo(() => {
    if (!topDataset) return [];
    const seen = new Set<string>();
    const list: CourseInfo[] = [];
    for (const entry of topDataset.courses) {
      if (seen.has(entry.institution)) {
        continue;
      }
      seen.add(entry.institution);
      list.push({
        code: entry.courseCode,
        name: entry.courseName,
        institution: entry.institution,
        institutionCode: entry.institutionCode,
      });
    }
    return list;
  }, [topDataset]);

  const isTopDefaultView = useMemo(
    () =>
      selectedInstitution === 'all' &&
      !searchQuery.trim() &&
      topInstitutionCourses.length > 0,
    [selectedInstitution, searchQuery, topInstitutionCourses.length]
  );

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

  useEffect(() => {
    let cancelled = false;
    loadHomepageTopCourses()
      .then((data) => {
        if (!data || cancelled) return;

        setTopDataset(data);
        const hintCodes = (
          data.topCourseCodes && data.topCourseCodes.length > 0
            ? data.topCourseCodes
            : data.courses.map((course) => course.courseCode)
        );
        if (hintCodes.length > 0) {
          setHeroPlaceholderCode(hintCodes[Math.floor(Math.random() * hintCodes.length)]);
        }
      })
      .catch((error) => {
        console.warn('Top course dataset unavailable:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load hardcoded 28-course data FIRST for instant display (no API calls needed)
  useEffect(() => {
    let cancelled = false;
    loadHardcoded28Data()
      .then((data) => {
        if (!data || cancelled) return;

        setHardcoded28Data(data);
        // Populate coursesData immediately with hardcoded data for instant display
        const dataMap = new Map<string, CourseStats & { institution: string; courseName: string }>();
        data.courses.forEach((course) => {
          const key = `${course.institution}-${course.normalizedCode}`;
          dataMap.set(key, {
            ...course,
            courseCode: course.normalizedCode,
          });
        });
        setCoursesData(dataMap);
        // Mark as complete immediately - we have instant data!
        setInitialLoadComplete(true);
        // Show first 12 courses initially (increment of 12)
        setDisplayCount(INITIAL_COURSES_COUNT);
        console.log(`[HardcodedCourses] Loaded ${data.courses.length} courses instantly (1 per institution)`);
      })
      .catch((error) => {
        console.warn('Hardcoded 28-course data unavailable:', error);
        // Fallback to regular pre-rendered data
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load pre-rendered grade data as fallback (if hardcoded 28 not available)
  useEffect(() => {
    // Only load if hardcoded 28 data is not available
    if (hardcoded28Data) return;
    
    let cancelled = false;
    loadHomepageGradeData()
      .then((data) => {
        if (!data || cancelled) return;

        setPreRenderedData(data);
        // Only populate if we don't already have hardcoded data
        if (!hardcoded28Data) {
          const dataMap = new Map<string, CourseStats & { institution: string; courseName: string }>();
          data.courses.forEach((course) => {
            // Normalize course code: remove API formatting suffixes for key matching
            // API returns codes like "TDT4110-1" (most unis) or "BØK1101" (BI)
            // Course lists use base codes like "TDT4110" or "BØK110"
            // For all institutions, consistently remove "-1" suffix only
            let normalizedCode = course.courseCode.replace(/-[0-9]+$/, '').trim();
            // For BI courses, remove trailing "1" (format: COURSECODE1 -> COURSECODE)
            if (course.institution === 'BI' && normalizedCode.endsWith('1') && normalizedCode.length > 4) {
              normalizedCode = normalizedCode.slice(0, -1);
            }
            const key = `${course.institution}-${normalizedCode}`;
            // Store with normalized course code to match course list format
            dataMap.set(key, {
              ...course,
              courseCode: normalizedCode,
            });
          });
          setCoursesData(dataMap);
          // Mark as complete immediately
          setInitialLoadComplete(true);
          setDisplayCount(Math.min(data.courses.length, INITIAL_COURSES_COUNT));
        }
      })
      .catch((error) => {
        console.warn('Pre-rendered grade data unavailable:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [hardcoded28Data]);

  // Reset initial load when institution changes
  useEffect(() => {
    if (allCourses.length > 0) {
      setInitialLoadComplete(false);
      // Reset display count when institution changes
      setDisplayCount(COURSES_PER_PAGE);
    }
  }, [selectedInstitution]);

  useEffect(() => {
    if (selectedInstitution !== 'all' || searchQuery.trim()) {
      topInitialDisplaySet.current = false;
      return;
    }

    if (topInstitutionCourses.length === 0) {
      topInitialDisplaySet.current = false;
      return;
    }

    if (!topInitialDisplaySet.current) {
      const desired = Math.min(INITIAL_COURSES_COUNT, topInstitutionCourses.length);
      setDisplayCount(desired);
      topInitialDisplaySet.current = true;
    }
  }, [selectedInstitution, searchQuery, topInstitutionCourses.length]);

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
  // Skip API calls on GitHub Pages
  const loadCoursesData = useCallback((coursesToLoad: CourseInfo[]) => {
    if (coursesToLoad.length === 0) return;
    
    // Check if we're on GitHub Pages (skip API calls)
    const isGitHubPages = typeof window !== 'undefined' && 
      (window.location.hostname.includes('github.io') || window.location.hostname.includes('github.com'));
    
    // Skip API calls on GitHub Pages (they will fail due to CORS)
    if (isGitHubPages) {
      return;
    }
    
    // Filter out courses that already have data
    const coursesToFetch = coursesToLoad.filter(course => {
      const key = `${course.institution}-${course.code}`;
      return !coursesDataRef.current.has(key) && !loadingCoursesRef.current.has(key);
    });
    
    if (coursesToFetch.length === 0) return;

    // Mark as loading
    setLoadingCourses(prev => {
      const next = new Set(prev);
      coursesToFetch.forEach(c => next.add(`${c.institution}-${c.code}`));
      return next;
    });

    // Fetch the courses
    let cancelled = false;
    
    Promise.all(
      coursesToFetch.map(async (course) => {
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
        coursesToFetch.forEach(c => next.delete(`${c.institution}-${c.code}`));
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
  // Skip API calls on GitHub Pages
  useEffect(() => {
    // Check if we're on GitHub Pages (skip API calls)
    const isGitHubPages = typeof window !== 'undefined' && 
      (window.location.hostname.includes('github.io') || window.location.hostname.includes('github.com'));
    if (allCourses.length === 0 || searchQuery.trim() || initialLoadComplete) return;
    // Skip API calls on GitHub Pages (they will fail anyway)
    if (isGitHubPages) {
      setInitialLoadComplete(true);
      return;
    }
    
    // If institution filter is 'all', use popular courses in round-robin fashion
    // Load data for all top courses, even if pre-rendered data exists (some institutions might be missing)
    if (selectedInstitution === 'all') {
      if (topInstitutionCourses.length > 0) {
        // Load data for ALL top institution courses that don't have data yet
        const toLoad = topInstitutionCourses
          .filter(course => {
            const key = `${course.institution}-${course.code}`;
            return !coursesDataRef.current.has(key) && !loadingCoursesRef.current.has(key);
          });

        if (toLoad.length > 0) {
          // Load in batches to avoid overwhelming the API
          // Load in increments of 12 (same as display increments)
          const batchSize = COURSES_PER_INCREMENT; // Load 12 at a time
          const batches = [];
          for (let i = 0; i < toLoad.length; i += batchSize) {
            batches.push(toLoad.slice(i, i + batchSize));
          }
          
          // Load first batch immediately (initial 12 courses)
          if (batches.length > 0) {
            loadCoursesData(batches[0]);
          }
          
          // Load remaining batches with delays (next 12, then final 12)
          batches.slice(1).forEach((batch, idx) => {
            setTimeout(() => {
              loadCoursesData(batch);
            }, (idx + 1) * 2000); // 2 second delay between batches
          });
        } else {
          setInitialLoadComplete(true);
        }
      } else {
        getMostPopularCoursesRoundRobin(INITIAL_COURSES_COUNT).then(popularCourses => {
          const toLoad = popularCourses.filter(course => {
            const key = `${course.institution}-${course.code}`;
            return !coursesDataRef.current.has(key) && !loadingCoursesRef.current.has(key);
          });
          
          if (toLoad.length > 0) {
            loadCoursesData(toLoad);
          } else if (popularCourses.length > 0) {
            setInitialLoadComplete(true);
          }
        }).catch(error => {
          console.warn('Failed to load popular courses, falling back to regular selection:', error);
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
      }
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
  }, [allCourses, selectedInstitution, searchQuery, initialLoadComplete, loadCoursesData, topInstitutionCourses, preRenderedData]);
  useEffect(() => {
    if (loadingCourses.size === 0) {
      setLoadingDots('');
      return;
    }
    const phases = ['.', '..', '...'];
    let idx = 0;
    const interval = setInterval(() => {
      setLoadingDots(phases[idx]);
      idx = (idx + 1) % phases.length;
    }, 400);
    return () => clearInterval(interval);
  }, [loadingCourses.size]);

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
    // In default view (all institutions, no search), prioritize hardcoded 28 courses
    if (isTopDefaultView) {
      // If we have hardcoded 28-course data, use it exclusively (instant, no API calls needed)
      if (hardcoded28Data && hardcoded28Data.courses.length > 0) {
        // Use ALL hardcoded courses directly - they're already loaded and ready to display
        const coursesWithData = hardcoded28Data.courses
          .map(course => {
            // Create a CourseStats-compatible object directly from hardcoded data
            // No need to look up in coursesData - use the hardcoded data directly
            return {
              ...course,
              courseCode: course.normalizedCode,
            };
          });
        
        // Sort by selected sort option
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
            case 'alphabetical-az':
              return a.courseCode.localeCompare(b.courseCode, 'no', { sensitivity: 'base' });
            case 'alphabetical-za':
              return b.courseCode.localeCompare(a.courseCode, 'no', { sensitivity: 'base' });
            default:
              return 0;
          }
        });
        
        return coursesWithData;
      }
      
      // Fallback: use topInstitutionCourses (one per institution)
      if (topInstitutionCourses.length > 0) {
        const coursesWithData = topInstitutionCourses
          .map(course => {
            const key = `${course.institution}-${course.code}`;
            const data = coursesData.get(key);
            if (data && data.institution === course.institution) {
              return data;
            }
            return null;
          })
          .filter((item): item is CourseStats & { institution: string; courseName: string } => item !== null);
        
        // Sort by selected sort option
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
            case 'alphabetical-az':
              return a.courseCode.localeCompare(b.courseCode, 'no', { sensitivity: 'base' });
            case 'alphabetical-za':
              return b.courseCode.localeCompare(a.courseCode, 'no', { sensitivity: 'base' });
            default:
              return 0;
          }
        });
        
        return coursesWithData;
      }
    }
    
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
      const institutionStartsWith: typeof filtered = [];
      const institutionContains: typeof filtered = [];
      
      filtered.forEach(c => {
        const codeUpper = c.code.toUpperCase();
        const nameUpper = c.name ? c.name.toUpperCase() : '';
        const institutionNameUpper = UNIVERSITIES[c.institution]?.name?.toUpperCase() || '';
        const institutionShortUpper = UNIVERSITIES[c.institution]?.shortName?.toUpperCase() || '';
        
        if (codeUpper === query) {
          // Exact code match - highest priority
          codeStartsWith.unshift(c);
        } else if (codeUpper.startsWith(query)) {
          // Code starts with query - valid prefix match
          codeStartsWith.push(c);
        } else if (nameUpper.startsWith(query)) {
          nameStartsWith.push(c);
        } else if (nameUpper.includes(query)) {
          nameContains.push(c);
        } else if (
          (institutionShortUpper && institutionShortUpper.startsWith(query)) ||
          (institutionNameUpper && institutionNameUpper.startsWith(query))
        ) {
          institutionStartsWith.push(c);
        } else if (
          (institutionShortUpper && institutionShortUpper.includes(query)) ||
          (institutionNameUpper && institutionNameUpper.includes(query))
        ) {
          institutionContains.push(c);
        }
      });
      
      // Combine with priority order
      // Removed codeContains to prevent false matches like "INF100" matching "INF1000"
      filtered = [
        ...codeStartsWith,
        ...nameStartsWith,
        ...nameContains,
        ...institutionStartsWith,
        ...institutionContains,
      ];
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
        // Normalize course code for key matching (same logic as pre-rendered data)
        // For all institutions, consistently remove "-1" suffix only
        let normalizedCode = course.courseCode.replace(/-1$/, '').trim();
        // For BI courses, remove trailing "1" (format: COURSECODE1 -> COURSECODE)
        if (course.institution === 'BI' && normalizedCode.endsWith('1') && normalizedCode.length > 4) {
          normalizedCode = normalizedCode.slice(0, -1);
        }
        const key = `${course.institution}-${normalizedCode}`;
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
  }, [allCourses, coursesData, sortBy, selectedInstitution, searchQuery, courseOrder, lastSortBy, isTopDefaultView, topInstitutionCourses]);

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
    // Check if we're on GitHub Pages (skip API calls)
    const isGitHubPages = typeof window !== 'undefined' && 
      (window.location.hostname.includes('github.io') || window.location.hostname.includes('github.com'));
    
    const isTopDefaultView =
      selectedInstitution === 'all' &&
      !searchQuery.trim() &&
      topInstitutionCourses.length > 0;

    if (isTopDefaultView) {
      // If we have hardcoded courses data, show them in increments of 12
      if (hardcoded28Data && hardcoded28Data.courses.length > 0) {
        // All hardcoded courses are already loaded, so just show them in increments
        if (displayCount < hardcoded28Data.courses.length) {
          // Load next increment of 12 courses
          setDisplayCount(prev => Math.min(prev + COURSES_PER_INCREMENT, hardcoded28Data.courses.length));
          return;
        }
        return;
      }
      
      // Fallback: First, check if we have more courses with data that we can show
      const coursesWithData = topInstitutionCourses.filter(course => {
        const key = `${course.institution}-${course.code}`;
        return coursesDataRef.current.has(key);
      });
      
      if (displayCount < coursesWithData.length) {
        // Show more courses that already have data (in increments of 12)
        setDisplayCount(prev => Math.min(prev + COURSES_PER_INCREMENT, coursesWithData.length));
        return;
      }
      
      // If no more courses with data, try to load data for courses without data
      const coursesToLoad = topInstitutionCourses
        .filter(course => {
          const key = `${course.institution}-${course.code}`;
          return !coursesDataRef.current.has(key) && !loadingCoursesRef.current.has(key);
        })
        .slice(0, COURSES_PER_INCREMENT); // Load 12 at a time
      
      if (coursesToLoad.length > 0) {
        loadCoursesData(coursesToLoad);
        // Increase display count to show courses once data is loaded (in increments of 12)
        setDisplayCount(prev => prev + COURSES_PER_INCREMENT);
      }
      return;
    }

    // First, check if we have more courses already loaded that we can show
    if (!isTopDefaultView && displayCount < filteredAndSortedCourses.length) {
      // Just increment display count to show more already-loaded courses
      setDisplayCount(prev => prev + COURSES_PER_PAGE);
      return;
    }
    
    // Skip API calls on GitHub Pages (they will fail due to CORS)
    if (isGitHubPages) {
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
  }, [
    allCourses,
    selectedInstitution,
    displayCount,
    filteredAndSortedCourses.length,
    searchQuery,
    loadCoursesData,
    isTopDefaultView,
    topInstitutionCourses.length,
    hardcoded28Data,
    HARDCODED_28_TOTAL,
  ]);

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
    
    // Check if we're on GitHub Pages (skip API calls)
    const isGitHubPages = typeof window !== 'undefined' && 
      (window.location.hostname.includes('github.io') || window.location.hostname.includes('github.com'));
    
    // Skip API calls on GitHub Pages (they will fail due to CORS)
    if (isGitHubPages) {
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
        ? formatInstitutionLabel(pendingInstitution, 'full-short')
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

  const handleResetFilters = useCallback(() => {
    const emptyCoursesMap = new Map<string, CourseStats & { institution: string; courseName: string }>();
    const emptyLoadingSet = new Set<string>();

    coursesDataRef.current = emptyCoursesMap;
    loadingCoursesRef.current = emptyLoadingSet;

    setCoursesData(emptyCoursesMap);
    setLoadingCourses(emptyLoadingSet);
    setSearchInput('');
    setSearchQuery('');
    setSearchHint('');
    setPendingSortBy('most-students');
    setSortBy('most-students');
    setPendingInstitution('all');
    setSelectedInstitution('all');
    setDisplayCount(INITIAL_COURSES_COUNT);
    setInitialLoadComplete(false);
    setCourseOrder([]);
    setLastSortBy(null);
  }, []);

useEffect(() => {
  if (!router.isReady) return;
  if (router.query.reset === '1') {
    handleResetFilters();
    router.replace(router.pathname, undefined, { shallow: true });
  }
}, [router, handleResetFilters]);

  const handleSearchClear = () => {
    setSearchInput('');
    setSearchQuery('');
    setDisplayCount(COURSES_PER_PAGE);
  };

  const resetDisabled = useMemo(() => {
    const searchActive = searchInput.trim().length > 0 || searchQuery.trim().length > 0;
    const sortChanged = pendingSortBy !== 'most-a' || sortBy !== 'most-a';
    const institutionChanged = pendingInstitution !== 'all' || selectedInstitution !== 'all';
    return !searchActive && !sortChanged && !institutionChanged;
  }, [searchInput, searchQuery, pendingSortBy, sortBy, pendingInstitution, selectedInstitution]);

  // Limit displayed courses to displayCount (always limit to 9 at a time)
  const displayedCourses = useMemo(() => {
    return filteredAndSortedCourses.slice(0, displayCount);
  }, [filteredAndSortedCourses, displayCount]);

  // Check if there are more courses to load or display
  const hasMoreCourses = useMemo(() => {
    // Don't show "Load More" while still loading initial courses
    if (loading) return false;

    if (isTopDefaultView) {
      // If we have hardcoded course data, check if we have more than current display count
      if (hardcoded28Data && hardcoded28Data.courses.length > 0) {
        // Show "Load more" if we're showing less than all hardcoded courses
        return displayCount < hardcoded28Data.courses.length;
      }
      
      // Fallback: Check if we have more courses to display (either with data or that need loading)
      // First check if we have more courses with data than we're displaying
      const coursesWithData = topInstitutionCourses.filter(course => {
        const key = `${course.institution}-${course.code}`;
        return coursesDataRef.current.has(key);
      });
      if (displayCount < coursesWithData.length) {
        return true;
      }
      // Also check if there are courses without data that we could load
      const coursesWithoutData = topInstitutionCourses.filter(course => {
        const key = `${course.institution}-${course.code}`;
        return !coursesDataRef.current.has(key) && !loadingCoursesRef.current.has(key);
      });
      return coursesWithoutData.length > 0;
    }
    
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
  }, [
    allCourses,
    selectedInstitution,
    searchQuery,
    displayCount,
    filteredAndSortedCourses.length,
    loading,
    initialLoadComplete,
    isTopDefaultView,
    topInstitutionCourses.length,
    hardcoded28Data,
  ]);

  return (
    <Layout title="Hjem" description="Utforsk karakterstatistikk for norske universitetsemner">
      <div className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              <span 
                className={styles.heroLogo} 
                aria-hidden="true"
                style={{
                  // Use absolute path - Next.js will handle basePath automatically based on next.config.js
                  // On Vercel: basePath is empty, so this becomes /dist.svg
                  // On GitHub Pages: basePath is /gpa, so Next.js rewrites this to /gpa/dist.svg
                  backgroundImage: `url('/dist.svg')`
                }}
              />
              <span className={styles.heroTitleText}>Karakterfordeling</span>
            </h1>
            <BottomSearchBar initialPlaceholderCode={heroPlaceholderCode || undefined} />
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
                    const newValue = e.target.value.toUpperCase();
                    setSearchInput(newValue);
                    // Clear hint when user starts typing
                    if (newValue.trim()) {
                      setSearchHint('');
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApply(e as any);
                    }
                  }}
                  placeholder={searchHint || 'Emnekode'}
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
                <option value="most-students">Flest kandidater</option>
                <option value="most-a">Mest A-er</option>
                <option value="highest-avg">Høyest snitt</option>
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
                  .sort(([, a], [, b]) => a.name.localeCompare(b.name, 'no'))
                  .map(([key, uni]) => (
                    <option key={key} value={key}>
                      {formatInstitutionLabel(key, 'full-short')}
                    </option>
                  ))}
              </select>
            </div>
            <div className={`${styles.controlGroup} ${styles.controlsActions}`}>
              <button
                type="submit"
                className={styles.applyButton}
                aria-label="Apply filters"
              >
                <ArrowUp size={16} />
                <span>Bruk</span>
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className={styles.resetButton}
                aria-label="Tilbakestill til start"
                disabled={resetDisabled}
              >
                <RotateCcw size={16} />
                <span>Tilbakestill</span>
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
                  data-loading-dots={loadingCourses.size > 0 ? loadingDots : ''}
                >
                  {loadingCourses.size > 0 ? 'Laster' : !hasMoreCourses ? 'Alle emner lastet' : 'Last inn flere'}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}

