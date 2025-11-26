import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, X } from 'lucide-react';
import { searchVGSCourses, getAllVGSCoursesList, VGSCourse } from '@/lib/vgs-courses';
import styles from './CourseNameAutocomplete.module.css';

interface VGSCourseAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onCourseSelect?: (course: VGSCourse | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function VGSCourseAutocomplete({
  value,
  onChange,
  onCourseSelect,
  placeholder = 'Søk etter fag...',
  disabled = false,
}: VGSCourseAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<VGSCourse[]>([]);
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

  // Get popular courses for empty query
  const getPopularCourses = useCallback(async () => {
    try {
      const allCourses = await getAllVGSCoursesList();
      // Return courses with most years (most data available)
      const sorted = [...allCourses].sort((a, b) => {
        const aYears = a.years?.length || 0;
        const bYears = b.years?.length || 0;
        return bYears - aYears;
      });
      return sorted.slice(0, 6);
    } catch (error) {
      console.error('Error loading popular VGS courses:', error);
      return [];
    }
  }, []);

  // Search with debouncing
  const performSearch = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (searchQuery.trim().length === 0) {
        const popular = await getPopularCourses();
        setSuggestions(popular.slice(0, 3));
        setShowSuggestions(popular.length > 0);
      } else {
        try {
          const results = await searchVGSCourses(searchQuery);
          setSuggestions(results.slice(0, 3));
          setShowSuggestions(results.length > 0);
        } catch (error) {
          console.error('Error searching VGS courses:', error);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }
      setSelectedIndex(-1);
    }, 200);
  }, [getPopularCourses]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange(newValue);
    performSearch(newValue);
  };

  const handleSelectCourse = (course: VGSCourse) => {
    // Use course code if available, otherwise use name
    const displayValue = course.code ? `${course.code} - ${course.name}` : course.name;
    setQuery(displayValue);
    onChange(displayValue);
    setShowSuggestions(false);
    if (onCourseSelect) {
      onCourseSelect(course);
    }
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    setShowSuggestions(false);
    if (onCourseSelect) {
      onCourseSelect(null);
    }
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
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectCourse(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleFocus = async () => {
    if (query.trim().length === 0) {
      const popular = await getPopularCourses();
      setSuggestions(popular);
      setShowSuggestions(popular.length > 0);
    } else {
      performSearch(query);
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

  const getCategoryLabel = (category: VGSCourse['category']) => {
    if (!category) return '';
    
    const labels: Record<NonNullable<VGSCourse['category']>, string> = {
      'fellesfag': 'Fellesfag',
      'realfag': 'Realfag',
      'språk-samfunnsfag-økonomi': 'Språk, samfunnsfag og økonomi',
      'idrettsfag': 'Idrettsfag',
      'kunst-design-arkitektur': 'Kunst, design og arkitektur',
      'medier-kommunikasjon': 'Medier og kommunikasjon',
      'musikk-dans-drama': 'Musikk, dans og drama',
      'dans': 'Dans',
      'drama': 'Drama',
      'musikk': 'Musikk',
      'andre-programfag': 'Andre programfag',
    };
    return labels[category] || category;
  };

  return (
    <div className={styles.autocomplete}>
      <div className={styles.inputWrapper}>
        <BookOpen size={18} className={styles.icon} />
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
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className={styles.clearButton}
            aria-label="Fjern"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div ref={suggestionsRef} className={styles.suggestions}>
          {suggestions.map((course, index) => (
            <button
              key={`${course.name}-${index}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur
                handleSelectCourse(course);
              }}
              onClick={(e) => {
                e.preventDefault(); // Extra safety
                handleSelectCourse(course);
              }}
              className={`${styles.suggestionItem} ${
                index === selectedIndex ? styles.selected : ''
              }`}
            >
              <div className={styles.suggestionContent}>
                <span className={styles.courseName}>
                  {course.code && <span className={styles.courseCode}>{course.code}</span>}
                  {course.code && ' - '}
                  {course.name}
                </span>
                <span className={styles.courseCategory}>
                  {course.category && getCategoryLabel(course.category)}
                  {course.years && course.years.length > 0 && ` • ${course.years.length} år`}
                  {course.level && ` • ${course.level}`}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

