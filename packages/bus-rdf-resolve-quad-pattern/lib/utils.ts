import { KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import type { IActionContext, DataSources, IDataSource } from '@comunica/types';
import type * as RDF from '@rdfjs/types';

/**
 * Check if the given data source is a string or RDF store.
 * @param dataSource A data source.
 */
export function isDataSourceRawType(dataSource: IDataSource): dataSource is string | RDF.Source {
  return typeof dataSource === 'string' || 'match' in dataSource;
}

/**
 * Get the data source type.
 * @param dataSource A data source.
 */
export function getDataSourceType(dataSource: IDataSource): string | undefined {
  if (typeof dataSource === 'string') {
    return '';
  }
  return 'match' in dataSource ? 'rdfjsSource' : dataSource.type;
}

/**
 * Get the data source value.
 * @param dataSource A data source.
 */
export function getDataSourceValue(dataSource: IDataSource): string | RDF.Source {
  return isDataSourceRawType(dataSource) ? dataSource : dataSource.value;
}

/**
 * Get the data source from the given context.
 * @param {ActionContext} context An optional context.
 * @param {IDataSource} dataSource The source or undefined.
 */
export function getDataSourceContext(dataSource: IDataSource, context: IActionContext): IActionContext {
  if (typeof dataSource === 'string' || 'match' in dataSource || !dataSource.context) {
    return context;
  }
  return context.merge(dataSource.context);
}

/**
 * Get the sources from the given context.
 * @param {ActionContext} context An optional context.
 * @return {IDataSource[]} The array of sources or undefined.
 */
export function getContextSources(context: IActionContext): DataSources | undefined {
  return context.get(KeysRdfResolveQuadPattern.sources);
}

/**
 * Get the source from the given context.
 * @param {ActionContext} context An optional context.
 * @return {IDataSource} The source or undefined.
 */
export function getContextSource(context: IActionContext): IDataSource | undefined {
  return context.get(KeysRdfResolveQuadPattern.source);
}

/**
 * Get the single source if the context contains just a single source.
 * This will check both the source and sources context entries.
 * @param {IActionContext} context A context, can be null.
 * @return {IDataSource} The single datasource or undefined.
 */
export function getContextSourceFirst(context: IActionContext): IDataSource | undefined {
  if (context.has(KeysRdfResolveQuadPattern.source)) {
    // If the single source is set
    return context.get(KeysRdfResolveQuadPattern.source);
  }

  // If multiple sources are set
  const datasources: DataSources | undefined = context.get(KeysRdfResolveQuadPattern.sources);
  if (datasources?.length === 1) {
    return datasources[0];
  }
}

/**
 * Get the source's raw URL value from the given context.
 * @param {IDataSource} source A source.
 * @return {string} The URL or null.
 */
export function getContextSourceUrl(source?: IDataSource): string | undefined {
  if (source) {
    let fileUrl = getDataSourceValue(source);
    if (typeof fileUrl === 'string') {
      // Remove hashes from source
      const hashPosition = fileUrl.indexOf('#');
      if (hashPosition >= 0) {
        fileUrl = fileUrl.slice(0, hashPosition);
      }

      return fileUrl;
    }
  }
}

/**
 * Check if the given context has a single source.
 * @param {ActionContext} context An optional context.
 * @return {boolean} If the given context has a single source of the given type.
 */
export function hasContextSingleSource(context: IActionContext): boolean {
  const source = getContextSource(context);
  return Boolean(source && (isDataSourceRawType(source) || source.value));
}

/**
 * Check if the given context has a single source of the given type.
 * @param {string} requiredType The required source type name.
 * @param {ActionContext} context An optional context.
 * @return {boolean} If the given context has a single source of the given type.
 */
export function hasContextSingleSourceOfType(requiredType: string, context: IActionContext): boolean {
  const source = getContextSource(context);
  return Boolean(source && getDataSourceType(source) === requiredType && getDataSourceValue(source));
}
