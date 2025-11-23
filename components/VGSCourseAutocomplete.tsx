import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, X } from 'lucide-react';
import { searchVGSCourses, VGSCourse } from '@/lib/vgs-courses';
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
  const getPopularCourses = useCallback(() => {
    return [
      { name: 'Matematikk 1T (teoretisk)', category: 'fellesfag' as const },
      { name: 'Norsk', category: 'fellesfag' as const },
      { name: 'Engelsk', category: 'fellesfag' as const },
      { name: 'Naturfag', category: 'fellesfag' as const },
      { name: 'Matematikk R1', category: 'realfag' as const },
      { name: 'Fysikk', category: 'realfag' as const },
      { name: 'Kjemi', category: 'realfag' as const },
    ].slice(0, 6);
  }, []);

  // Search with debouncing
  const performSearch = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (searchQuery.trim().length === 0) {
        const popular = getPopularCourses();
        setSuggestions(popular);
        setShowSuggestions(popular.length > 0);
      } else {
        const results = searchVGSCourses(searchQuery);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
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
    setQuery(course.name);
    onChange(course.name);
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

  const handleFocus = () => {
    if (query.trim().length === 0) {
      const popular = getPopularCourses();
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
    const labels: Record<VGSCourse['category'], string> = {
      'fellesfag': 'Fellesfag',
      'realfag': 'Realfag',
      'språk-samfunnsfag-økonomi': 'Språk, samfunnsfag og økonomi',
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
              onClick={() => handleSelectCourse(course)}
              className={`${styles.suggestionItem} ${
                index === selectedIndex ? styles.selected : ''
              }`}
            >
              <div className={styles.suggestionContent}>
                <span className={styles.courseName}>{course.name}</span>
                <span className={styles.courseCategory}>
                  {getCategoryLabel(course.category)}
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

