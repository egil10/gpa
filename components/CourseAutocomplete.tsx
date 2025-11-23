import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CourseInfo, POPULAR_COURSES } from '@/lib/courses';
import { UNIVERSITIES } from '@/lib/api';
import { searchAllCourses, getCourseByCode, getPopularCourses, preloadInstitutionCourses } from '@/lib/all-courses';
import styles from './CourseAutocomplete.module.css';

interface CourseAutocompleteProps {
  value: string;
  onChange: (code: string) => void;
  onCourseSelect?: (course: CourseInfo | null) => void;
  institution?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function CourseAutocomplete({
  value,
  onChange,
  onCourseSelect,
  institution,
  placeholder = 'Søk etter emnekode eller navn...',
  disabled = false,
}: CourseAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<CourseInfo[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedCourse, setSelectedCourse] = useState<CourseInfo | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Update query when value prop changes
  useEffect(() => {
    if (value !== query) {
      setQuery(value);
      getCourseByCode(value, institution).then(course => {
        setSelectedCourse(course);
        if (course && onCourseSelect) {
          onCourseSelect(course);
        }
      });
    }
  }, [value, institution]);

  // Preload institution courses when institution is selected
  useEffect(() => {
    if (institution) {
      preloadInstitutionCourses(institution);
    }
  }, [institution]);

  // Get popular courses for empty query
  const getPopularCoursesList = useCallback(async () => {
    try {
      const popular = await getPopularCourses(institution, 8);
      return popular.length > 0 ? popular : POPULAR_COURSES.filter(c => !institution || c.institution === institution).slice(0, 8);
    } catch {
      // Fallback to hardcoded list
      return POPULAR_COURSES.filter(c => !institution || c.institution === institution).slice(0, 8);
    }
  }, [institution]);

  // Search with debouncing
  const performSearch = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (searchQuery.trim().length === 0) {
        // Show popular courses when input is empty
        const popular = await getPopularCoursesList();
        setSuggestions(popular);
        setShowSuggestions(popular.length > 0);
      } else {
        try {
          const results = await searchAllCourses(searchQuery, institution, 20);
          setSuggestions(results);
          
          // Hide suggestions if query exactly matches a suggestion
          const exactMatch = results.find(
            course => course.code.toUpperCase() === searchQuery.toUpperCase().trim()
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
    const newValue = e.target.value.toUpperCase();
    setQuery(newValue);
    onChange(newValue);
    
    getCourseByCode(newValue, institution).then(course => {
      setSelectedCourse(course);
      
      // If no course found and value is cleared, notify parent
      if (!course && newValue.trim() === '' && onCourseSelect) {
        onCourseSelect(null);
      } else if (onCourseSelect) {
        onCourseSelect(course);
      }
    });

    // Always perform search (shows popular courses when empty)
    performSearch(newValue);
  };

  const handleSelectCourse = (course: CourseInfo) => {
    setQuery(course.code);
    onChange(course.code);
    setSelectedCourse(course);
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
    if (query.trim().length === 0) {
      // Show popular courses when focusing on empty input
      const popular = await getPopularCoursesList();
      setSuggestions(popular);
      setShowSuggestions(popular.length > 0);
    } else if (suggestions.length > 0) {
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
      const selectedElement = suggestionsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  return (
    <div className={styles.autocomplete}>
      <div className={styles.inputWrapper}>
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
        {selectedCourse && (
          <span className={styles.courseName} title={selectedCourse.name}>
            {selectedCourse.name}
          </span>
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
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
              onClick={() => handleSelectCourse(course)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className={styles.suggestionCode}>{course.code}</div>
              {course.name && course.name !== course.code && (
                <div className={styles.suggestionName}>{course.name}</div>
              )}
              <div className={styles.suggestionInstitution}>
                {UNIVERSITIES[course.institution]?.shortName || course.institution}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

