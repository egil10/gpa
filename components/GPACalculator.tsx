import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { BookOpen, X, RotateCw } from 'lucide-react';
import { Course, GradeSystem, calculateGPA, UNIVERSITY_GRADES, HIGHSCHOOL_GRADES, GRADE_VALUES } from '@/types/gpa';
import CourseNameAutocomplete from './CourseNameAutocomplete';
import VGSCourseAutocomplete from './VGSCourseAutocomplete';
import { CourseInfo } from '@/lib/courses';
import { VGSCourse } from '@/lib/vgs-courses';
import styles from './GPACalculator.module.css';

interface GPACalculatorProps {
  initialSystem?: GradeSystem;
}

// Example courses to pre-populate
const EXAMPLE_COURSES: Course[] = [
  { id: '1', name: 'Algoritmer og datastrukturer', grade: 'B', credits: 7.5, system: 'university' },
  { id: '2', name: 'Objektorientert programmering', grade: 'A', credits: 7.5, system: 'university' },
  { id: '3', name: 'Databaser', grade: 'C', credits: 7.5, system: 'university' },
  { id: '4', name: 'Kalkulus', grade: 'B', credits: 7.5, system: 'university' },
  { id: '5', name: 'Sannsynlighetsregning', grade: 'C', credits: 7.5, system: 'university' },
];

