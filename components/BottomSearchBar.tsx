import React, { useState, useRef, useEffect, useCallback, FormEvent } from 'react';
import { Search, X, ArrowUp } from 'lucide-react';
import { useRouter } from 'next/router';
import { CourseInfo } from '@/lib/courses';
import { searchAllCourses, getCourseByCode, getPopularCourses, preloadInstitutionCourses, stripCourseCodeSuffix } from '@/lib/all-courses';
import { UNIVERSITIES } from '@/lib/api';
import { formatCourseCode } from '@/lib/api';
import styles from './BottomSearchBar.module.css';

export default function BottomSearchBar() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CourseInfo[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedCourse, setSelectedCourse] = useState<CourseInfo | null>(null);
  const [searchBarOpacity, setSearchBarOpacity] = useState(1);
  const router = useRouter();
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Preload courses on mount
  useEffect(() => {
    preloadInstitutionCourses('UiO');
    preloadInstitutionCourses('NTNU');
    preloadInstitutionCourses('UiB');
    preloadInstitutionCourses('NHH');
  }, []);

  // Fade search bar near footer
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollBottom = documentHeight - (scrollY + windowHeight);
      
      // Fade out search bar when within 200px of footer
      const footerFadeDistance = 200;
      if (scrollBottom < footerFadeDistance) {
        // Fade out as we approach footer
        const opacity = Math.max(0, scrollBottom / footerFadeDistance);
        setSearchBarOpacity(opacity);
      } else {
        setSearchBarOpacity(1);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Search with debouncing
  const performSearch = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (searchQuery.trim().length === 0) {
        // Don't show suggestions when input is empty
        setSuggestions([]);
        setShowSuggestions(false);
      } else {
        try {
          const results = await searchAllCourses(searchQuery, undefined, 10);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        } catch (error) {
          console.error('Search error:', error);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }
      setSelectedIndex(-1);
    }, 200);
  }, []);

  // Check if query matches a course
  useEffect(() => {
    if (query.trim()) {
      getCourseByCode(query.trim(), undefined).then(course => {
        setSelectedCourse(course);
      });
      // Only perform search when there's a query
      performSearch(query);
    } else {
      setSelectedCourse(null);
      // Hide suggestions when query is empty
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [query, performSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setQuery(newValue);
  };

  const handleSelectCourse = (course: CourseInfo) => {
    // Navigate directly to course charts (use code without suffix in URL)
    router.push(`/sok?code=${encodeURIComponent(course.code)}&uni=${course.institution}`);
    setQuery('');
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef.current?.blur();
  };

  const handleSuggestionClick = (course: CourseInfo) => {
    // Just fill in the input, don't navigate yet
    setQuery(course.code);
    setSelectedCourse(course);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (selectedCourse) {
      // If we have a selected course, navigate to it
      handleSelectCourse(selectedCourse);
    } else if (query.trim()) {
      // Strip suffix from query before searching/navigating
      const cleanQuery = stripCourseCodeSuffix(query.trim());
      getCourseByCode(cleanQuery, undefined).then(course => {
        if (course) {
          handleSelectCourse(course);
        } else {
          // Navigate to search page with query (without suffix)
          router.push(`/sok?code=${encodeURIComponent(cleanQuery)}`);
          setQuery('');
          setShowSuggestions(false);
        }
      });
    }
  };

  const handleClear = () => {
    setQuery('');
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        // On Enter, actually submit/navigate
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          const course = suggestions[selectedIndex];
          setQuery(course.code);
          setSelectedCourse(course);
          setShowSuggestions(false);
          // Navigate to the selected course
          handleSelectCourse(course);
        } else if (selectedCourse) {
          handleSelectCourse(selectedCourse);
        } else if (query.trim()) {
          // Submit the form with current query
          const form = inputRef.current?.closest('form');
          if (form) {
            form.requestSubmit();
          }
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleFocus = () => {
    // Only show suggestions if there's a query
    if (query.trim().length > 0 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay to allow click events on suggestions
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
      }
    }, 200);
  };


  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedIndex + (query.trim().length === 0 ? 1 : 0)] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, query]);

  return (
    <>
      <div 
        className={styles.searchBarContainer}
        style={{ opacity: searchBarOpacity, pointerEvents: searchBarOpacity > 0.3 ? 'auto' : 'none' }}
      >
        <div className={styles.backdrop}></div>
        <div className={styles.searchBar}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputWrapper}>
              <div className={styles.inputContainer}>
                <div className={styles.searchIcon}>
                  <Search size={18} />
                </div>
                <div className={styles.inputContent}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder="Søk etter emnekode eller navn..."
                    className={styles.input}
                    autoComplete="off"
                  />
                </div>
                <div className={styles.actions}>
                  {query && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className={styles.clearButton}
                      aria-label="Clear"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <button
                    type="submit"
                    className={styles.submitButton}
                    aria-label="Search"
                    disabled={!query.trim() && !selectedCourse}
                  >
                    <ArrowUp size={18} />
                  </button>
                </div>
              </div>
              
              {showSuggestions && suggestions.length > 0 && searchBarOpacity > 0.3 && (
                <div ref={suggestionsRef} className={styles.suggestions}>
                  {query.trim().length === 0 && (
                    <div className={styles.suggestionsHeader}>
                      <span>Populære emner</span>
                    </div>
                  )}
                  {suggestions.map((course, index) => (
                    <button
                      key={`${course.code}-${course.institution}`}
                      type="button"
                      className={`${styles.suggestionItem} ${
                        index === selectedIndex ? styles.selected : ''
                      }`}
                      onClick={() => handleSuggestionClick(course)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className={styles.suggestionContent}>
                        <div className={styles.suggestionCode}>{course.code}</div>
                        <div className={styles.suggestionName}>{course.name}</div>
                      </div>
                      <div className={styles.suggestionInstitution}>
                        {UNIVERSITIES[course.institution]?.shortName || course.institution}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
