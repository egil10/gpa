import React, { useState, useRef, useEffect, useCallback, FormEvent } from 'react';
import { Search, X, ArrowUp } from 'lucide-react';
import { useRouter } from 'next/router';
import { CourseInfo } from '@/lib/courses';
import { searchAllCourses, getCourseByCode, preloadInstitutionCourses, stripCourseCodeSuffix, getAvailableInstitutions } from '@/lib/all-courses';
import { UNIVERSITIES, formatInstitutionLabel } from '@/lib/api';
import { formatCourseCode } from '@/lib/api';
import { isCourseUnavailable } from '@/lib/course-availability';
import styles from './BottomSearchBar.module.css';

interface BottomSearchBarProps {
  variant?: 'floating' | 'inline';
  className?: string;
  initialPlaceholderCode?: string;
  variantType?: 'search' | 'discover';
}

export default function BottomSearchBar({
  variant = 'floating',
  className = '',
  initialPlaceholderCode,
  variantType = 'search',
}: BottomSearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CourseInfo[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedCourse, setSelectedCourse] = useState<CourseInfo | null>(null);
  const [searchBarOpacity, setSearchBarOpacity] = useState(1);
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);
  const uppercasePlaceholderCode = initialPlaceholderCode?.toUpperCase();
  const initialPlaceholder = uppercasePlaceholderCode
    ? `Prøv å søke etter ${uppercasePlaceholderCode}...`
    : 'Prøv å søke etter en emnekode...';
  const [placeholderBase, setPlaceholderBase] = useState(initialPlaceholder);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState(initialPlaceholder);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [animationCycle, setAnimationCycle] = useState(0);
  const [typingComplete, setTypingComplete] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const CURSOR_CHAR = '|';
  const router = useRouter();

  const isFloating = variant === 'floating';
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Preload courses from all institutions on mount (for better search performance)
  useEffect(() => {
    // Preload major institutions first (for immediate autocomplete)
    preloadInstitutionCourses('UiO');
    preloadInstitutionCourses('NTNU');
    preloadInstitutionCourses('UiB');
    preloadInstitutionCourses('NHH');
    
    // Preload remaining institutions in background (don't block)
    setTimeout(() => {
      const allInstitutions = getAvailableInstitutions();
      allInstitutions.forEach((inst: string) => {
        if (!['UiO', 'NTNU', 'UiB', 'NHH'].includes(inst)) {
          preloadInstitutionCourses(inst);
        }
      });
    }, 1000); // Delay to not block initial load
  }, []);

  useEffect(() => {
    if (uppercasePlaceholderCode) {
      setPlaceholderBase(`Prøv å søke etter ${uppercasePlaceholderCode}...`);
    }
  }, [uppercasePlaceholderCode]);

  useEffect(() => {
    let typingTimeout: NodeJS.Timeout | null = null;
    let restartTimeout: NodeJS.Timeout | null = null;
    const target = placeholderBase;
    let idx = 0;

    const animate = () => {
      idx += 1;
      setAnimatedPlaceholder(target.slice(0, idx));
      if (idx < target.length) {
        typingTimeout = setTimeout(animate, 80);
      } else {
        setTypingComplete(true);
        restartTimeout = setTimeout(() => {
          setAnimationCycle((cycle) => cycle + 1);
        }, 60000);
      }
    };

    setTypingComplete(false);
    setAnimatedPlaceholder('');
    animate();

    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
      if (restartTimeout) clearTimeout(restartTimeout);
    };
  }, [placeholderBase, animationCycle]);

  useEffect(() => {
    if (!typingComplete) {
      setCursorVisible(true);
      return;
    }

    const interval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 600);

    return () => clearInterval(interval);
  }, [typingComplete]);

  // Fade search bar near footer
  useEffect(() => {
    if (!isFloating) {
      setSearchBarOpacity(1);
      return;
    }

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
  }, [isFloating]);

  // Search with debouncing
  const performSearch = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (searchQuery.trim().length === 0) {
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedCourse(null);
      } else {
        try {
          // Limit to 3 suggestions
          const results = await searchAllCourses(searchQuery, undefined, 3);
          const filteredResults = results.filter(
            course => !isCourseUnavailable(course.code, course.institution)
          );
          setSuggestions(filteredResults.slice(0, 3));
          setShowSuggestions(filteredResults.length > 0);
          
          // Check if query matches a course (only if we have results)
          if (results.length > 0) {
            getCourseByCode(searchQuery.trim(), undefined).then(course => {
              setSelectedCourse(course);
            }).catch(() => {
              setSelectedCourse(null);
            });
          } else {
            setSelectedCourse(null);
          }
        } catch (error) {
          console.error('Search error:', error);
          setSuggestions([]);
          setShowSuggestions(false);
          setSelectedCourse(null);
        }
      }
      setSelectedIndex(-1);
    }, 300); // Increased debounce to 300ms to reduce lag
  }, []);

  // Perform search when query changes (debounced)
  useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setQuery(newValue);
    // Clear not found message when user types
    if (notFoundMessage) {
      setNotFoundMessage(null);
    }
  };

  const handleSelectCourse = (course: CourseInfo) => {
    // Navigate directly to course charts (use code without suffix in URL)
    setNotFoundMessage(null);
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
    setNotFoundMessage(null);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (selectedCourse) {
      // If we have a selected course, navigate to it
      setNotFoundMessage(null);
      handleSelectCourse(selectedCourse);
    } else if (query.trim()) {
      // Strip suffix from query before searching/navigating
      const cleanQuery = stripCourseCodeSuffix(query.trim());
      const matchingSuggestion =
        suggestions.find(course => course.code.toUpperCase() === cleanQuery.toUpperCase()) ||
        (suggestions.length > 0 && suggestions[0]);

      if (matchingSuggestion) {
        setNotFoundMessage(null);
        handleSelectCourse(matchingSuggestion);
        return;
      }

      getCourseByCode(cleanQuery, undefined).then(course => {
        if (course) {
          setNotFoundMessage(null);
          handleSelectCourse(course);
        } else {
          // Show not found message instead of navigating
          setNotFoundMessage(`Emnekode "${cleanQuery}" ikke funnet`);
          setShowSuggestions(false);
          
          // Clear message after 3 seconds
          setTimeout(() => {
            setNotFoundMessage(null);
          }, 3000);
        }
      }).catch(() => {
        // Show error message
        setNotFoundMessage(`Kunne ikke søke etter "${cleanQuery}"`);
        setShowSuggestions(false);
        
        // Clear message after 3 sekunder
        setTimeout(() => {
          setNotFoundMessage(null);
        }, 3000);
      });
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setNotFoundMessage(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        if (showSuggestions && suggestions.length > 0) {
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        if (showSuggestions && suggestions.length > 0) {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        }
        break;
      case 'Enter':
        e.preventDefault();
        // On Enter, actually submit/navigate
        if (showSuggestions && selectedIndex >= 0 && selectedIndex < suggestions.length) {
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
          handleSubmit(e);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleFocus = () => {
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

  const handleInputFocus = () => {
    setIsFocused(true);
    handleFocus();
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    setIsFocused(false);
    handleBlur(e);
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
        className={`${styles.searchBarContainer} ${isFloating ? '' : styles.inlineVariant} ${className}`.trim()}
        style={isFloating ? { opacity: searchBarOpacity, pointerEvents: searchBarOpacity > 0.3 ? 'auto' : 'none' } : undefined}
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
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder={
                      query || isFocused
                        ? ''
                        : `${animatedPlaceholder || placeholderBase}${typingComplete && cursorVisible ? CURSOR_CHAR : ''}`
                    }
                    className={styles.input}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck="false"
                    enterKeyHint="search"
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
              
              {/* Not found message */}
              {notFoundMessage && (
                <div className={styles.notFoundMessage}>
                  {notFoundMessage}
                </div>
              )}
              
              {showSuggestions && suggestions.length > 0 && searchBarOpacity > 0.3 && (
                <div ref={suggestionsRef} className={styles.suggestions}>
                  {query.trim().length === 0 && (
                    <div className={styles.suggestionsHeader}>
                      <span>Flest kandidater akkurat nå</span>
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
                        {course.name && course.name !== course.code && (
                          <div className={styles.suggestionName}>{course.name}</div>
                        )}
                      </div>
                      <div className={styles.suggestionInstitution}>
                        {formatInstitutionLabel(course.institution, 'short-full')}
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
