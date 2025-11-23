import React, { useState, useCallback, useMemo } from 'react';
import { Course, GradeSystem, calculateGPA, UNIVERSITY_GRADES, HIGHSCHOOL_GRADES, GRADE_VALUES } from '@/types/gpa';
import styles from './GPACalculator.module.css';

interface GPACalculatorProps {
  initialSystem?: GradeSystem;
}

export default function GPACalculator({ initialSystem = 'university' }: GPACalculatorProps) {
  const [system, setSystem] = useState<GradeSystem>(initialSystem);
  const [courses, setCourses] = useState<Course[]>([]);

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
          <h3>Emner</h3>
          <button onClick={addCourse} className={styles.addButton}>
            + Legg til emne
          </button>
        </div>

        {courses.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Ingen emner lagt til. Klikk "Legg til emne" for å starte.</p>
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
                    <input
                      type="text"
                      value={course.name}
                      onChange={(e) => updateCourse(course.id, 'name', e.target.value)}
                      placeholder="F.eks. Matematikk 1"
                      className={styles.input}
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

