import React, { useState, useCallback, useMemo } from 'react';
import { Course, GradeSystem, calculateGPA, UNIVERSITY_GRADES, HIGHSCHOOL_GRADES, GRADE_VALUES } from '@/types/gpa';
import CourseNameAutocomplete from './CourseNameAutocomplete';
import { CourseInfo } from '@/lib/courses';
import { UNIVERSITIES } from '@/lib/api';
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
  const [institution, setInstitution] = useState<string>('');
  const [courses, setCourses] = useState<Course[]>(() => {
    // Pre-populate with examples on first load
    if (typeof window !== 'undefined') {
      const hasSeenExamples = localStorage.getItem('gpa-has-seen-examples');
      if (!hasSeenExamples) {
        localStorage.setItem('gpa-has-seen-examples', 'true');
        return EXAMPLE_COURSES.map(c => ({ ...c, system: initialSystem }));
      }
    }
    return [];
  });

  const handleSystemChange = useCallback((newSystem: GradeSystem) => {
    setSystem(newSystem);
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

  const calculation = useMemo(() => calculateGPA(courses), [courses]);

  const addCourse = useCallback(() => {
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
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateCourse = useCallback((id: string, field: keyof Course, value: string | number) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
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

  return (
    <div className={styles.calculator}>
      <div className={styles.header}>
        <h2>GPA Kalkulator</h2>
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
          {system === 'university' && (
            <div className={styles.institutionSelector}>
              <label htmlFor="gpa-institution">Institusjon (valgfritt)</label>
              <select
                id="gpa-institution"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className={styles.institutionSelect}
              >
                <option value="">Alle institusjoner</option>
                {Object.entries(UNIVERSITIES).map(([key, uni]) => (
                  <option key={key} value={key}>
                    {uni.shortName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className={styles.gpaDisplay}>
        <div className={styles.gpaValue}>
          <span className={styles.gpaLabel}>GPA</span>
          <span className={styles.gpaNumber}>{calculation.gpa.toFixed(2)}</span>
        </div>
        <div className={styles.gpaDetails}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Totale poeng</span>
            <span className={styles.detailValue}>{calculation.totalCredits}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Vektet sum</span>
            <span className={styles.detailValue}>{calculation.weightedSum.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className={styles.coursesSection}>
        <div className={styles.coursesHeader}>
          <div>
            <h3>Emner</h3>
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
            <p>Ingen emner lagt til.</p>
            <button 
              onClick={() => {
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
              📚 Last inn eksempel-emner (5 stk)
            </button>
            <p className={styles.emptyHint}>eller klikk "Legg til emne" for å legge til manuelt</p>
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
                    <label>Emnenavn</label>
                    <CourseNameAutocomplete
                      value={course.name}
                      onChange={(name) => updateCourse(course.id, 'name', name)}
                      onCourseSelect={(courseInfo) => handleCourseNameSelect(course.id, courseInfo)}
                      institution={institution || undefined}
                      placeholder="Søk etter emnenavn eller skriv manuelt..."
                      disabled={false}
                    />
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
                    <input
                      type="number"
                      value={course.credits}
                      onChange={(e) => updateCourse(course.id, 'credits', parseFloat(e.target.value) || 0)}
                      min="0"
                      step={system === 'university' ? '0.5' : '1'}
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.courseStats}>
                  <span className={styles.coursePoints}>
                    {GRADE_VALUES[course.grade] * course.credits} poeng
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

