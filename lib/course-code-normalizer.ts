export interface CourseCodeNormalizationResult {
  original: string;
  normalized: string;
  steps: string[];
  changed: boolean;
}

function replaceSpacesAndUppercase(code: string, steps: string[]): string {
  let result = code;

  const trimmed = result.trim();
  if (trimmed !== result) {
    steps.push('trimmed whitespace');
    result = trimmed;
  }

  const upper = result.toUpperCase();
  if (upper !== result) {
    steps.push('uppercased');
    result = upper;
  }

  if (/\s/.test(result)) {
    const withoutSpaces = result.replace(/\s+/g, '');
    if (withoutSpaces !== result) {
      steps.push('removed spaces');
      result = withoutSpaces;
    }
  }

  return result;
}

function normalizeSeparators(code: string, steps: string[]): string {
  let result = code;

  if (/[_.]/.test(result)) {
    const replaced = result.replace(/[_.]+/g, '-');
    if (replaced !== result) {
      steps.push('normalized separators');
      result = replaced;
    }
  }

  const collapsed = result.replace(/-+/g, '-');
  if (collapsed !== result) {
    steps.push('collapsed hyphens');
    result = collapsed;
  }

  return collapsed;
}

function removeTrailingZeros(code: string, original: string, steps: string[]): string {
  if (!/(?:\s|-)0{3}$/.test(original)) {
    return code;
  }

  const result = code.replace(/0{3}$/, '');
  if (result !== code) {
    steps.push('removed trailing "000"');
  }
  return result;
}

function removeSuffixes(code: string, steps: string[]): string {
  let result = code;
  const suffixLog: string[] = [];

  const canStripSuffix = (token: string) => {
    if (/^\d{1,2}$/.test(token)) return true; // -1, -12
    if (/^[A-Z]\d{1}$/.test(token)) return true; // -L1, -G9
    if (/^[A-Z]{1,2}$/.test(token)) return true; // -G, -MB
    return false;
  };

  let keepRemoving = true;
  while (keepRemoving && result.length > 4) {
    keepRemoving = false;
    const match = result.match(/-([A-Z0-9]{1,3})$/);
    if (!match) break;

    const token = match[1];
    if (canStripSuffix(token)) {
      suffixLog.push(`removed suffix "-${token}"`);
      result = result.slice(0, -(token.length + 1));
      keepRemoving = true;
    }
  }

  if (suffixLog.length) {
    steps.push(...suffixLog);
  }

  return result;
}

export function normalizeCourseCodeAdvanced(code: string): CourseCodeNormalizationResult {
  const steps: string[] = [];
  if (!code) {
    return {
      original: code,
      normalized: '',
      steps,
      changed: false,
    };
  }

  let normalized = replaceSpacesAndUppercase(code, steps);
  normalized = normalizeSeparators(normalized, steps);
  normalized = removeTrailingZeros(normalized, code, steps);
  normalized = removeSuffixes(normalized, steps);

  const changed = normalized !== code;

  return {
    original: code,
    normalized,
    steps,
    changed,
  };
}