export default function GPACalculator({ initialSystem = 'university' }: GPACalculatorProps) {
  const [system, setSystem] = useState<GradeSystem>(initialSystem);
  const [bonusPoints, setBonusPoints] = useState({ realfag: 0, other: 0 }); // High school bonus points
  const [courses, setCourses] = useState<Course[]>([]);
  const [hasCalculated, setHasCalculated] = useState(false);
  
  // Pre-populate with examples on first client-side load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeenExamples = localStorage.getItem('gpa-has-seen-examples');
      if (!hasSeenExamples && courses.length === 0) {
        localStorage.setItem('gpa-has-seen-examples', 'true');
        setCourses(EXAMPLE_COURSES.map(c => ({ ...c, system: initialSystem })));
      }
    }
  }, [initialSystem, courses.length]);

  const handleSystemChange = useCallback((newSystem: GradeSystem) => {
    setSystem(newSystem);
    // Reset bonus points when switching systems
    if (newSystem === 'university') {
      setBonusPoints({ realfag: 0, other: 0 });
    }
    // Update all courses to new system with default values
    setCourses((prev) =>
      prev.map((course) => ({
        ...course,
        system: newSystem,
        grade: newSystem === 'university' ? 'C' : '4',
        credits: newSystem === 'university' ? 7.5 : 1,
      }))
    );
  }, []);

  const totalBonusPoints = useMemo(() => {
    if (system === 'highschool') {
      return Math.min(bonusPoints.realfag + bonusPoints.other, 4); // Max 4 total
    }
    return 0;
  }, [system, bonusPoints]);

  const calculation = useMemo(() => {
    if (!hasCalculated) {
      return {
        gpa: 0,
        gpaWithBonus: undefined,
        totalCredits: 0,
        weightedSum: 0,
      };
    }
    return calculateGPA(courses, totalBonusPoints);
  }, [courses, totalBonusPoints, hasCalculated]);

  const handleCalculate = () => {
    if (courses.length === 0) return;
    setHasCalculated(true);
  };

  const handleReset = () => {
    setHasCalculated(false);
  };

  const handleHardReset = () => {
    // Clear all courses
    setCourses([]);
    // Reset calculation state
    setHasCalculated(false);
    // Reset bonus points
    setBonusPoints({ realfag: 0, other: 0 });
    // Reset system to initial
    setSystem(initialSystem);
    // Clear localStorage flag so examples can be shown again if needed
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gpa-has-seen-examples');
    }
  };

  const addCourse = useCallback(() => {
    setHasCalculated(false); // Reset calculation when adding course
    const newCourse: Course = {
      id: Date.now().toString(),
      name: '',
      grade: system === 'university' ? 'C' : '4',
      credits: system === 'university' ? 7.5 : 1,
      system,
    };
    setCourses((prev) => [...prev, newCourse]);
  }, [system]);

  const removeCourse = useCallback((id: string) => {
    setHasCalculated(false); // Reset calculation when removing course
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateCourse = useCallback((id: string, field: keyof Course, value: string | number) => {
    setHasCalculated(false); // Reset calculation when updating course
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }, []);

  const handleCourseNameSelect = useCallback((courseId: string, courseInfo: CourseInfo | null) => {
    if (courseInfo) {
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId
            ? {
                ...c,
                name: courseInfo.code.toUpperCase(),
                credits: c.credits || (system === 'university' ? 7.5 : 1),
              }
            : c
        )
      );
    }
  }, [system]);

  const adjustCredits = useCallback(
    (courseId: string, direction: 'up' | 'down', courseSystem: GradeSystem) => {
      const step = courseSystem === 'university' ? 0.5 : 1;
      setHasCalculated(false);
      setCourses((prev) =>
        prev.map((course) => {
          if (course.id !== courseId) return course;
          const current = Number.isFinite(course.credits) ? course.credits : 0;
          const delta = direction === 'up' ? step : -step;
          const nextValue = Math.max(0, parseFloat((current + delta).toFixed(2)));
          return { ...course, credits: nextValue };
        })
      );
    },
    []
  );

  const handleVGSCourseSelect = useCallback((courseId: string, vgsCourse: VGSCourse | null) => {
    if (vgsCourse) {
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId
            ? {
                ...c,
                name: vgsCourse.name,
                credits: c.credits || 1, // Default 1 credit for VGS courses
              }
            : c
        )
      );
    }
  }, []);

  const adjustGrade = useCallback((id: string, direction: 'up' | 'down') => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const grades: readonly string[] = c.system === 'university' ? UNIVERSITY_GRADES : HIGHSCHOOL_GRADES;
        const currentIndex = grades.indexOf(c.grade);
        if (currentIndex === -1) return c;
        
        let newIndex = currentIndex;
        if (direction === 'up' && currentIndex > 0) {
          newIndex = currentIndex - 1;
        } else if (direction === 'down' && currentIndex < grades.length - 1) {
          newIndex = currentIndex + 1;
        }
        
        return { ...c, grade: grades[newIndex] };
      })
    );
  }, []);

  const availableGrades = system === 'university' ? UNIVERSITY_GRADES : HIGHSCHOOL_GRADES;

  // Calculate grade distribution
  const gradeDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    availableGrades.forEach(grade => {
      distribution[grade] = 0;
    });
    courses.forEach(course => {
      if (distribution.hasOwnProperty(course.grade)) {
        distribution[course.grade]++;
      }
    });
    return distribution;
  }, [courses, availableGrades]);

  return (
    <div className={styles.calculator}>
      <div className={styles.header}>
        <h2 className={styles.title}>GPA Kalkulator</h2>
        <div className={styles.controls}>
          <div className={styles.systemSelector}>
            <button
              className={`${styles.systemButton} ${system === 'university' ? styles.active : ''}`}
              onClick={() => handleSystemChange('university')}
            >
              Universitet (A-F)
            </button>
            <button
              className={`${styles.systemButton} ${system === 'highschool' ? styles.active : ''}`}
              onClick={() => handleSystemChange('highschool')}
            >
              Videregående (1-6)
            </button>
          </div>
          <button
            onClick={handleHardReset}
            className={styles.hardResetButton}
            aria-label="Tilbakestill alt"
            title="Tilbakestill alt og start på nytt"
          >
            <RotateCw size={18} />
            <span>Nullstill alt</span>
          </button>
        </div>
      </div>

      <div className={styles.gpaDisplay}>
        {!hasCalculated ? (
          <div className={styles.calculatePrompt}>
            <p>Legg til emner og klikk "Beregn GPA" for å se resultatet.</p>
            <button
              onClick={handleCalculate}
              disabled={courses.length === 0}
              className={styles.calculateButton}
            >
              Beregn GPA
            </button>
          </div>
        ) : (
          <>
            <div className={styles.gpaValue}>
              <span className={styles.gpaLabel}>GPA</span>
              <div className={styles.gpaNumber}>
                {calculation.gpaWithBonus !== undefined 
                  ? calculation.gpaWithBonus.toFixed(2) 
                  : calculation.gpa.toFixed(2)}
                {calculation.gpaWithBonus !== undefined && calculation.gpaWithBonus !== calculation.gpa && (
                  <span className={styles.gpaBonus}>
                    (inkl. {totalBonusPoints} tilleggspoeng)
                  </span>
                )}
              </div>
            </div>
            <div className={styles.gpaDetails}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Antall emner</span>
                <span className={styles.detailValue}>{courses.length}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>
                  {system === 'university' ? 'Totale ECTS' : 'Totale poeng'}
                </span>
                <span className={styles.detailValue}>{calculation.totalCredits}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Vektet sum</span>
                <span className={styles.detailValue}>{calculation.weightedSum.toFixed(1)}</span>
              </div>
              {calculation.gpaWithBonus !== undefined && (
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>GPA uten tilleggspoeng</span>
                  <span className={styles.detailValue}>{calculation.gpa.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className={styles.gradeDistribution}>
              <div className={styles.gradeDistributionHeader}>
                <span className={styles.gradeDistributionLabel}>Karakterfordeling</span>
              </div>
              <div className={styles.gradeDistributionTable}>
                {availableGrades.map(grade => (
                  <div key={grade} className={styles.gradeDistributionCell}>
                    <span className={styles.gradeDistributionGrade}>{grade}</span>
                    <span className={styles.gradeDistributionCount}>
                      {gradeDistribution[grade] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.calculateActions}>
              <button
                onClick={handleReset}
                className={styles.resetButton}
              >
                Tilbakestill
              </button>
            </div>
          </>
        )}
      </div>

      {system === 'highschool' && (
        <div className={styles.bonusPointsSection}>
          <h3 className={styles.sectionTitle}>Tilleggspoeng</h3>
          <p className={styles.bonusPointsInfo}>
            Du kan få maksimalt 4 tilleggspoeng totalt (2 for realfag + 2 for andre fag).
            Hvert poeng gir +0.1 til GPA.
          </p>
          <div className={styles.bonusPointsGrid}>
            <div className={styles.bonusPointsField}>
              <label htmlFor="realfag-bonus">Realfag (maks 2)</label>
              <div className={styles.bonusPointsControls}>
                <button
                  type="button"
                  onClick={() => {
                    setHasCalculated(false);
                    setBonusPoints(prev => ({
                      ...prev,
                      realfag: Math.max(0, prev.realfag - 0.5)
                    }));
                  }}
                  className={styles.bonusButton}
                  disabled={bonusPoints.realfag === 0}
                >
                  −
                </button>
                <input
                  id="realfag-bonus"
                  type="number"
                  min="0"
                  max="2"
                  step="0.5"
                  value={bonusPoints.realfag}
                  onChange={(e) => {
                    setHasCalculated(false);
                    const value = Math.min(2, Math.max(0, parseFloat(e.target.value) || 0));
                    const maxOther = 4 - value;
                    setBonusPoints(prev => ({
                      realfag: value,
                      other: Math.min(prev.other, maxOther)
                    }));
                  }}
                  className={styles.bonusInput}
                />
                <button
                  type="button"
                  onClick={() => {
                    setHasCalculated(false);
                    const maxRealfag = Math.min(2, 4 - bonusPoints.other);
                    setBonusPoints(prev => ({
                      ...prev,
                      realfag: Math.min(maxRealfag, prev.realfag + 0.5)
                    }));
                  }}
                  className={styles.bonusButton}
                  disabled={bonusPoints.realfag >= 2 || totalBonusPoints >= 4}
                >
                  +
                </button>
              </div>
            </div>
            <div className={styles.bonusPointsField}>
              <label htmlFor="other-bonus">Andre fag (maks 2)</label>
              <div className={styles.bonusPointsControls}>
                <button
                  type="button"
                  onClick={() => {
                    setHasCalculated(false);
                    setBonusPoints(prev => ({
                      ...prev,
                      other: Math.max(0, prev.other - 0.5)
                    }));
                  }}
                  className={styles.bonusButton}
                  disabled={bonusPoints.other === 0}
                >
                  −
                </button>
                <input
                  id="other-bonus"
                  type="number"
                  min="0"
                  max="2"
                  step="0.5"
                  value={bonusPoints.other}
                  onChange={(e) => {
                    setHasCalculated(false);
                    const value = Math.min(2, Math.max(0, parseFloat(e.target.value) || 0));
                    const maxRealfag = 4 - value;
                    setBonusPoints(prev => ({
                      realfag: Math.min(prev.realfag, maxRealfag),
                      other: value
                    }));
                  }}
                  className={styles.bonusInput}
                />
                <button
                  type="button"
                  onClick={() => {
                    setHasCalculated(false);
                    const maxOther = Math.min(2, 4 - bonusPoints.realfag);
                    setBonusPoints(prev => ({
                      ...prev,
                      other: Math.min(maxOther, prev.other + 0.5)
                    }));
                  }}
                  className={styles.bonusButton}
                  disabled={bonusPoints.other >= 2 || totalBonusPoints >= 4}
                >
                  +
                </button>
              </div>
            </div>
          </div>
          <div className={styles.bonusPointsTotal}>
            <span>Totalt tilleggspoeng: <strong>{totalBonusPoints}</strong> (maks 4)</span>
            {totalBonusPoints > 0 && (
              <span className={styles.bonusPointsEffect}>
                Gir +{totalBonusPoints * 0.1} til GPA
              </span>
            )}
          </div>
        </div>
      )}

      <div className={styles.coursesSection}>
        <div className={styles.coursesHeader}>
          <div className={styles.coursesHeaderContent}>
            <h3 className={styles.sectionTitle}>Emner</h3>
            <p className={styles.coursesSubtitle}>
              {courses.length} {courses.length === 1 ? 'emne' : 'emner'} lagt til
            </p>
          </div>
          <button onClick={addCourse} className={styles.addButton}>
            Legg til emne
          </button>
        </div>

        {courses.length === 0 ? (
          <div className={styles.emptyState}>
            <button 
              onClick={() => {
                setHasCalculated(false);
                const examples = EXAMPLE_COURSES.map((c, i) => ({
                  ...c,
                  id: Date.now().toString() + i,
                  system,
                  grade: system === 'university' ? c.grade : '4',
                  credits: system === 'university' ? 7.5 : 1,
                }));
                setCourses(examples);
              }}
              className={styles.loadExamplesButton}
            >
              <BookOpen size={18} />
              <span>Last inn eksempel-emner</span>
            </button>
          </div>
        ) : (
          <div className={styles.coursesList}>
            {courses.map((course, index) => (
              <div key={course.id} className={styles.courseCard}>
                <div className={styles.courseHeader}>
                  <span className={styles.courseNumber}>#{index + 1}</span>
                  <button
                    onClick={() => removeCourse(course.id)}
                    className={styles.removeButton}
                    aria-label="Fjern emne"
                  >
                    ×
                  </button>
                </div>

                <div className={styles.courseFields}>
                  <div className={styles.field}>
                    <label>{system === 'university' ? 'Emnekode' : 'Fagnavn'}</label>
                    {system === 'university' ? (
                      <CourseNameAutocomplete
                        value={course.name}
                        onChange={(name) => updateCourse(course.id, 'name', name)}
                        onCourseSelect={(courseInfo) => handleCourseNameSelect(course.id, courseInfo)}
                        placeholder="Emnekode"
                        disabled={false}
                      />
                    ) : (
                      <VGSCourseAutocomplete
                        value={course.name}
                        onChange={(name) => updateCourse(course.id, 'name', name)}
                        onCourseSelect={(vgsCourse) => handleVGSCourseSelect(course.id, vgsCourse)}
                        placeholder="Søk eller skriv..."
                        disabled={false}
                      />
                    )}
                  </div>

                  <div className={styles.field}>
                    <label>Karakter</label>
                    <div className={styles.gradeControls}>
                      {(() => {
                        const courseGrades: readonly string[] = course.system === 'university' ? UNIVERSITY_GRADES : HIGHSCHOOL_GRADES;
                        const currentIndex = courseGrades.indexOf(course.grade);
                        return (
                          <>
                            <button
                              onClick={() => adjustGrade(course.id, 'up')}
                              className={styles.gradeButton}
                              disabled={currentIndex === 0}
                              aria-label="Øk karakter"
                            >
                              ↑
                            </button>
                            <select
                              value={course.grade}
                              onChange={(e) => updateCourse(course.id, 'grade', e.target.value)}
                              className={styles.gradeSelect}
                            >
                              {courseGrades.map((grade) => (
                                <option key={grade} value={grade}>
                                  {grade} ({GRADE_VALUES[grade]})
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => adjustGrade(course.id, 'down')}
                              className={styles.gradeButton}
                              disabled={currentIndex === courseGrades.length - 1}
                              aria-label="Senk karakter"
                            >
                              ↓
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label>
                      {system === 'university' ? 'ECTS' : 'Poeng'}
                    </label>
                    <div className={styles.creditControls}>
                      <button
                        type="button"
                        className={styles.creditButton}
                        onClick={() => adjustCredits(course.id, 'down', course.system)}
                        aria-label="Reduser ECTS"
                        disabled={(course.credits || 0) <= 0}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={course.credits}
                        onChange={(e) => updateCourse(course.id, 'credits', parseFloat(e.target.value) || 0)}
                        min="0"
                        step={system === 'university' ? '0.5' : '1'}
                        className={styles.creditInput}
                      />
                      <button
                        type="button"
                        className={styles.creditButton}
                        onClick={() => adjustCredits(course.id, 'up', course.system)}
                        aria-label="Øk ECTS"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label style={{ visibility: 'hidden' }}>Poeng</label>
                    <span className={styles.coursePoints}>
                      {GRADE_VALUES[course.grade] * course.credits} poeng
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {courses.length > 0 && (
              <div className={styles.addCourseWrapper}>
                <button
                  onClick={addCourse}
                  className={styles.addCourseButton}
                  aria-label="Legg til nytt emne"
                  title="Legg til nytt emne"
                >
                  +
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

