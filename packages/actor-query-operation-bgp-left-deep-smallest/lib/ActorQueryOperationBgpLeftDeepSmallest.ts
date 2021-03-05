import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { ActionContext, IActorTest } from '@comunica/core';
import type {
  Bindings,
  BindingsStream,
  IActorQueryOperationOutputBindings,
  PatternBindings,
} from '@comunica/types';
import { ArrayIterator, MultiTransformIterator, TransformIterator } from 'asynciterator';
import type * as RDF from 'rdf-js';
import { termToString } from 'rdf-string';
import type { QuadTermName } from 'rdf-terms';
import { mapTerms } from 'rdf-terms';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Query Operation Actor that resolves BGPs in a left-deep manner
 * based on the pattern with the smallest item count.
 */
export class ActorQueryOperationBgpLeftDeepSmallest extends ActorQueryOperationTypedMediated<Algebra.Bgp> {
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
   * @param {{ pattern: Algebra.Pattern, bindings: IPatternBindings }[]) => Promise<IActorQueryOperationOutput>}
   *    patternBinder A callback
   * to retrieve the bindings stream of an array of patterns.
   * @return {BindingsStream}
   */
  public static createLeftDeepStream(baseStream: BindingsStream, patterns: Algebra.Pattern[],
    patternBinder: (bindPatterns: { pattern: Algebra.Pattern; bindings: PatternBindings }[])
    => Promise<BindingsStream>): BindingsStream {
    return new MultiTransformIterator(baseStream, {
      autoStart: false,
      multiTransform(bindings: Bindings) {
        const bindingsMerger = (subBindings: Bindings): Bindings => subBindings.merge(bindings);
        return new TransformIterator(
          async() => (await patternBinder(ActorQueryOperationBgpLeftDeepSmallest.materializePatterns(patterns,
            bindings))).transform({ map: bindingsMerger }), { maxBufferSize: 128 },
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
   * Find the pattern index with the smallest number of elements.
   * @param {{[p: string]: any}[]} metadatas An array of optional metadata objects for the patterns.
   * @return {number} The index of the pattern with the smallest number of elements.
   */
  public static getSmallestPatternId(metadatas: (Record<string, any> | undefined)[]): number {
    let smallestId = -1;
    let smallestCount = Number.POSITIVE_INFINITY;
    for (const [ i, meta ] of metadatas.entries()) {
      const count: number = ActorQueryOperationBgpLeftDeepSmallest.getTotalItems(meta);
      if (count <= smallestCount) {
        smallestCount = count;
        smallestId = i;
      }
    }
    return smallestId;
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
    const smallestCount: number = ActorQueryOperationBgpLeftDeepSmallest.getTotalItems(smallestPattern);
    return otherPatterns
      .map(otherPattern => smallestCount * ActorQueryOperationBgpLeftDeepSmallest.getTotalItems(
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
   * @return { pattern: Algebra.Pattern, bindings: IPatternBindings }[] An array of patterns with their bindings.
   */
  public static materializePatterns(patterns: Algebra.Pattern[], bindings: Bindings):
  { pattern: Algebra.Pattern; bindings: PatternBindings }[] {
    return patterns.map(pattern => ActorQueryOperationBgpLeftDeepSmallest.materializePattern(
      pattern, bindings,
    ));
  }

  /**
   * Materialize a pattern with the given bindings.
   * @param {Pattern} pattern A SPARQL algebra pattern.
   * @param {Bindings} bindings A bindings object.
   * @return { pattern: Algebra.Pattern, bindings: IPatternBindings } A new materialized pattern.
   */
  public static materializePattern(pattern: Algebra.Pattern, bindings: Bindings):
  { pattern: Algebra.Pattern; bindings: PatternBindings } {
    const bindingsOut: PatternBindings = {};
    const patternOut = <Algebra.Pattern> Object.assign(mapTerms(pattern,
      (term: RDF.Term, termPosition: QuadTermName) => {
        const materializedTerm = ActorQueryOperationBgpLeftDeepSmallest.materializeTerm(term, bindings);
        if (term !== materializedTerm) {
          bindingsOut[termPosition] = <RDF.Variable> term;
        }
        return materializedTerm;
      }),
    { type: 'pattern', context: pattern.context });
    return { pattern: patternOut, bindings: bindingsOut };
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
        if (!ActorQueryOperationBgpLeftDeepSmallest.getTotalItems(metadata)) {
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
    if (await ActorQueryOperationBgpLeftDeepSmallest.hasOneEmptyPatternOutput(patternOutputs)) {
      return {
        bindingsStream: new ArrayIterator([], { autoStart: false }),
        metadata: () => Promise.resolve({ totalItems: 0 }),
        type: 'bindings',
        variables: ActorQueryOperationBgpLeftDeepSmallest.getCombinedVariables(patternOutputs),
        canContainUndefs: false,
      };
    }

    // Find the pattern with the smallest number of elements
    const metadatas: Record<string, any>[] = await Promise.all(patternOutputs.map(
      async patternOutput => patternOutput.metadata ? await patternOutput.metadata() : {},
    ));
    const smallestId: number = ActorQueryOperationBgpLeftDeepSmallest.getSmallestPatternId(metadatas);

    this.logDebug(context,
      'Smallest pattern: ',
      () => ({ pattern: pattern.patterns[smallestId], metadata: metadatas[smallestId] }));

    // Close the non-smallest streams
    for (const [ i, element ] of patternOutputs.entries()) {
      if (i !== smallestId) {
        element.bindingsStream.close();
      }
    }

    // Take the pattern with the smallest number of items
    const smallestPattern: IActorQueryOperationOutputBindings = patternOutputs.slice(smallestId)[0];
    const remainingPatterns: Algebra.Pattern[] = [ ...pattern.patterns ];
    remainingPatterns.splice(smallestId, 1);
    const remainingMetadatas: Record<string, any>[] = [ ...metadatas ];
    remainingMetadatas.splice(smallestId, 1);

    // Check if the output type is correct
    ActorQueryOperation.validateQueryOutput(smallestPattern, 'bindings');

    // Materialize the remaining patterns for each binding in the stream.
    const subContext = context && context
      .set(KeysQueryOperation.bgpCurrentMetadata, metadatas[smallestId])
      .set(KeysQueryOperation.bgpParentMetadata, remainingMetadatas);
    const bindingsStream: BindingsStream = ActorQueryOperationBgpLeftDeepSmallest.createLeftDeepStream(
      smallestPattern.bindingsStream,
      remainingPatterns,
      async(patterns: { pattern: Algebra.Pattern; bindings: PatternBindings }[]) => {
        // Send the materialized patterns to the mediator for recursive BGP evaluation.
        const operation: Algebra.Bgp = { type: 'bgp', patterns: patterns.map(pat => pat.pattern) };
        const bindings = patterns.map(pat => pat.bindings);
        return ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation.mediate(
          { operation, context: subContext.set(KeysQueryOperation.bgpPatternBindings, bindings) },
        )).bindingsStream;
      },
    );

    // Prepare variables and metadata
    const variables: string[] = ActorQueryOperationBgpLeftDeepSmallest.getCombinedVariables(patternOutputs);
    const metadata = (): Promise<Record<string, any>> => Promise.resolve({
      totalItems: ActorQueryOperationBgpLeftDeepSmallest.estimateCombinedTotalItems(metadatas[smallestId],
        metadatas.slice(smallestId)),
    });

    return { type: 'bindings', bindingsStream, variables, metadata, canContainUndefs: false };
  }
}
