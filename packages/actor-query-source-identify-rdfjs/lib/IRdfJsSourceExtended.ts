// eslint-disable-next-line import/no-nodejs-modules
import type { EventEmitter } from 'node:events';
import type * as RDF from '@rdfjs/types';
import type { QuadTermName } from 'rdf-terms';

/**
 * Options for producing bindings, which sources only receive if they declare the corresponding feature.
 */
export interface IRdfJsBindingsOptions {
  /**
   * Variables of the pattern of which the values are not needed, as the query does not use them elsewhere.
   * They must be matched as any other variable, but must not be bound,
   * and the bindings must not be ordered on them or on any component after them.
   * Only passed if the source declares the `unusedVariables` feature.
   */
  unusedVariables?: RDF.Variable[];
}

export interface IRdfJsSourceExtended extends RDF.Source {
  /**
   * If false, this source certainly contains no blank nodes.
   * If true or `undefined`, it may contain blank nodes.
   */
  hasBlankNodes?: boolean;
  /**
   * A record indicating supported features of this source.
   */
  features?: {
    /**
     * If true, this source supports passing quad patterns with quoted quad patterns in the `match` method.
     * If false (or if `features` is `undefined`), such quoted quad patterns can not be passed,
     * and must be replaced by `undefined` and filtered by the caller afterwards.
     */
    quotedTripleFiltering?: boolean;
    /**
     * If this is true, matchNodes and countNodes must be available.
     */
    indexNodes?: boolean;
    /**
     * If this is true, matchDistinctTerms and countDistinctTerms must be available.
     */
    indexDistinctTerms?: boolean;
    /**
     * If this is true, countDistinctTerms can cheaply count the distinct objects of a predicate in a graph,
     * Sources that would need to iterate over all quads of the predicate should not set this.
     */
    indexDistinctObjectCounts?: boolean;
    /**
     * If this is true, `matchBindings` and `getBindings` accept the `unusedVariables` option,
     * and do not bind those variables.
     */
    unusedVariables?: boolean;
  };

  /**
   * Return an estimated count of the number of quads matching the given pattern.
   *
   * The better the estimate, the better the query engine will be able to optimize the query.
   *
   * @param subject   An optional subject.
   * @param predicate An optional predicate.
   * @param object    An optional object.
   * @param graph     An optional graph.
   */
  countQuads?: (
    subject?: RDF.Term,
    predicate?: RDF.Term,
    object?: RDF.Term,
    graph?: RDF.Term,
  ) => Promise<number> | number;

  /**
   * Returns a stream that produces all bindings matching the pattern.
   * @param bindingsFactory The factory that will be used to create bindings.
   * @param subject The subject, which can be a variable.
   * @param predicate The predicate, which can be a variable.
   * @param object The object, which can be a variable.
   * @param graph The graph, which can be a variable.
   * @param options Options, if the source declares the features they need.
   */
  matchBindings?: (
    bindingsFactory: RDF.BindingsFactory,
    subject: RDF.Term,
    predicate: RDF.Term,
    object: RDF.Term,
    graph: RDF.Term,
    options?: IRdfJsBindingsOptions,
  ) => EventEmitter;

  /**
   * Returns a stream that produces all nodes as terms in the given graph.
   * Nodes are all terms that are either a subject or object within the graph.
   *
   * This will only be used if `features.indexNodes` is true.
   */
  /**
   * Synchronously returns all bindings matching the given quad pattern.
   * @param bindingsFactory The factory that will be used to create bindings.
   * @param subject The subject, which can be a variable.
   * @param predicate The predicate, which can be a variable.
   * @param object The object, which can be a variable.
   * @param graph The graph, which can be a variable.
   * @param options Options, if the source declares the features they need.
   */
  getBindings?: (
    bindingsFactory: RDF.BindingsFactory,
    subject: RDF.Term,
    predicate: RDF.Term,
    object: RDF.Term,
    graph: RDF.Term,
    options?: IRdfJsBindingsOptions,
  ) => RDF.Bindings[];

  matchNodes?: (graph: RDF.Term) => EventEmitter;

  /**
   * Returns the number of nodes in the given graph.
   * Nodes are all terms that are either a subject or object within the graph.
   *
   * This will only be used if `features.indexNodes` is true.
   */
  countNodes?: (graph: RDF.Term) => number;

  /**
   * Returns a stream that produces all distinct combinations of the specified terms.
   * The stream produces arrays where each element corresponds to a term in the termNames array.
   *
   * This will only be used if `features.indexDistinctTerms` is true.
   *
   * @param termNames The term names to retrieve.
   * @param filters Optional term names that are bound to specific terms, acting as filters.
   */
  matchDistinctTerms?: (termNames: QuadTermName[], filters?: (RDF.Term | undefined)[]) => EventEmitter;

  /**
   * Returns the number of distinct combinations of the specified terms.
   *
   * This will only be used if `features.indexDistinctTerms` is true.
   *
   * @param termNames The term names to count combinations of.
   * @param filters Optional term names that are bound to specific terms, acting as filters.
   */
  countDistinctTerms?: (termNames: QuadTermName[], filters?: (RDF.Term | undefined)[]) => number;
}
