import React, { useState, useCallback, useMemo } from 'react';
import { BookOpen, X } from 'lucide-react';
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
  const [bonusPoints, setBonusPoints] = useState({ realfag: 0, other: 0 }); // High school bonus points
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

  const calculation = useMemo(() => calculateGPA(courses, totalBonusPoints), [courses, totalBonusPoints]);

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
            <span className={styles.detailLabel}>Totale poeng</span>
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
      </div>

      {system === 'highschool' && (
        <div className={styles.bonusPointsSection}>
          <h3>Tilleggspoeng</h3>
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
                  onClick={() => setBonusPoints(prev => ({
                    ...prev,
                    realfag: Math.max(0, prev.realfag - 0.5)
                  }))}
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
                  onClick={() => setBonusPoints(prev => ({
                    ...prev,
                    other: Math.max(0, prev.other - 0.5)
                  }))}
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
              <BookOpen size={18} />
              <span>Last inn eksempel-emner (5 stk)</span>
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
    </div>
  );
}

