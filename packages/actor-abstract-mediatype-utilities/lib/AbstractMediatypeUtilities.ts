import {
  DataSources,
  IDataSource,
  KEY_CONTEXT_SOURCE,
  KEY_CONTEXT_SOURCES,
} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext} from "@comunica/core";

/**
 * A comunica Hash Query Operation Actor.
 */
export abstract class AbstractMediatypeUtilities {

  /**
   * Get the single source if the context contains just a single source.
   * @param {ActionContext} context A context, can be null.
   * @return {Promise<IDataSource>} A promise resolving to the single datasource or null.
   */
  public static async getSingleSource(context: ActionContext): Promise<IDataSource> {
    if (context && context.has(KEY_CONTEXT_SOURCE)) {
      // If the single source is set
      return context.get(KEY_CONTEXT_SOURCE);
    } else if (context && context.has(KEY_CONTEXT_SOURCES)) {
      // If multiple sources are set
      const datasources: DataSources = context.get(KEY_CONTEXT_SOURCES);
      if (datasources.isEnded()) {
        // Now get the first source
        const datasourcesArray: IDataSource[] = await require('arrayify-stream')(datasources.iterator());
        if (datasourcesArray.length === 1) {
          return datasourcesArray[0];
        }
      }
    }
    return null;
  }

  /**
   * Get the type of a single source
   * @param {ActionContext} context A context, can be null.
   * @return {Promise<string>} A promise resolving to the type of the source, can be null if source is null.
   */
  public static async getSingleSourceType(context: ActionContext): Promise<string> {
    const source = await this.getSingleSource(context);
    return source ? source.type : null;
  }

  /**
   * Get the flags of a single source
   * @param {ActionContext} context A context, can be null.
   * @return {Promise<{[id: string]: any}>} A promise resolving to the flags of the source,
   *                                        can be null if source is null.
   */
  public static async getSingleSourceFlags(context: ActionContext): Promise<{[id: string]: any}> {
    const source = await this.getSingleSource(context);
    return source ? source.flags : null;
  }

  /**
   * Check if the given context has a single source of the given type.
   * @param {ActionContext} context An optional context.
   * @param {string} requiredType The required source type name.
   * @return {boolean} If the given context has a single source of the given type.
   */
  public static async singleSourceHasType(context: ActionContext, requiredType: string): Promise<boolean> {
    const actualType = await this.getSingleSourceType(context);
    const result = actualType ? actualType === requiredType : false;
    return result;
  }

  /**
   * Check if there is a single source with a certain flag that has a certain value
   * @param {ActionContext} context An optional context.
   * @param {string} requiredFlag The required source flag name.
   * @param {string} requiredValue The required value of the flag.
   * @return {boolean} If the given context has a single source with the specified flag that has the required value.
   */
  public static async singleSourceHasFlag(context: ActionContext, requiredFlag: string, requiredValue: any):
  Promise<boolean> {
    const actualFlags = await this.getSingleSourceFlags(context);
    const result = actualFlags && actualFlags[requiredFlag] ? actualFlags[requiredFlag] === requiredValue : false;
    return result;
  }
}
