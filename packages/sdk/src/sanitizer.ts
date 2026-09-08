
export const ALLOWED_HTML_TAGS: Set<string> = new Set([
  'b',
  'strong',
  'i',
  'em',
  'u',
  'a',
  'button',
  'span',
  'p',
  'pre',
  'div',
  'br',
  'ul',
  'ol',
  'li',
  'code',
  'blockquote',
  'small',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'sup',
  'sub',
  'del',
  'style',
]);

export const BLOCK_TAGS: Set<string> = new Set([
  'div',
  'p',
  'ul',
  'ol',
  'pre',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'table',
  'section',
  'header',
  'footer',
  'article',
  'nav',
  'aside',
]);

export const PRESERVE_NEWLINE_TAGS: Set<string> = new Set(['pre', 'code', 'textarea']);

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Splits `text` into paragraphs on blank lines, trims each paragraph
 * (spaces/tabs only, preserving intentional newlines), escapes HTML
 * entities, and converts remaining single newlines to `<br>`.
 */
export function formatTextNode(text: string): string {
  if (!text) return '';
  const paragraphs = text.split(/\n{2,}/g);
  const parts: string[] = [];
  for (const p of paragraphs) {
    const trimmed = p.replace(/^[ \t]+|[ \t]+$/g, '');
    const converted = escapeHtml(trimmed).replace(/(?<=[^>\n])\n(?!(\n|<)\S)/g, '<br>');
    if (!converted) continue;
    parts.push(converted);
  }
  return parts.join('</p><p>');
}

/**
 * Rebuilds an opening tag keeping only safe attributes (strips `on*`
 * handlers and `javascript:`/`data:` URI values). Closing tags are
 * always returned bare.
 */
export function sanitizeTag(tagText: string, tagName: string): string {
  const closingTag = /^<\//.test(tagText);
  if (closingTag) return `</${tagName}>`;

  const attributes = tagText.slice(tagName.length + 1, -1);
  const safeAttributes: string[] = [];
  const attrRegex = /([a-zA-Z:-]+)\s*=\s*("[^"]*"|'[^']*'|\S+)/g;
  for (const match of attributes.matchAll(attrRegex)) {
    const rawName = match[1];
    const rawValue = match[2];
    const lowerName = rawName.toLowerCase();
    if (lowerName.startsWith('on')) continue;

    const value =
      rawValue.startsWith('"') || rawValue.startsWith("'")
        ? rawValue.slice(1, -1)
        : rawValue;
    if (value.trim().toLowerCase().startsWith('javascript:')) continue;
    if (value.trim().toLowerCase().startsWith('data:')) continue;

    safeAttributes.push(`${rawName}="${escapeHtml(value)}"`);
  }

  const attributeString = safeAttributes.length ? ` ${safeAttributes.join(' ')}` : '';
  return `<${tagName}${attributeString}>`;
}

/**
 * Whitelist-based HTML sanitizer shared by client/server story engines.
 * - Preserves `<style>` blocks verbatim (unescaped).
 * - Preserves newlines (without converting to `<br>`) inside
 *   `<pre>/<code>/<textarea>`.
 * - Strips newlines immediately adjacent to block-tag boundaries so
 *   stray `<br>` tags don't appear right after an opening block tag or
 *   right before its closing tag.
 * - Escapes text nodes and converts remaining single newlines to `<br>`.
 */
export function sanitizeAllowedHtml(
  value: string,
  allowedTags: Set<string> = ALLOWED_HTML_TAGS,
): string {
  const tagPattern = /<\/?([a-zA-Z0-9]+)(\s+[^>]*)?>/g;
  let lastIndex = 0;
  let result = '';
  let lastWasOpeningBlock = false;

  for (const match of value.matchAll(tagPattern)) {
    const tagText = match[0];
    const tagName = (match[1] || '').toLowerCase();
    const start = match.index ?? 0;
    if (start < lastIndex) continue; // skip tags inside already-consumed ranges

    let before = value.slice(lastIndex, start);
    // if previous was opening block tag, strip leading newlines/spaces to avoid leading <br>
    if (lastWasOpeningBlock) {
      before = before.replace(/^[ \t]*\n+[ \t]*/g, '');
    }
    // if current tag is a closing block tag, strip trailing newlines/spaces to avoid trailing <br>
    const isClosingBlock = /^<\//.test(tagText) && BLOCK_TAGS.has(tagName);
    if (isClosingBlock) {
      before = before.replace(/[ \t]*\n+[ \t]*$/g, '');
    }
    result += formatTextNode(before);

    // preserve entire <style>...</style> blocks without altering their content
    const isOpeningStyle = tagName === 'style' && !/^<\//.test(tagText);
    if (isOpeningStyle) {
      const closeTag = '</style>';
      const closeIdx = value.toLowerCase().indexOf(closeTag, start + tagText.length);
      if (closeIdx !== -1) {
        const endIdx = closeIdx + closeTag.length;
        result += value.slice(start, endIdx);
        lastIndex = endIdx;
        continue;
      }
    }

    // preserve newlines (escape but do not convert to <br>) for pre/code/textarea
    const isPreserveNl = PRESERVE_NEWLINE_TAGS.has(tagName) && !/^<\//.test(tagText);
    if (isPreserveNl) {
      const closeTag = `</${tagName}>`;
      const closeIdx = value.toLowerCase().indexOf(closeTag, start + tagText.length);
      if (closeIdx !== -1) {
        const openEnd = start + tagText.length;
        const inner = value.slice(openEnd, closeIdx);
        result += sanitizeTag(tagText, tagName);
        result += escapeHtml(inner);
        result += `</${tagName}>`;
        lastIndex = closeIdx + closeTag.length;
        continue;
      }
    }

    if (!tagName || !allowedTags.has(tagName)) {
      result += escapeHtml(tagText);
    } else {
      result += sanitizeTag(tagText, tagName);
    }

    lastIndex = start + tagText.length;
    const isOpeningTag = !/^<\//.test(tagText) && BLOCK_TAGS.has(tagName);
    lastWasOpeningBlock = isOpeningTag;
  }

  result += formatTextNode(value.slice(lastIndex));
  return result;
}
