import {IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternOutput,
  ILazyQuadSource} from "@comunica/bus-rdf-resolve-quad-pattern";
import {Actor, IActorTest, Mediator} from "@comunica/core";
import {AsyncIterator, EmptyIterator} from "asynciterator";
import {PromiseProxyIterator} from "asynciterator-promiseproxy";
import {RoundRobinUnionIterator} from "asynciterator-union";
import {blankNode, quad} from "rdf-data-model";
import * as RDF from "rdf-js";
import {IQuerySource} from "./ActorRdfResolveQuadPatternFederated";

/**
 * A FederatedQuadSource can evaluate quad pattern queries over the union of different heterogeneous sources.
 * It will call the given mediator to evaluate each quad pattern query separately.
 */
export class FederatedQuadSource implements ILazyQuadSource {

  protected readonly mediatorResolveQuadPattern: Mediator<Actor<IActionRdfResolveQuadPattern, IActorTest,
    IActorRdfResolveQuadPatternOutput>, IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>;
  protected readonly sources: IQuerySource[];
  protected readonly contextDefault: {[id: string]: any};
  protected readonly emptyPatterns: {[sourceHash: string]: RDF.Quad[]};
  protected readonly skipEmptyPatterns: boolean;

  constructor(mediatorResolveQuadPattern: Mediator<Actor<IActionRdfResolveQuadPattern, IActorTest,
    IActorRdfResolveQuadPatternOutput>, IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>,
              context: {[id: string]: any}, emptyPatterns: {[sourceHash: string]: RDF.Quad[]},
              skipEmptyPatterns: boolean) {
    this.mediatorResolveQuadPattern = mediatorResolveQuadPattern;
    this.sources = context.sources;
    this.contextDefault = require('lodash.omit')(context, ['sources']);
    this.emptyPatterns = emptyPatterns;
    this.skipEmptyPatterns = skipEmptyPatterns;

    // Initialize sources in the emptyPatterns datastructure
    if (this.skipEmptyPatterns) {
      for (const source of this.sources) {
        const sourceHash: string = FederatedQuadSource.hashSource(source);
        if (!this.emptyPatterns[sourceHash]) {
          this.emptyPatterns[sourceHash] = [];
        }
      }
    }
  }

  /**
   * Convert a {@link IQuerySource} to a string.
   * @param {IQuerySource} source A query source object.
   * @return {string} A string representation of this query source.
   */
  public static hashSource(source: IQuerySource): string {
    return JSON.stringify(source);
  }

  /**
   * Check if the given RDF term is not bound to an exact value.
   * I.e., if it is not a Variable or a BlankNode.
   * @param {RDF.Term} term An RDF term.
   * @return {boolean} If it is not bound.
   */
  public static isTermBound(term: RDF.Term) {
    return term.termType !== 'Variable' && term.termType !== 'BlankNode';
  }

  /**
   * Checks if the given (child) pattern is a more bound version of the given (parent) pattern.
   * This will also return true if the patterns are equal.
   * @param {RDF.Quad} child A child pattern.
   * @param {RDF.Quad} parent A parent pattern.
   * @return {boolean} If child is a sub-pattern of parent
   */
  public static isSubPatternOf(child: RDF.Quad, parent: RDF.Quad): boolean {
    return (!FederatedQuadSource.isTermBound(parent.subject) || parent.subject.equals(child.subject))
      && (!FederatedQuadSource.isTermBound(parent.predicate) || parent.predicate.equals(child.predicate))
      && (!FederatedQuadSource.isTermBound(parent.object) || parent.object.equals(child.object))
      && (!FederatedQuadSource.isTermBound(parent.graph) || parent.graph.equals(child.graph));
  }

