export interface BalancedBlock {
  content: string;
  endIndex: number;
}

/**
 * Walks `source` from `startIndex` (which must point at `openChar`) and
 * returns the content between the matching balanced open/close pair,
 * skipping over quoted strings so nested quotes/brackets don't break
 * scanning. Returns `null` if no matching close is found.
 */
export function readBalancedBlock(
  source: string,
  startIndex: number,
  openChar: string,
  closeChar: string,
): BalancedBlock | null {
  if (source[startIndex] !== openChar) {
    return null;
  }

  let depth = 1;
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;

  for (let i = startIndex + 1; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }

    if (ch === openChar) {
      depth += 1;
      continue;
    }

    if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return {
          content: source.slice(startIndex + 1, i),
          endIndex: i + 1,
        };
      }
    }
  }

  return null;
}

/**
 * Recognizes `(fn:"name")[ ...code... ]` starting at `startIndex` (which
 * must point at the opening `(`). Returns the function name, its raw
 * code body, and the index right after the closing `]`.
 */
export function consumeFnDefinition(
  source: string,
  startIndex: number,
): { name: string; code: string; endIndex: number } | null {
  const signature = readBalancedBlock(source, startIndex, '(', ')');
  if (!signature) {
    return null;
  }

  const nameMatch = signature.content
    .trim()
    .match(/^fn:\s*["']([^"']+)["']\s*$/i);
  if (!nameMatch) {
    return null;
  }

  let cursor = signature.endIndex;
  while (cursor < source.length && /\s/.test(source[cursor])) {
    cursor += 1;
  }

  const body = readBalancedBlock(source, cursor, '[', ']');
  if (!body) {
    return null;
  }

  return {
    name: nameMatch[1],
    code: body.content,
    endIndex: body.endIndex,
  };
}

/**
 * Scans `input` for `(fn:"name")[code]` definitions, registers each one
 * into `registry`, and returns the source with the definitions removed
 * so they don't render inline.
 */
export function extractAndRegisterFunctions(
  input: string,
  registry: Record<string, string>,
): string {
  let result = '';
  let cursor = 0;
  let searchFrom = 0;

  while (searchFrom < input.length) {
    const fnStart = input.indexOf('(fn:', searchFrom);
    if (fnStart === -1) {
      break;
    }

    const parsed = consumeFnDefinition(input, fnStart);
    if (!parsed) {
      searchFrom = fnStart + 4;
      continue;
    }

    result += input.slice(cursor, fnStart);
    registry[parsed.name] = parsed.code;
    cursor = parsed.endIndex;
    searchFrom = parsed.endIndex;
  }

  result += input.slice(cursor);
  return result;
}
