import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CourseInfo, POPULAR_COURSES } from '@/lib/courses';
import { UNIVERSITIES, formatInstitutionLabel } from '@/lib/api';
import { searchAllCourses, getPopularCourses, preloadInstitutionCourses } from '@/lib/all-courses';
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
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState<CourseInfo[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Update query when value prop changes from parent
  useEffect(() => {
    if (value !== query) {
      setQuery(value || '');
    }
  }, [value]); // Only depend on value, not query to avoid loops

  // Preload institution courses when institution is selected
  useEffect(() => {
    if (institution) {
      preloadInstitutionCourses(institution);
    }
  }, [institution]);

  // Get popular courses for empty query
  const getPopularCoursesList = useCallback(async () => {
    try {
      const popular = await getPopularCourses(institution, 6);
      return popular.length > 0 ? popular : POPULAR_COURSES.filter(c => !institution || c.institution === institution).slice(0, 6);
    } catch {
      // Fallback to hardcoded list
      return POPULAR_COURSES.filter(c => !institution || c.institution === institution).slice(0, 6);
    }
  }, [institution]);

  // Search with debouncing
  const performSearch = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (searchQuery.trim().length === 0) {
        const popular = await getPopularCoursesList();
        setSuggestions(popular);
        setShowSuggestions(popular.length > 0);
      } else {
        try {
          // Search by name - searchAllCourses searches both code and name
          const results = await searchAllCourses(searchQuery, institution, 3);
          setSuggestions(results.slice(0, 3));
          
          // Hide suggestions if query exactly matches a suggestion name
          const exactMatch = results.find(
            course => course.name.toLowerCase() === searchQuery.toLowerCase().trim()
          );
          
          setShowSuggestions(results.length > 0 && !exactMatch);
        } catch (error) {
          console.error('Search error:', error);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }
      setSelectedIndex(-1);
    }, 200);
  }, [institution, getPopularCoursesList]);

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

  const handleFocus = async () => {
    // Always perform search on focus to show suggestions
    if (query.trim().length === 0) {
      const popular = await getPopularCoursesList();
      setSuggestions(popular);
      setShowSuggestions(popular.length > 0);
    } else {
      // Re-run search for existing query to refresh suggestions
      await performSearch(query);
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
              <span>
                Populære emner
                {institution ? ` (${formatInstitutionLabel(institution, 'short-full')})` : ''}
              </span>
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
                  {course.code !== course.name && (
                    <div className={styles.suggestionCode}>{course.code}</div>
                  )}
                </div>
                <div className={styles.suggestionInstitution}>
                  {formatInstitutionLabel(course.institution, 'short-full')}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

