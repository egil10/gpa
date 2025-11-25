import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { CourseInfo, POPULAR_COURSES } from '@/lib/courses';
import { formatInstitutionLabel } from '@/lib/api';
import { searchAllCourses, getPopularCourses, preloadInstitutionCourses, stripCourseCodeSuffix } from '@/lib/all-courses';
import { isCourseUnavailable } from '@/lib/course-availability';
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
  placeholder = 'Emnekode',
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

  const filterUnavailable = useCallback((courses: CourseInfo[]) => {
    return courses.filter(
      (course) => !isCourseUnavailable(course.code, course.institution)
    );
  }, []);

  const getPopularCoursesList = useCallback(async () => {
    try {
      const popular = await getPopularCourses(institution, 6);
      const filteredPopular = filterUnavailable(popular);
      if (filteredPopular.length > 0) {
        return filteredPopular;
      }
    } catch (error) {
      console.warn('Popular course lookup failed, falling back to static list', error);
    }

    return filterUnavailable(
      POPULAR_COURSES.filter((course) => !institution || course.institution === institution)
    ).slice(0, 6);
  }, [institution, filterUnavailable]);

  const performSearch = useCallback(
    (searchQuery: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(async () => {
        const trimmed = searchQuery.trim();
        if (trimmed.length === 0) {
          const popular = await getPopularCoursesList();
          setSuggestions(popular);
          setShowSuggestions(popular.length > 0);
          setSelectedIndex(popular.length > 0 ? 0 : -1);
        } else {
          try {
            const results = await searchAllCourses(trimmed, institution, 5);
            const filtered = filterUnavailable(results).slice(0, 5);
            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
            setSelectedIndex(filtered.length > 0 ? 0 : -1);
          } catch (error) {
            console.error('Search error:', error);
            setSuggestions([]);
            setShowSuggestions(false);
            setSelectedIndex(-1);
          }
        }
      }, 200);
    },
    [institution, getPopularCoursesList, filterUnavailable]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setQuery(newValue);
    onChange(newValue);
    performSearch(newValue);
  };

  const handleSelectCourse = (course: CourseInfo) => {
    // Always use the normalized course code (uppercase, no suffixes)
    const displayValue = stripCourseCodeSuffix(course.code);
    setQuery(displayValue);
    onChange(displayValue);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(-1);

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
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectCourse(suggestions[selectedIndex]);
        } else if (suggestions.length === 1) {
          handleSelectCourse(suggestions[0]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleFocus = () => {
    performSearch(query);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
      }
    }, 150);
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

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
        <span className={styles.icon} aria-hidden="true">
          <Search size={16} />
        </span>
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
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
        />
        {query && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClear}
            aria-label="Tøm felt"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div ref={suggestionsRef} className={styles.suggestions} role="listbox">
          {suggestions.map((course, index) => (
            <button
              key={`${course.code}-${course.institution}`}
              type="button"
              className={`${styles.suggestionItem} ${
                index === selectedIndex ? styles.selected : ''
              }`}
              onMouseEnter={() => setSelectedIndex(index)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelectCourse(course)}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <div className={styles.suggestionMeta}>
                <span className={styles.suggestionCode}>{stripCourseCodeSuffix(course.code)}</span>
                <span className={styles.suggestionInstitution}>
                  {formatInstitutionLabel(course.institution, 'short-full')}
                </span>
              </div>
              <div className={styles.suggestionName}>{course.name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

