// TODO: Find a library for this

/**
 * Parses integer datatypes (decimal, int, byte, nonPositiveInteger, etc...).
 *
 * All other values, including NaN, INF, and floating point numbers all
 * return undefined;
 *
 * @param value the string to interpret as a number
 */
export function parseXSDInteger(value: string): number | undefined {
  if (/^(\-|\+)?([0-9]+(\.[0-9]+)?)$/.test(value)) {
    const numb: number = Number(value);
    return (isNaN(numb)) ? undefined : numb;
  }
  return undefined;
}

/**
 * TODO: Fix decently
 * Parses float datatypes (double, float).
 *
 * All invalid lexical values return undefined.
 *
 * @param value the string to interpret as a number
 */
export function parseXSDFloat(value: string): number | undefined {
  const numb: number = Number(value);
  if (isNaN(numb)) {
    if (value === 'NaN') { return NaN; }
    if (value === 'INF') { return Infinity; }
    if (value === '-INF') { return -Infinity; }
    return undefined;
  }
  return numb;
}