  /**
   * If the given source is guaranteed to produce an empty result for the given pattern.
   *
   * This prediction is done based on the 'emptyPatterns' datastructure that is stored within this actor.
   * Every time an empty pattern is passed, this pattern is stored in this datastructure for this source.
   * If this pattern (or a more bound pattern) is queried, we know for certain that it will be empty again.
   * This is under the assumption that sources will remain static during query evaluation.
   *
   * @param {IQuerySource} source
   * @param {RDF.Quad} pattern
   * @return {boolean}
   */
  public isSourceEmpty(source: IQuerySource, pattern: RDF.Quad) {
    if (!this.skipEmptyPatterns) {
      return false;
    }
    const emptyPatterns: RDF.Quad[] = this.emptyPatterns[FederatedQuadSource.hashSource(source)];
    if (emptyPatterns) {
      for (const emptyPattern of emptyPatterns) {
        if (FederatedQuadSource.isSubPatternOf(pattern, emptyPattern)) {
          return true;
        }
      }
    }
    return false;
  }

  public matchLazy(subject?: RegExp | RDF.Term,
                   predicate?: RegExp | RDF.Term,
                   object?: RegExp | RDF.Term,
                   graph?: RegExp | RDF.Term): AsyncIterator<RDF.Quad> & RDF.Stream {
    if (subject instanceof RegExp
      || predicate instanceof RegExp
      || object instanceof RegExp
      || graph instanceof RegExp) {
      throw new Error("FederatedQuadSource does not support matching by regular expressions.");
    }

    // Counters for our metadata
    const metadata: {[id: string]: any} = { totalItems: 0 };
    let remainingSources: number = this.sources.length;

    const it: RoundRobinUnionIterator<RDF.Quad> = new RoundRobinUnionIterator(this.sources.map((source) => {
      // If we can predict that the given source will have no bindings for the given pattern,
      // return an empty iterator.
      const pattern: RDF.Quad = quad(subject || blankNode(), predicate || blankNode(), object || blankNode(),
        graph || blankNode());

      // Anonymous function to handle totalItems from metadata
      const checkEmitMetadata = (currentTotalItems: number) => {
        if (this.skipEmptyPatterns && !currentTotalItems) {
          // Because another call may have added more information in the meantime
          if (!this.isSourceEmpty(source, pattern)) {
            this.emptyPatterns[FederatedQuadSource.hashSource(source)].push(pattern);
          }
        }
        if (!remainingSources) {
          it.emit('metadata', metadata);
        }
      };

      // Prepare the context for this specific source
      const context: {[id: string]: any} = { sources: [{ type: source.type, value: source.value }]};
      Object.assign(context, this.contextDefault);

      return new PromiseProxyIterator(async () => {
        let output: IActorRdfResolveQuadPatternOutput;
        if (this.isSourceEmpty(source, pattern)) {
          output = { data: new EmptyIterator(), metadata: () => Promise.resolve({ totalItems: 0 }) };
        } else {
          output = await this.mediatorResolveQuadPattern.mediate({pattern, context});
        }
        if (output.metadata) {
          output.metadata().then((subMetadata: {[id: string]: any}) => {
            if ((!subMetadata.totalItems && subMetadata.totalItems !== 0) || !isFinite(subMetadata.totalItems)) {
              metadata.totalItems = Infinity;
              remainingSources = 0; // We're already at infinite, so ignore any later metadata
              checkEmitMetadata(Infinity);
            } else {
              metadata.totalItems += subMetadata.totalItems;
              remainingSources--;
              checkEmitMetadata(subMetadata.totalItems);
            }
          });
        } else {
          metadata.totalItems = Infinity;
          remainingSources = 0; // We're already at infinite, so ignore any later metadata
          checkEmitMetadata(Infinity);
        }

        return output.data;
      });
    }));
    it.on('newListener', (eventName) => {
      if (eventName === 'metadata') {
        setImmediate(() => it._fillBuffer());
      }
    });

    // If we have 0 sources, immediately emit metadata
    if (!remainingSources) {
      setImmediate(() => it.emit('metadata', metadata));
    }

    return it;
  }

  public match(subject?: RegExp | RDF.Term,
               predicate?: RegExp | RDF.Term,
               object?: RegExp | RDF.Term,
               graph?: RegExp | RDF.Term): RDF.Stream {
    return this.matchLazy(subject, predicate, object, graph);
  }
}
