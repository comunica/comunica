import type { IGhbenchEntry } from './performanceComparison';

/**
 * A query instantiation of the `query-times.csv` file of sparql-benchmark-runner.
 */
export interface IQueryInstantiation {
  name: string;
  failed: boolean;
  /**
   * The mean number of HTTP requests over the replications, or undefined if unknown.
   */
  httpRequests: number | undefined;
}

export const REQUESTS_UNIT = 'requests';

/**
 * Parse delimiter-separated values, in which values can be quoted, with doubled quotes inside quoted values.
 * @param text The text to parse.
 * @param delimiter The delimiter between values.
 * @return The rows, each with its values.
 */
export function parseDelimited(text: string, delimiter = ';'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (quoted) {
      if (char !== '"') {
        value += char;
      } else if (text[index + 1] === '"') {
        value += '"';
        index++;
      } else {
        quoted = false;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(value);
      value = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') {
        index++;
      }
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
    index++;
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

/**
 * Parse the query instantiations of a `query-times.csv` file.
 * Files of sparql-benchmark-runner have error and httpRequests columns,
 * but those of other drivers, such as the one of BSBM, may lack them.
 * @param text The contents of the file.
 */
export function parseQueryTimes(text: string): IQueryInstantiation[] {
  const [ header, ...rows ] = parseDelimited(text).filter(row => row.some(value => value.length > 0));
  if (!header) {
    return [];
  }
  const nameColumn = header.indexOf('name');
  if (nameColumn < 0) {
    throw new Error('The query times have no name column');
  }
  const errorColumn = header.indexOf('error');
  const requestsColumn = header.indexOf('httpRequests');
  return rows.map((row) => {
    const requests = requestsColumn < 0 ? '' : row[requestsColumn] ?? '';
    return {
      name: row[nameColumn],
      failed: errorColumn >= 0 && row[errorColumn] === 'true',
      httpRequests: requests === '' ? undefined : Number(requests),
    };
  });
}

/**
 * Convert query instantiations into entries for the Benchmark Github Action.
 * A query gets the sum of the HTTP requests of its instantiations that succeeded,
 * and the suite, named by the label, gets the sum over its queries without failures.
 * Suites without any HTTP requests, such as those over local files, or that do not report them, get no entries.
 * @param label The label of the benchmark suite.
 * @param instantiations The query instantiations.
 */
export function toRequestsEntries(label: string, instantiations: IQueryInstantiation[]): IGhbenchEntry[] {
  if (!instantiations.some(instantiation => !instantiation.failed && (instantiation.httpRequests ?? 0) > 0)) {
    return [];
  }
  const queries = new Map<string, IQueryInstantiation[]>();
  for (const instantiation of instantiations) {
    const queryInstantiations = queries.get(instantiation.name) ?? [];
    queryInstantiations.push(instantiation);
    queries.set(instantiation.name, queryInstantiations);
  }

  const entries: IGhbenchEntry[] = [];
  const excluded: string[] = [];
  let total = 0;
  for (const [ query, queryInstantiations ] of queries) {
    const requests = queryInstantiations
      .filter(instantiation => !instantiation.failed)
      .map(instantiation => Math.round(instantiation.httpRequests ?? 0));
    const failed = queryInstantiations.length - requests.length;
    const value = requests.reduce((sum, count) => sum + count, 0);
    if (failed === 0) {
      total += value;
    } else {
      excluded.push(query);
    }
    entries.push({
      name: `${label} - ${query}`,
      unit: REQUESTS_UNIT,
      value: requests.length > 0 ? value : null,
      extra: `Failed: ${failed}/${queryInstantiations.length}; Requests: [${requests.join(',')}]`,
    });
  }
  return [
    {
      name: label,
      unit: REQUESTS_UNIT,
      value: total,
      extra: `Queries: ${queries.size}; Excluded: [${excluded.join(',')}]`,
    },
    ...entries,
  ];
}
