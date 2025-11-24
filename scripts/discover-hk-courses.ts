/**
 * Discover and fetch ALL HK courses
 */

import { getAllCoursesForInstitution, DiscoveredCourse } from '../lib/hierarchy-discovery';
import { createOptimizedExport } from './utils/export-format';
import * as fs from 'fs';
import * as path from 'path';

interface CourseExport {
  courseCode: string;
  courseName?: string;
  years: number[];
  totalStudents: number;
  lastYear: number;
  lastYearStudents: number;
  studentCountByYear: Record<number, number>;
}

async function discoverHKCourses() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     HK All Courses Discovery & Export (Batched)            ║
╚════════════════════════════════════════════════════════════╝
  `);

  const institutionCode = '8253';
  const institutionName = 'HK';
  
  const currentYear = new Date().getFullYear();
  const years: number[] = [];

