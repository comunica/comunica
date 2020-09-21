import type { DataSources,
  IDataSource } from '@comunica/bus-rdf-resolve-quad-pattern';
import {
  getDataSourceType,
  KEY_CONTEXT_SOURCE,
  KEY_CONTEXT_SOURCES,
} from '@comunica/bus-rdf-resolve-quad-pattern';
import type { ActionContext } from '@comunica/core';

/**
 * Comunica datasource utilities
 */
export const DataSourceUtils = {
  /**
   * Get the single source if the context contains just a single source.
   * @param {ActionContext} context A context, can be null.
   * @return {Promise<IDataSource>} A promise resolving to the single datasource or undefined.
   */
  async getSingleSource(context?: ActionContext): Promise<IDataSource | undefined> {
    if (context && context.has(KEY_CONTEXT_SOURCE)) {
      // If the single source is set
      return context.get(KEY_CONTEXT_SOURCE);
    }
    if (context && context.has(KEY_CONTEXT_SOURCES)) {
      // If multiple sources are set
      const datasources: DataSources = context.get(KEY_CONTEXT_SOURCES);
      if (datasources.length === 1) {
        return datasources[0];
      }
    }
  },

  /**
   * Get the type of a single source
   * @param {ActionContext} context A context, can be undefined.
   * @return {Promise<string>} A promise resolving to the type of the source, can be undefined if source is undefined.
   */
  async getSingleSourceType(context?: ActionContext): Promise<string | undefined> {
    const source = await this.getSingleSource(context);
    return source ? getDataSourceType(source) : undefined;
  },

  /**
   * Check if the given context has a single source of the given type.
   * @param {ActionContext} context An optional context.
   * @param {string} requiredType The required source type name.
   * @return {boolean} If the given context has a single source of the given type.
   */
  async singleSourceHasType(context: ActionContext | undefined, requiredType: string): Promise<boolean> {
    const actualType = await this.getSingleSourceType(context);
    return actualType ? actualType === requiredType : false;
  },
};
