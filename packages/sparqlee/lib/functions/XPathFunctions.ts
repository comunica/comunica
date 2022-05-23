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
    reg = new RegExp(pattern, `${flags_}g`);
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

  if (!_matchLangTag(rangeTags[0], langTags[0]) &&
    !_isWildCard(langTags[0])) {
    return false;
  }

  let lI = 1;
  let rI = 1;
  while (rI < rangeTags.length) {
    if (_isWildCard(rangeTags[rI])) {
      rI++;
      continue;
    }
    if (lI === langTags.length) {
      return false;
    }
    if (_matchLangTag(rangeTags[rI], langTags[lI])) {
      lI++;
      rI++;
      continue;
    }
    if (langTags[lI].length === 1) {
      return false;
    }
    lI++;
  }
  return true;
}

function _isWildCard(tag: string): boolean {
  return tag === '*';
}

function _matchLangTag(left: string, right: string): boolean {
  const matchInitial = new RegExp(`/${left}/`, 'iu');
  return matchInitial.test(`/${right}/`);
}

/**
 * Formats a timezone string into a XML DayTimeDuration
 *
 * TODO: Test
 * Used in fn:timezone
 * http://www.datypic.com/sc/xsd/t-xsd_dayTimeDuration.html
 */
export function formatDayTimeDuration(timezone: string): string | undefined {
  if (!timezone) {
    return;
  }

  let sign = '';
  let hours = 0;
  let minutes = 0;
  if (timezone !== 'Z') {
    sign = timezone.startsWith('-') ? '-' : '';
    hours = Number.parseInt(timezone.slice(1, 3), 10);
    minutes = Number.parseInt(timezone.slice(4, 6), 10);
  }

  if (hours === 0 && minutes === 0) {
    return 'PT0S';
  }

  let time = `${sign}PT`;
  if (hours > 0) {
    time += `${hours}H`;
  }
  if (minutes > 0) {
    time += `${minutes}M`;
  }
  return time;
}
