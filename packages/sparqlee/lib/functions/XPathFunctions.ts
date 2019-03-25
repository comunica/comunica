
// https://www.w3.org/TR/xpath-functions/#func-matches
// https://www.w3.org/TR/xpath-functions/#flags
export function matches(text: string, pattern: string, flags?: string): boolean {
  // TODO: Only flags 'i' and 'm' match between XPath and JS.
  // 's', 'x', 'q', would need proper implementation.
  const reg = new RegExp(pattern, flags);
  return reg.test(text);
}

// TODO: Fix flags
// https://www.w3.org/TR/xpath-functions/#func-replace
export function replace(arg: string, pattern: string, replacement: string, flags?: string): string {
  let reg = new RegExp(pattern, flags);
  if (!reg.global) {
    const flags_ = flags || '';
    reg = new RegExp(pattern, flags_ + 'g');
  }
  return arg.replace(reg, replacement);
}

// TODO: Not an XPath function
// TODO: Publish as package
// https://www.ietf.org/rfc/rfc4647.txt
// https://www.w3.org/TR/sparql11-query/#func-langMatches
export function langMatches(tag: string, range: string): boolean {
  const langTags = tag.split('-');
  const rangeTags = range.split('-');

  if (!_matchLangTag(rangeTags[0], langTags[0])
    && !_isWildCard(langTags[0])) { return false; }

  let lI = 1;
  let rI = 1;
  while (rI < rangeTags.length) {
    if (_isWildCard(rangeTags[rI])) { rI++; continue; }
    if (lI === langTags.length) { return false; }
    if (_matchLangTag(rangeTags[rI], langTags[lI])) { lI++; rI++; continue; }
    if (langTags[lI].length === 1) { return false; }
    lI++;
  }
  return true;
}

function _isWildCard(tag: string): boolean {
  return tag === '*';
}

function _matchLangTag(left: string, right: string): boolean {
  const matchInitial = new RegExp(`/${left}/`, 'i');
  return matchInitial.test(`/${right}/`);
}

/**
 * Formats a timezone string into a XML DayTimeDuration
 *
 * TODO: Test
 * Used in fn:timezone
 * http://www.datypic.com/sc/xsd/t-xsd_dayTimeDuration.html
 */
export function formatDayTimeDuration(timezone: string) {
  if (!timezone) { return undefined; }
  if (timezone[0] === 'Z') {
    return 'PT0S';
  } else {
    // Split string
    const [sign, h1Raw, h2Raw, _, m1Raw, m2Raw] = timezone;

    // Cut of leading zero, set to empty string if 0, and append H;
    const h1 = (h1Raw !== '0') ? h1Raw : '';
    const h2 = (h1 || h2Raw !== '0') ? h2Raw : '';
    const hours = (h1 + h2) ? h1 + h2 + 'H' : '';

    // Same as in hours
    const m1 = (m1Raw !== '0') ? m1Raw : '';
    const m2 = (m1 || m2Raw !== '0') ? m2Raw : '';
    const minutes = (m1 + m2) ? m1 + m2 + 'M' : '';

    // Concat sign and time and mandatory separators
    const time = `${hours}${minutes}`;
    const signNoPlus = (sign === '-') ? '-' : '';
    return `${signNoPlus}PT${time}`;
  }
}
