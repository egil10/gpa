/**
 * Sample B original course names per institution directly from the DBH API.
 * Useful for inspecting raw naming patterns before normalization.
 *
 * Usage:
 *   tsx scripts/sample-course-names.ts                # default B=10, latest year
 *   tsx scripts/sample-course-names.ts 15 2024        # B=15, year=2024
 *   tsx scripts/sample-course-names.ts --institutions=UiO,NTNU
 */

import { ALL_INSTITUTIONS } from '../lib/institution-registry';
import { getAllCoursesForInstitution, DiscoveredCourse } from '../lib/hierarchy-discovery';
import { normalizeCourseCodeAdvanced } from '../lib/course-code-normalizer';

const DEFAULT_SAMPLE_SIZE = 10;

interface CliOptions {
  sampleSize: number;
  year?: number;
  institutionFilter?: Set<string>;
}

function parseCliArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    sampleSize: DEFAULT_SAMPLE_SIZE,
  };

  args.forEach((arg, index) => {
    if (arg.startsWith('--count=')) {
      options.sampleSize = Math.max(1, parseInt(arg.split('=')[1] || '', 10) || DEFAULT_SAMPLE_SIZE);
    } else if (arg === '--count' && args[index + 1]) {
      options.sampleSize = Math.max(1, parseInt(args[index + 1], 10) || DEFAULT_SAMPLE_SIZE);
    } else if (arg.startsWith('--year=')) {
      const year = parseInt(arg.split('=')[1] || '', 10);
      if (!isNaN(year)) options.year = year;
    } else if (arg === '--year' && args[index + 1]) {
      const year = parseInt(args[index + 1], 10);
      if (!isNaN(year)) options.year = year;
    } else if (arg.startsWith('--institutions=')) {
      const values = arg.split('=')[1] || '';
      options.institutionFilter = new Set(
        values
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      );
    } else if (!arg.startsWith('--')) {
      // Support positional args: [sampleSize] [year]
      const positionalIndex = args.slice(0, index).filter((val) => !val.startsWith('--')).length;
      if (positionalIndex === 0) {
        options.sampleSize = Math.max(1, parseInt(arg, 10) || DEFAULT_SAMPLE_SIZE);
      } else if (positionalIndex === 1) {
        const year = parseInt(arg, 10);
        if (!isNaN(year)) options.year = year;
      }
    }
  });

  return options;
}

function pickRandomSample<T>(items: T[], count: number): T[] {
  if (count >= items.length) {
    return [...items];
  }

  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy.slice(0, count);
}

function formatCourse(course: DiscoveredCourse): string {
  const name = course.courseName?.trim() || '<no-name>';
  return `${course.courseCode} → ${name}`;
}

async function sampleInstitutionCourses(
  institutionCode: string,
  sampleSize: number,
  year?: number
): Promise<DiscoveredCourse[]> {
  const courses = await getAllCoursesForInstitution(institutionCode, year);
  if (!courses.length) {
    return [];
  }

  const withNames = courses.filter((course) => Boolean(course.courseName?.trim()));
  const samplingPool = withNames.length >= sampleSize ? withNames : courses;

  return pickRandomSample(samplingPool, Math.min(sampleSize, samplingPool.length));
}

async function main() {
  const options = parseCliArgs();
  const yearLabel = options.year ?? 'all years';

  console.log('─────────────────────────────────────────────');
  console.log('🎯 Sampling original course names per institution');
  console.log(`   Sample size (B): ${options.sampleSize}`);
  console.log(`   Year filter: ${yearLabel}`);
  if (options.institutionFilter) {
    console.log(
      `   Institutions: ${Array.from(options.institutionFilter.values()).join(', ')}`
    );
  }
  console.log('─────────────────────────────────────────────\n');

  for (const institution of ALL_INSTITUTIONS) {
    if (
      options.institutionFilter &&
      !options.institutionFilter.has(institution.shortName) &&
      !options.institutionFilter.has(institution.code)
    ) {
      continue;
    }

    console.log(`🏛️  ${institution.shortName} (${institution.code}) — ${institution.name}`);

    try {
      const samples = await sampleInstitutionCourses(
        institution.code,
        options.sampleSize,
        options.year
      );

      if (!samples.length) {
        console.log('   ⚠️  No data returned for this institution.\n');
        continue;
      }

      samples.forEach((course, index) => {
        const formatted = formatCourse(course);
        const normalization = normalizeCourseCodeAdvanced(course.courseCode);
        console.log(`   ${String(index + 1).padStart(2, '0')}. ${formatted}`);
        if (normalization.changed) {
          const details = normalization.steps.length
            ? ` [${normalization.steps.join(', ')}]`
            : '';
          console.log(`        ↳ norm: ${normalization.normalized}${details}`);
        }
      });

      if (samples.length < options.sampleSize) {
        console.log(
          `   ℹ️  Only ${samples.length} courses available in sampling pool (requested ${options.sampleSize}).`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ Error fetching data: ${message}`);
    }

    console.log('');
    // Be kind to the API to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  console.log('✅ Sampling complete.');
}

main().catch((error) => {
  console.error('Unexpected error while sampling course names:', error);
  process.exit(1);
});


