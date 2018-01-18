import {ActorQueryOperationTypedMediated, Bindings, BindingsStream,
  IActorQueryOperationOutput, IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {IActorTest} from "@comunica/core";
import {MultiTransformIterator} from "asynciterator";
import {PromiseProxyIterator} from "asynciterator-promiseproxy";
import {quad} from "rdf-data-model";
import * as RDF from "rdf-js";
import {termToString} from "rdf-string";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Query Operation Actor that resolves BGPs in a left-deep manner
 * based on the pattern with the smallest item count.
 */
export class ActorQueryOperationBgpLeftDeepSmallest extends ActorQueryOperationTypedMediated<Algebra.Bgp> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'bgp');
  }

  /**
   * Create a new bindings stream
   * that takes every binding of the base stream,
   * materializes the remaining patterns with it,
   * and emits all bindings from this new set of patterns.
   * @param {BindingsStream} baseStream The base stream.
   * @param {Algebra.Pattern[]} patterns The patterns to materialize with each binding of the base stream.
   * @param {(patterns: Algebra.Pattern[]) => Promise<IActorQueryOperationOutput>} patternBinder A callback
   * to retrieve the bindings stream of an array of patterns.
   * @return {BindingsStream}
   */
  public static createLeftDeepStream(baseStream: BindingsStream, patterns: Algebra.Pattern[],
                                     patternBinder: (patterns: Algebra.Pattern[]) =>
                                       Promise<BindingsStream>): BindingsStream {
    const bindingsStream: MultiTransformIterator<Bindings, Bindings> = new MultiTransformIterator(baseStream);
    bindingsStream._createTransformer = (bindings: Bindings) => {
      return new PromiseProxyIterator(
        async () => (await patternBinder(ActorQueryOperationBgpLeftDeepSmallest.materializePatterns(patterns,
          bindings))).map((subBindings: Bindings) => subBindings.merge(bindings)));
    };
    return bindingsStream;
  }

  /**
   * Get the combined list of variables of the given pattern outputs.
   * @param {IActorQueryOperationOutput[]} patternOutputs An array of query operation outputs
   * @return {string[]} The array of variable names.
   */
  public static getCombinedVariables(patternOutputs: IActorQueryOperationOutput[]): string[] {
    return require('lodash.uniq')([].concat.apply([],
      patternOutputs.map((patternOutput) => patternOutput.variables)));
  }

  /**
   * Find the pattern index with the smallest number of elements.
   * @param {{[p: string]: any}[]} metadatas An array of optional metadata objects for the patterns.
   * @return {number} The index of the pattern with the smallest number of elements.
   */
  public static getSmallestPatternId(metadatas: {[id: string]: any}[]) {
    let smallestId: number = -1;
    let smallestCount: number = Infinity;
    metadatas.forEach((meta: {[id: string]: any}, id: number) => {
      const count: number = ActorQueryOperationBgpLeftDeepSmallest.getTotalItems(meta);
      if (count <= smallestCount) {
        smallestCount = count;
        smallestId = id;
      }
    });
    return smallestId;
  }

  /**
   * Estimate an upper bound for the total number of items from the given metadata.
   * @param {{[p: string]: any}} smallestPattern The optional metadata for the pattern
   *                                             with the smallest number of elements.
   * @param {{[p: string]: any}[]} otherPatterns The array of optional metadata for the other patterns.
   * @return {number} The estimated number of total items.
   */
  public static estimateCombinedTotalItems(smallestPattern: {[id: string]: any},
                                           otherPatterns: {[id: string]: any}[]): number {
    const smallestCount: number = ActorQueryOperationBgpLeftDeepSmallest.getTotalItems(smallestPattern);
    return otherPatterns
      .map((otherPattern) => smallestCount * ActorQueryOperationBgpLeftDeepSmallest.getTotalItems(
        otherPattern))
      .reduce((sum, element) => sum + element, 0);
  }

  /**
   * Get the estimated number of items from the given metadata.
   * @param {{[p: string]: any}} metadata An optional metadata object.
   * @return {number} The estimated number of items, or `Infinity` if metadata is falsy.
   */
  public static getTotalItems(metadata?: {[id: string]: any}): number {
    const totalItems: number = (metadata || {}).totalItems;
    return totalItems || totalItems === 0 ? totalItems : Infinity;
  }

  /**
   * Materialize all patterns in the given pattern array with the given bindings.
   * @param {Pattern[]} patterns SPARQL algebra patterns.
   * @param {Bindings} bindings A bindings object.
   * @return {Pattern[]} A new array where each input pattern is materialized.
   */
  public static materializePatterns(patterns: Algebra.Pattern[], bindings: Bindings): Algebra.Pattern[] {
    return patterns.map((pattern) => ActorQueryOperationBgpLeftDeepSmallest.materializePattern(
      pattern, bindings));
  }

  /**
   * Materialize a pattern with the given bindings.
   * @param {Pattern} pattern A SPARQL algebra pattern.
   * @param {Bindings} bindings A bindings object.
   * @return {Pattern} A new materialized pattern.
   */
  public static materializePattern(pattern: Algebra.Pattern, bindings: Bindings): Algebra.Pattern {
    return <Algebra.Pattern> Object.assign(quad(
      ActorQueryOperationBgpLeftDeepSmallest.materializeTerm(pattern.subject, bindings),
      ActorQueryOperationBgpLeftDeepSmallest.materializeTerm(pattern.predicate, bindings),
      ActorQueryOperationBgpLeftDeepSmallest.materializeTerm(pattern.object, bindings),
      ActorQueryOperationBgpLeftDeepSmallest.materializeTerm(pattern.graph, bindings),
    ), { type: 'pattern' });
  }

  /**
   * Materialize a term with the given binding.
   *
   * If the given term is a variable (or blank node)
   * and that variable exist in the given bindings object,
   * the value of that binding is returned.
   * In all other cases, the term itself is returned.
   *
   * @param {RDF.Term} term A term.
   * @param {Bindings} bindings A bindings object.
   * @return {RDF.Term} The materialized term.
   */
  public static materializeTerm(term: RDF.Term, bindings: Bindings): RDF.Term {
    if (term.termType === 'Variable' || term.termType === 'BlankNode') {
      const value: RDF.Term = bindings.get(termToString(term));
      if (value) {
        return value;
      }
    }
    return term;
  }

  public async testOperation(pattern: Algebra.Bgp, context?: {[id: string]: any}): Promise<IActorTest> {
    if (pattern.patterns.length < 2) {
      throw new Error('Actor ' + this.name + ' can only operate on BGPs with at least two patterns.');
    }
    return true;
  }

  public async runOperation(pattern: Algebra.Bgp, context?: {[id: string]: any})
  : Promise<IActorQueryOperationOutput> {
    // Get the total number of items for all patterns by resolving the quad patterns
    const patternOutputs: IActorQueryOperationOutput[] = (await Promise.all(pattern.patterns
      .map((subPattern: Algebra.Pattern) => this.mediatorQueryOperation.mediate(
        { operation: subPattern, context }))));

    // Find the pattern with the smallest number of elements
    const metadatas: {[id: string]: any}[] = await Promise.all(patternOutputs.map(
      async (patternOutput) => await patternOutput.metadata));
    const smallestId: number = ActorQueryOperationBgpLeftDeepSmallest.getSmallestPatternId(metadatas);

    // Take the pattern with the smallest number of items
    const smallestPattern: IActorQueryOperationOutput = patternOutputs.slice(smallestId)[0];
    const remainingPatterns: Algebra.Pattern[] = pattern.patterns;
    remainingPatterns.splice(smallestId, 1);

    // Materialize the remaining patterns for each binding in the stream.
    const bindingsStream: BindingsStream = ActorQueryOperationBgpLeftDeepSmallest.createLeftDeepStream(
      smallestPattern.bindingsStream, remainingPatterns,
      async (patterns: Algebra.Pattern[]) => {
        // Send the materialized patterns to the mediator for recursive BGP evaluation.
        const operation: Algebra.Bgp = { type: 'bgp', patterns };
        return (await this.mediatorQueryOperation.mediate({ operation, context })).bindingsStream;
      });

    // Prepare variables and metadata
    const variables: string[] = ActorQueryOperationBgpLeftDeepSmallest.getCombinedVariables(patternOutputs);
    const metadata = {
      totalItems: ActorQueryOperationBgpLeftDeepSmallest.estimateCombinedTotalItems(metadatas[smallestId],
        metadatas.slice(smallestId)),
    };

    return { bindingsStream, variables, metadata: Promise.resolve(metadata) };
  }

}
