import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionQueryOperation } from '@comunica/bus-query-operation';
import { ActorQueryOperationTyped } from '@comunica/bus-query-operation';
import type { MediatorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import type { IActorArgs, IActorTest } from '@comunica/core';
import type {
  BindingsStream,
  IQueryOperationResult,
  IMetadata,
  IActionContext,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { TransformIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { QuadTermName } from 'rdf-terms';
import { getTerms, QUAD_TERM_NAMES, reduceTerms, TRIPLE_TERM_NAMES, uniqTerms } from 'rdf-terms';
import type { Algebra } from 'sparqlalgebrajs';

const BF = new BindingsFactory();
const DF = new DataFactory();

/**
 * A comunica actor for handling 'quadpattern' query operations.
 */
export class ActorQueryOperationQuadpattern extends ActorQueryOperationTyped<Algebra.Pattern>
  implements IActorQueryOperationQuadpatternArgs {
  public readonly mediatorResolveQuadPattern: MediatorRdfResolveQuadPattern;

  public constructor(args: IActorQueryOperationQuadpatternArgs) {
    super(args, 'pattern');
  }

  /**
   * Check if a term is a variable.
   * @param {RDF.Term} term An RDF term.
   * @return {any} If the term is a variable or blank node.
   */
  public static isTermVariable(term: RDF.Term): any {
    return term.termType === 'Variable';
  }

  /**
   * Get all variables in the given pattern.
   * No duplicates are returned.
   * @param {RDF.BaseQuad} pattern A quad pattern.
   */
  public static getVariables(pattern: RDF.BaseQuad): RDF.Variable[] {
    return <RDF.Variable[]> uniqTerms(getTerms(pattern)
      .filter(ActorQueryOperationQuadpattern.isTermVariable));
  }

  /**
   * A helper function to find a hash with quad elements that have duplicate variables.
   *
   * @param {RDF.Quad} pattern A quad pattern.
   *
   * @return {{[p: string]: string[]}} If no equal variable names are present in the four terms, this returns undefined.
   *                                   Otherwise, this maps quad elements ('subject', 'predicate', 'object', 'graph')
   *                                   to the list of quad elements it shares a variable name with.
   *                                   If no links for a certain element exist, this element will
   *                                   not be included in the hash.
   *                                   Note 1: Quad elements will never have a link to themselves.
   *                                           So this can never occur: { subject: [ 'subject'] },
   *                                           instead 'null' would be returned.
   *                                   Note 2: Links only exist in one direction,
   *                                           this means that { subject: [ 'predicate'], predicate: [ 'subject' ] }
   *                                           will not occur, instead only { subject: [ 'predicate'] }
   *                                           will be returned.
   */
  public static getDuplicateElementLinks(pattern: RDF.BaseQuad): Record<string, string[]> | undefined {
    // Collect a variable to quad elements mapping.
    const variableElements: Record<string, string[]> = {};
    let duplicateVariables = false;
    for (const key of QUAD_TERM_NAMES) {
      if (pattern[key].termType === 'Variable') {
        const val = pattern[key].value;
        const length = (variableElements[val] || (variableElements[val] = [])).push(key);
        duplicateVariables = duplicateVariables || length > 1;
      }
    }

    if (!duplicateVariables) {
      return;
    }

    // Collect quad element to elements with equal variables mapping.
    const duplicateElementLinks: Record<string, string[]> = {};
    for (const variable in variableElements) {
      const elements = variableElements[variable];
      const remainingElements = elements.slice(1);
      // Only store the elements that have at least one equal element.
      if (remainingElements.length > 0) {
        duplicateElementLinks[elements[0]] = remainingElements;
      }
    }

    return duplicateElementLinks;
  }

  /**
   * Ensure that the given raw metadata object contains all required metadata entries.
   * @param metadataRaw A raw metadata object.
   */
  public static validateMetadata(metadataRaw: Record<string, any>): IMetadata {
    for (const key of [ 'cardinality', 'canContainUndefs' ]) {
      if (!(key in metadataRaw)) {
        throw new Error(`Invalid metadata: missing ${key} in ${JSON.stringify(metadataRaw)}`);
      }
    }
    return <IMetadata> metadataRaw;
  }

  /**
   * Get the metadata of the given action on a quad stream.
   *
   * @param {AsyncIterator<Quad>} data The data stream that is guaranteed to emit the metadata property.
   * @return {() => Promise<{[p: string]: any}>} A lazy promise behind a callback resolving to a metadata object.
   */
  protected static getMetadata(data: AsyncIterator<RDF.Quad>): () => Promise<IMetadata> {
    return () => new Promise<Record<string, any>>((resolve, reject) => {
      data.getProperty('metadata', (metadata: Record<string, any>) => resolve(metadata));
      data.on('error', reject);
    }).then(metadataRaw => {
      if (!('canContainUndefs' in metadataRaw)) {
        metadataRaw.canContainUndefs = false;
      }
      return ActorQueryOperationQuadpattern.validateMetadata(metadataRaw);
    });
  }

  public async testOperation(operation: Algebra.Pattern, context: IActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Pattern, context: IActionContext):
  Promise<IQueryOperationResult> {
    // Apply the (optional) pattern-specific context
    if (pattern.context) {
      context = context.merge(pattern.context);
    }

    // Resolve the quad pattern
    const result = await this.mediatorResolveQuadPattern.mediate({ pattern, context });

    // Collect all variables from the pattern
    const variables = ActorQueryOperationQuadpattern.getVariables(pattern);

    // Create the metadata callback
    const metadata = ActorQueryOperationQuadpattern.getMetadata(result.data);

    // Convenience datastructure for mapping quad elements to variables
    const elementVariables: Record<string, string> = reduceTerms(pattern,
      (acc: Record<string, string>, term: RDF.Term, key: QuadTermName) => {
        if (term.termType === 'Variable') {
          acc[key] = term.value;
        }
        return acc;
      },
      {});
    const quadBindingsReducer = (acc: [RDF.Variable, RDF.Term][], term: RDF.Term, key: QuadTermName):
    [RDF.Variable, RDF.Term][] => {
      const variable: string = elementVariables[key];
      if (variable) {
        acc.push([ DF.variable(variable), term ]);
      }
      return acc;
    };

    // Optionally filter, and construct bindings
    const bindingsStream: BindingsStream = new TransformIterator(async() => {
      let filteredOutput = result.data;

      // Detect duplicate variables in the pattern
      const duplicateElementLinks: Record<string, string[]> | undefined = ActorQueryOperationQuadpattern
        .getDuplicateElementLinks(pattern);

      // If there are duplicate variables in the search pattern,
      // make sure that we filter out the triples that don't have equal values for those triple elements,
      // as QPF ignores variable names.
      if (duplicateElementLinks) {
        filteredOutput = filteredOutput.filter(quad => {
          // No need to check the graph, because an equal element already would have to be found in s, p, or o.
          for (const element1 of TRIPLE_TERM_NAMES) {
            for (const element2 of duplicateElementLinks[element1] || []) {
              if (!(<any> quad)[element1].equals((<any> quad)[element2])) {
                return false;
              }
            }
          }
          return true;
        });
      }

      return filteredOutput.map(quad => BF.bindings(reduceTerms(quad, quadBindingsReducer, [])));
    }, { autoStart: false });

    return { type: 'bindings', bindingsStream, variables, metadata };
  }
}

export interface IActorQueryOperationQuadpatternArgs extends
  IActorArgs<IActionQueryOperation, IActorTest, IQueryOperationResult> {
  /**
   * The quad pattern resolve mediator
   */
  mediatorResolveQuadPattern: MediatorRdfResolveQuadPattern;
}
