import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CourseInfo, searchCourses, POPULAR_COURSES } from '@/lib/courses';
import { UNIVERSITIES } from '@/lib/api';
import { searchNHHCourses, nhhCourseToCourseInfo } from '@/lib/nhh-courses';
import styles from './CourseNameAutocomplete.module.css';

interface CourseNameAutocompleteProps {
  value: string;
  onChange: (name: string) => void;
  onCourseSelect?: (course: CourseInfo | null) => void;
  institution?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function CourseNameAutocomplete({
  value,
  onChange,
  onCourseSelect,
  institution,
  placeholder = 'Søk etter emnenavn...',
  disabled = false,
}: CourseNameAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<CourseInfo[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Update query when value prop changes
  useEffect(() => {
    if (value !== query) {
      setQuery(value);
    }
  }, [value]);

  // Load NHH courses state
  const [nhhCourses, setNhhCourses] = useState<CourseInfo[]>([]);
  const [nhhCoursesLoaded, setNhhCoursesLoaded] = useState(false);

  // Load NHH courses when NHH is selected
  useEffect(() => {
    if (institution === 'NHH' && !nhhCoursesLoaded) {
      searchNHHCourses('').then(courses => {
        const courseInfos = courses.map(nhhCourseToCourseInfo);
        setNhhCourses(courseInfos);
        setNhhCoursesLoaded(true);
      }).catch(console.error);
    }
  }, [institution, nhhCoursesLoaded]);

  // Get popular courses for empty query
  const getPopularCourses = useCallback(() => {
    if (institution === 'NHH' && nhhCoursesLoaded && nhhCourses.length > 0) {
      return nhhCourses.slice(0, 6);
    }
    if (institution) {
      return POPULAR_COURSES.filter(c => c.institution === institution).slice(0, 6);
    }
    return POPULAR_COURSES.slice(0, 6);
  }, [institution, nhhCourses, nhhCoursesLoaded]);

  // Search with debouncing
  const performSearch = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (searchQuery.trim().length === 0) {
        const popular = getPopularCourses();
        setSuggestions(popular);
        setShowSuggestions(popular.length > 0);
      } else {
        let results: CourseInfo[] = [];
        
        // If NHH is selected, search NHH courses first
        if (institution === 'NHH' && nhhCoursesLoaded) {
          const nhhResults = await searchNHHCourses(searchQuery);
          results = nhhResults.map(nhhCourseToCourseInfo);
        }
        
        // Also search regular courses
        const regularResults = searchCourses(searchQuery, institution);
        
        // Combine and deduplicate (NHH courses take priority)
        const regularFiltered = regularResults.filter(r => 
          !results.some(n => n.code === r.code)
        );
        results = [...results, ...regularFiltered].slice(0, 10);
        
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      }
      setSelectedIndex(-1);
    }, 200);
  }, [institution, getPopularCourses, nhhCoursesLoaded]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange(newValue);
    performSearch(newValue);
  };

  const handleSelectCourse = (course: CourseInfo) => {
    setQuery(course.name);
    onChange(course.name);
    setShowSuggestions(false);
    setSuggestions([]);
    
    if (onCourseSelect) {
      onCourseSelect(course);
    }
    
    inputRef.current?.blur();
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
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectCourse(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleFocus = () => {
    if (query.trim().length === 0) {
      const popular = getPopularCourses();
      setSuggestions(popular);
      setShowSuggestions(popular.length > 0);
    } else if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
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
    <div className={styles.autocomplete}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={styles.input}
        autoComplete="off"
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div ref={suggestionsRef} className={styles.suggestions}>
          {query.trim().length === 0 && (
            <div className={styles.suggestionsHeader}>
              <span>Populære emner{institution ? ` (${UNIVERSITIES[institution]?.shortName})` : ''}</span>
            </div>
          )}
          {suggestions.map((course, index) => {
            // Check if this course name appears multiple times (duplicate)
            const isDuplicate = suggestions.filter(c => 
              c.name.toLowerCase() === course.name.toLowerCase()
            ).length > 1;
            
            return (
              <button
                key={`${course.code}-${course.institution}`}
                type="button"
                className={`${styles.suggestionItem} ${
                  index === selectedIndex ? styles.selected : ''
                } ${isDuplicate ? styles.duplicate : ''}`}
                onClick={() => handleSelectCourse(course)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className={styles.suggestionContent}>
                  <div className={styles.suggestionName}>
                    {course.name}
                    {isDuplicate && (
                      <span className={styles.duplicateBadge}> {course.code}</span>
                    )}
                  </div>
                  <div className={styles.suggestionCode}>{course.code}</div>
                </div>
                <div className={styles.suggestionInstitution}>
                  {UNIVERSITIES[course.institution]?.shortName || course.institution}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

