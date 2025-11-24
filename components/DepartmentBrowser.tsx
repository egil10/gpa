import React, { useState, useEffect } from 'react';
import { Building2, GraduationCap, BookOpen, Loader2 } from 'lucide-react';
import { UNIVERSITIES } from '@/lib/api';
import { getFacultiesForInstitution, getDepartmentsForFaculty, Department } from '@/lib/faculties';
import { fetchDepartmentCourses, fetchAllInstitutionCourses } from '@/lib/api';
import { extractCoursesFromDepartmentData, formatCourseCodeForDisplay } from '@/lib/department-utils';
import styles from './DepartmentBrowser.module.css';

interface DepartmentBrowserProps {
  institutionCode: string;
  onCourseSelect?: (courseCode: string) => void;
}

export default function DepartmentBrowser({ institutionCode, onCourseSelect }: DepartmentBrowserProps) {
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Array<{
    courseCode: string;
    years: number[];
    totalStudents: number;
  }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAllCourses, setShowAllCourses] = useState(false);

  const institution = Object.values(UNIVERSITIES).find(u => u.code === institutionCode);
  const faculties = getFacultiesForInstitution(institutionCode);
  const departments = selectedFaculty 
    ? getDepartmentsForFaculty(institutionCode, selectedFaculty)
    : [];

  useEffect(() => {
    setSelectedDepartment('');
    setCourses([]);
  }, [selectedFaculty]);

  const handleDepartmentSelect = async (deptCode: string) => {
    setSelectedDepartment(deptCode);
    setShowAllCourses(false);
    setLoading(true);
    setError(null);
    setCourses([]);

    try {
      // Fetch all courses from this department
      const data = await fetchDepartmentCourses(institutionCode, deptCode);
      
      if (!data || data.length === 0) {
        setError('Ingen kurs funnet for dette instituttet');
        return;
      }

      const extractedCourses = extractCoursesFromDepartmentData(data);
      setCourses(extractedCourses);
    } catch (err) {
      setError(
        err instanceof Error 
          ? err.message 
          : 'Kunne ikke hente kursliste'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFetchAllCourses = async () => {
    setShowAllCourses(true);
    setSelectedDepartment('');
    setLoading(true);
    setError(null);
    setCourses([]);

    try {
      // Fetch ALL courses from the entire institution
      const data = await fetchAllInstitutionCourses(institutionCode);
      
      if (!data || data.length === 0) {
        setError('Ingen kurs funnet for denne institusjonen');
        return;
      }

      const extractedCourses = extractCoursesFromDepartmentData(data);
      setCourses(extractedCourses);
    } catch (err) {
      setError(
        err instanceof Error 
          ? err.message 
          : 'Kunne ikke hente alle kurs'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = (courseCode: string) => {
    if (onCourseSelect) {
      onCourseSelect(formatCourseCodeForDisplay(courseCode));
    }
  };

  if (!institution) {
    return (
      <div className={styles.container}>
        <p className={styles.error}>Ukjent institusjon</p>
      </div>
    );
  }

  const institutionDisplayName = `${institution.name}${institution.shortName ? ` (${institution.shortName})` : ''}`;
  const institutionButtonLabel = institution.shortName
    ? `${institution.shortName} – ${institution.name}`
    : institutionDisplayName;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>
          <Building2 size={20} />
          Utforsk emner etter fakultet/institutt
        </h3>
        <p className={styles.subtitle}>
          {faculties.length > 0 
            ? 'Velg et fakultet og institutt for å se alle tilgjengelige emner'
            : `Utforsk alle emner fra ${institutionDisplayName}`
          }
        </p>
      </div>

      <div className={styles.selector}>
        {faculties.length > 0 ? (
          <>
            <div className={styles.selectGroup}>
              <label htmlFor="faculty-select">
                <GraduationCap size={16} />
                Fakultet
              </label>
              <select
                id="faculty-select"
                value={selectedFaculty}
                onChange={(e) => {
                  setSelectedFaculty(e.target.value);
                  setShowAllCourses(false);
                }}
                className={styles.select}
              >
                <option value="">Velg fakultet...</option>
                {faculties.map(faculty => (
                  <option key={faculty.code} value={faculty.code}>
                    {faculty.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedFaculty && departments.length > 0 && (
              <div className={styles.selectGroup}>
                <label htmlFor="department-select">
                  <BookOpen size={16} />
                  Institutt
                </label>
                <select
                  id="department-select"
                  value={selectedDepartment}
                  onChange={(e) => handleDepartmentSelect(e.target.value)}
                  className={styles.select}
                >
                  <option value="">Velg institutt...</option>
                  {departments.map(dept => (
                    <option key={dept.code} value={dept.code}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className={styles.selectGroup}>
              <label>Eller</label>
              <button
                type="button"
                onClick={handleFetchAllCourses}
                disabled={loading}
                className={`${styles.fetchAllButton} ${showAllCourses ? styles.active : ''}`}
              >
                {showAllCourses ? '✓' : '🔍'} Hent alle kurs fra {institutionButtonLabel}
              </button>
            </div>
          </>
        ) : (
          <div className={styles.selectGroup}>
            <label>
              <Building2 size={16} />
              Hent alle emner
            </label>
            <button
              type="button"
              onClick={handleFetchAllCourses}
              disabled={loading}
              className={`${styles.fetchAllButton} ${styles.fullWidth} ${showAllCourses ? styles.active : ''}`}
            >
              {showAllCourses ? '✓' : '🔍'} Hent alle kurs fra {institutionDisplayName}
            </button>
            <p className={styles.info}>
              Ingen fakulteter/institutter er konfigurert ennå. Du kan hente alle emner direkte.
            </p>
          </div>
        )}
      </div>

      {loading && (
        <div className={styles.loading}>
          <Loader2 size={24} className={styles.spinner} />
          <p>Laster kurs...</p>
        </div>
      )}

      {error && (
        <div className={styles.errorBox}>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && courses.length > 0 && (
        <div className={styles.coursesList}>
          <h4>{courses.length} kurs funnet</h4>
          <div className={styles.coursesGrid}>
            {courses.map((course) => (
              <button
                key={course.courseCode}
                onClick={() => handleCourseClick(course.courseCode)}
                className={styles.courseCard}
              >
                <div className={styles.courseCode}>
                  {formatCourseCodeForDisplay(course.courseCode)}
                </div>
                <div className={styles.courseMeta}>
                  <span>{course.years.length} år</span>
                  <span>•</span>
                  <span>{course.years[0]} (nyeste)</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

