import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { ActionContext, IActorTest } from '@comunica/core';
import type { Bindings, BindingsStream, IActorQueryOperationOutputBindings } from '@comunica/types';
import { ArrayIterator, MultiTransformIterator, TransformIterator } from 'asynciterator';
import type * as RDF from 'rdf-js';
import { termToString } from 'rdf-string';
import { mapTerms } from 'rdf-terms';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Query Operation Actor that resolves BGPs in a left-deep manner
 * based on the pattern with the smallest item count and sorts the remaining patterns by increasing count.
 */
export class ActorQueryOperationBgpLeftDeepSmallestSort extends ActorQueryOperationTypedMediated<Algebra.Bgp> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
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
    patternBinder: (bindPatterns: Algebra.Pattern[]) => Promise<BindingsStream>): BindingsStream {
    return new MultiTransformIterator(baseStream, {
      autoStart: false,
      multiTransform(bindings: Bindings) {
        const bindingsMerger = (subBindings: Bindings): Bindings => subBindings.merge(bindings);
        return new TransformIterator(
          async() => (await patternBinder(ActorQueryOperationBgpLeftDeepSmallestSort.materializePatterns(patterns,
            bindings))).map(bindingsMerger), { maxBufferSize: 128 },
        );
      },
    });
  }

  /**
   * Get the combined list of variables of the given pattern outputs.
   * @param {IActorQueryOperationOutput[]} patternOutputs An array of query operation outputs
   * @return {string[]} The array of variable names.
   */
  public static getCombinedVariables(patternOutputs: IActorQueryOperationOutputBindings[]): string[] {
    const withDuplicates = (<string[]> []).concat.apply([],
      patternOutputs.map(patternOutput => patternOutput.variables));
    return [ ...new Set(withDuplicates) ];
  }

  /**
   * Sort the given patterns and metadata by increasing estimated count.
   * @param {IOutputMetaTuple[]} patternOutputsMeta An array of pattern output and metadata tuples.
   * @return {IOutputMetaTuple[]} The sorted array.
   */
  public static sortPatterns(patternOutputsMeta: IOutputMetaTuple[]): IOutputMetaTuple[] {
    return patternOutputsMeta.sort((tuple1: IOutputMetaTuple, tuple2: IOutputMetaTuple) =>
      ActorQueryOperationBgpLeftDeepSmallestSort.getTotalItems(tuple1.meta) -
      ActorQueryOperationBgpLeftDeepSmallestSort.getTotalItems(tuple2.meta));
  }

  /**
   * Estimate an upper bound for the total number of items from the given metadata.
   * @param {{[p: string]: any}} smallestPattern The optional metadata for the pattern
   *                                             with the smallest number of elements.
   * @param {{[p: string]: any}[]} otherPatterns The array of optional metadata for the other patterns.
   * @return {number} The estimated number of total items.
   */
  public static estimateCombinedTotalItems(smallestPattern: Record<string, any> | undefined,
    otherPatterns: (Record<string, any> | undefined)[]): number {
    const smallestCount: number = ActorQueryOperationBgpLeftDeepSmallestSort.getTotalItems(smallestPattern);
    return otherPatterns
      .map(otherPattern => smallestCount * ActorQueryOperationBgpLeftDeepSmallestSort.getTotalItems(
        otherPattern,
      ))
      .reduce((sum, element) => sum + element, 0);
  }

  /**
   * Get the estimated number of items from the given metadata.
   * @param {{[p: string]: any}} metadata An optional metadata object.
   * @return {number} The estimated number of items, or `Infinity` if metadata is falsy.
   */
  public static getTotalItems(metadata?: Record<string, any>): number {
    const { totalItems } = metadata ?? {};
    return totalItems || totalItems === 0 ? totalItems : Number.POSITIVE_INFINITY;
  }

  /**
   * Materialize all patterns in the given pattern array with the given bindings.
   * @param {Pattern[]} patterns SPARQL algebra patterns.
   * @param {Bindings} bindings A bindings object.
   * @return {Pattern[]} A new array where each input pattern is materialized.
   */
  public static materializePatterns(patterns: Algebra.Pattern[], bindings: Bindings): Algebra.Pattern[] {
    return patterns.map(pattern => ActorQueryOperationBgpLeftDeepSmallestSort.materializePattern(
      pattern, bindings,
    ));
  }

  /**
   * Materialize a pattern with the given bindings.
   * @param {Pattern} pattern A SPARQL algebra pattern.
   * @param {Bindings} bindings A bindings object.
   * @return {Pattern} A new materialized pattern.
   */
  public static materializePattern(pattern: Algebra.Pattern, bindings: Bindings): Algebra.Pattern {
    return <Algebra.Pattern> Object.assign(mapTerms(pattern,
      (term: RDF.Term) => ActorQueryOperationBgpLeftDeepSmallestSort.materializeTerm(term, bindings)),
    { type: 'pattern', context: pattern.context });
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
    if (term.termType === 'Variable') {
      const value: RDF.Term = bindings.get(termToString(term));
      if (value) {
        return value;
      }
    }
    return term;
  }

  /**
   * Check if at least one of the given outputs has an empty output, i.e., when the estimated count is zero.
   * @param {IActorQueryOperationOutputBindings[]} patternOutputs Pattern outputs.
   * @return {Promise<boolean>} A promise for indicating whether or not at least one of the outputs is empty.
   */
  public static async hasOneEmptyPatternOutput(patternOutputs: IActorQueryOperationOutputBindings[]): Promise<boolean> {
    for (const patternOutput of patternOutputs) {
      if (patternOutput.metadata) {
        const metadata: Record<string, any> = await patternOutput.metadata();
        if (!ActorQueryOperationBgpLeftDeepSmallestSort.getTotalItems(metadata)) {
          return true;
        }
      }
    }
    return false;
  }

  public async testOperation(pattern: Algebra.Bgp, context: ActionContext): Promise<IActorTest> {
    if (pattern.patterns.length < 2) {
      throw new Error(`Actor ${this.name} can only operate on BGPs with at least two patterns.`);
    }
    return true;
  }

  public async runOperation(pattern: Algebra.Bgp, context: ActionContext): Promise<IActorQueryOperationOutputBindings> {
    // Get the total number of items for all patterns by resolving the quad patterns
    const patternOutputs: IActorQueryOperationOutputBindings[] = (await Promise.all(pattern.patterns
      .map((subPattern: Algebra.Pattern) => this.mediatorQueryOperation.mediate(
        { operation: subPattern, context },
      ))))
      .map(ActorQueryOperation.getSafeBindings);

    // If a triple pattern has no matches, the entire graph pattern has no matches.
    if (await ActorQueryOperationBgpLeftDeepSmallestSort.hasOneEmptyPatternOutput(patternOutputs)) {
      return {
        bindingsStream: new ArrayIterator([], { autoStart: false }),
        metadata: () => Promise.resolve({ totalItems: 0 }),
        type: 'bindings',
        variables: [],
        canContainUndefs: false,
      };
    }

    // Resolve the metadata for all patterns
    const metadatas: Record<string, any>[] = await Promise.all(patternOutputs.map(
      async patternOutput => patternOutput.metadata ? await patternOutput.metadata() : {},
    ));

    // Sort patterns by increasing total items
    const outputMetaTuples: IOutputMetaTuple[] = ActorQueryOperationBgpLeftDeepSmallestSort.sortPatterns(
      patternOutputs.map((output: IActorQueryOperationOutputBindings, i: number) =>
        ({ input: pattern.patterns[i], output, meta: metadatas[i] })),
    );

    // Close the non-smallest streams
    for (let i = 1; i < outputMetaTuples.length; i++) {
      outputMetaTuples[i].output.bindingsStream.close();
    }

    // Take the pattern with the smallest number of items
    const smallestPattern: IOutputMetaTuple = outputMetaTuples.slice(0)[0];
    outputMetaTuples.splice(0, 1);

    // Materialize the remaining patterns for each binding in the stream.
    const bindingsStream: BindingsStream = ActorQueryOperationBgpLeftDeepSmallestSort.createLeftDeepStream(
      smallestPattern.output.bindingsStream,
      outputMetaTuples.map(pat => pat.input),
      async(patterns: Algebra.Pattern[]) => {
        // Send the materialized patterns to the mediator for recursive BGP evaluation.
        const operation: Algebra.Bgp = { type: 'bgp', patterns };
        return ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation.mediate({ operation, context }))
          .bindingsStream;
      },
    );

    // Prepare variables and metadata
    const variables: string[] = ActorQueryOperationBgpLeftDeepSmallestSort.getCombinedVariables(patternOutputs);
    const metadata = (): Promise<Record<string, any>> => Promise.resolve({
      totalItems: ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(smallestPattern.meta,
        outputMetaTuples.map(pat => pat.meta)),
    });

    return { type: 'bindings', bindingsStream, variables, metadata, canContainUndefs: false };
  }
}

export interface IOutputMetaTuple {
  input: Algebra.Pattern;
  output: IActorQueryOperationOutputBindings;
  meta?: Record<string, any>;
}
