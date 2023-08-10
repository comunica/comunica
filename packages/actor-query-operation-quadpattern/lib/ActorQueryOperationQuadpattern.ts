import { BindingsFactory } from '@comunica/bindings-factory';
import { MediatorMergeBindingFactory } from '@comunica/bus-merge-binding-factory';
import type { IActionQueryOperation } from '@comunica/bus-query-operation';
import { ActorQueryOperationTyped, ClosableTransformIterator } from '@comunica/bus-query-operation';
import type { MediatorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { IActorArgs, IActorTest } from '@comunica/core';
import type { BindingsStream,
  IQueryOperationResult,
  IActionContext, MetadataBindings,
  MetadataQuads, TermsOrder } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { termToString } from 'rdf-string';
import type { QuadTermName } from 'rdf-terms';
import { forEachTermsNested,
  getTermsNested,
  getValueNestedPath,
  reduceTermsNested,
  uniqTerms } from 'rdf-terms';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';

const DF = new DataFactory();
const AF = new Factory();

/**
 * A comunica actor for handling 'quadpattern' query operations.
 */
export class ActorQueryOperationQuadpattern extends ActorQueryOperationTyped<Algebra.Pattern>
  implements IActorQueryOperationQuadpatternArgs {
  public readonly mediatorResolveQuadPattern: MediatorRdfResolveQuadPattern;
  public readonly mediatorMergeHandlers: MediatorMergeBindingFactory;
  public readonly unionDefaultGraph: boolean;


  public constructor(args: IActorQueryOperationQuadpatternArgs) {
    super(args, 'pattern');
  }

  /**
   * Check if a term is a variable.
   * @param {RDF.Term} term An RDF term.
   * @return {any} If the term is a variable or blank node.
   */
  public static isTermVariable(term: RDF.Term): term is RDF.Variable {
    return term.termType === 'Variable';
  }

  /**
   * Get all variables in the given pattern.
   * No duplicates are returned.
   * @param {RDF.BaseQuad} pattern A quad pattern.
   */
  public static getVariables(pattern: RDF.BaseQuad): RDF.Variable[] {
    return uniqTerms(getTermsNested(pattern)
      .filter(ActorQueryOperationQuadpattern.isTermVariable));
  }

  /**
   * A helper function to find a hash with quad elements that have duplicate variables.
   *
   * @param {RDF.Quad} pattern A quad pattern.
   *
   * @return {{[p: string]: string[]}} If no equal variable names are present in the four terms, this returns undefined.
   *                                   Otherwise, this maps quad elements paths (['subject'], ['predicate'], ['object'],
   *                                   ['graph'])
   *                                   to the list of quad elements it shares a variable name with.
   *                                   For quoted triples, paths such as ['subject', 'object'] may occur.
   *                                   If no links for a certain element exist, this element will
   *                                   not be included in the hash.
   *                                   Note 1: Quad elements will never have a link to themselves.
   *                                           So this can never occur: { subject: [[ 'subject']] },
   *                                           instead 'null' would be returned.
   *                                   Note 2: Links only exist in one direction,
   *                                           this means that { subject: [[ 'predicate']], predicate: [[ 'subject' ]] }
   *                                           will not occur, instead only { subject: [[ 'predicate']] }
   *                                           will be returned.
   *                                   Note 3: Keys can also be paths, but they are delimited by '_', such as:
   *                                           { subject_object_subject: [[ 'predicate']] }
   */
  public static getDuplicateElementLinks(pattern: RDF.BaseQuad): Record<string, QuadTermName[][]> | undefined {
    // Collect a variable to quad elements mapping.
    const variableElements: Record<string, QuadTermName[][]> = {};
    let duplicateVariables = false;
    forEachTermsNested(pattern, (value, keys) => {
      if (value.termType === 'Variable') {
        const val = termToString(value);
        const length = (variableElements[val] || (variableElements[val] = [])).push(keys);
        duplicateVariables = duplicateVariables || length > 1;
      }
    });

    if (!duplicateVariables) {
      return;
    }

    // Collect quad element to elements with equal variables mapping.
    const duplicateElementLinks: Record<string, QuadTermName[][]> = {};
    for (const variable in variableElements) {
      const elements = variableElements[variable];
      const remainingElements = elements.slice(1);
      // Only store the elements that have at least one equal element.
      if (remainingElements.length > 0) {
        duplicateElementLinks[elements[0].join('_')] = remainingElements;
      }
    }

    return duplicateElementLinks;
  }

  /**
   * Ensure that the given raw metadata object contains all required metadata entries.
   * @param metadataRaw A raw metadata object.
   */
  public static validateMetadata(metadataRaw: Record<string, any>): MetadataQuads {
    for (const key of [ 'cardinality', 'canContainUndefs' ]) {
      if (!(key in metadataRaw)) {
        throw new Error(`Invalid metadata: missing ${key} in ${JSON.stringify(metadataRaw)}`);
      }
    }
    return <MetadataQuads> metadataRaw;
  }

  /**
   * Get the metadata of the given action on a quad stream.
   *
   * @param {AsyncIterator<Quad>} data The data stream that is guaranteed to emit the metadata property.
   * @param elementVariables Mapping of quad term name to variable name.
   * @param variables Variables to include in the metadata
   * @return {() => Promise<{[p: string]: any}>} A lazy promise behind a callback resolving to a metadata object.
   */
  protected static getMetadata(
    data: AsyncIterator<RDF.Quad>,
    elementVariables: Record<string, string>,
    variables: RDF.Variable[],
  ): () => Promise<MetadataBindings> {
    return () => new Promise<Record<string, any>>((resolve, reject) => {
      data.getProperty('metadata', (metadata: Record<string, any>) => resolve(metadata));
      data.on('error', reject);
    }).then(metadataRaw => {
      if (!('canContainUndefs' in metadataRaw)) {
        metadataRaw.canContainUndefs = false;
      }
      return ActorQueryOperationQuadpattern.quadsMetadataToBindingsMetadata(
        ActorQueryOperationQuadpattern.validateMetadata(metadataRaw),
        elementVariables,
        variables,
      );
    });
  }

  protected static quadsMetadataToBindingsMetadata(
    metadataQuads: MetadataQuads,
    elementVariables: Record<string, string>,
    variables: RDF.Variable[],
  ): MetadataBindings {
    return {
      ...metadataQuads,
      order: metadataQuads.order ?
        ActorQueryOperationQuadpattern.quadsOrderToBindingsOrder(metadataQuads.order, elementVariables) :
        undefined,
      availableOrders: metadataQuads.availableOrders ?
        metadataQuads.availableOrders.map(orderDef => ({
          cost: orderDef.cost,
          terms: ActorQueryOperationQuadpattern.quadsOrderToBindingsOrder(orderDef.terms, elementVariables),
        })) :
        undefined,
      variables,
    };
  }

  protected static quadsOrderToBindingsOrder(
    quadsOrder: TermsOrder<RDF.QuadTermName>,
    elementVariables: Record<string, string>,
  ): TermsOrder<RDF.Variable> {
    const mappedVariables: Record<string, boolean> = {};
    return <TermsOrder<RDF.Variable>> quadsOrder.map(entry => {
      // Omit entries that do not map to a variable
      const variableName = elementVariables[entry.term];
      if (!variableName) {
        return;
      }

      // Omit entries that have been mapped already
      if (mappedVariables[variableName]) {
        return;
      }

      mappedVariables[variableName] = true;
      return {
        term: DF.variable(variableName),
        direction: entry.direction,
      };
    }).filter(entry => Boolean(entry));
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

    // Modify pattern with default graph when using union default graph semantics
    let patternInner = pattern;
    const unionDefaultGraph = this.unionDefaultGraph || context.get(KeysQueryOperation.unionDefaultGraph);
    if (pattern.graph.termType === 'DefaultGraph' && unionDefaultGraph) {
      patternInner = AF.createPattern(
        pattern.subject,
        pattern.predicate,
        pattern.object,
        DF.variable('__comunica:defaultGraph'),
      );
    }

    // Resolve the quad pattern
    const result = await this.mediatorResolveQuadPattern.mediate({ pattern: patternInner, context });

    // Collect all variables from the pattern
    const variables = ActorQueryOperationQuadpattern.getVariables(pattern);

    // Convenience datastructure for mapping quad elements to variables
    const elementVariables: Record<string, string> = reduceTermsNested(pattern,
      (acc: Record<string, string>, term: RDF.Term, keys: QuadTermName[]) => {
        if (term.termType === 'Variable') {
          acc[keys.join('_')] = term.value;
        }
        return acc;
      },
      {});

    // Create the metadata callback
    const metadata = ActorQueryOperationQuadpattern.getMetadata(result.data, elementVariables, variables);

    // Optionally filter, and construct bindings
    const bindingsStream: BindingsStream = new ClosableTransformIterator(async() => {
      let filteredOutput = result.data;

      // Detect duplicate variables in the pattern
      const duplicateElementLinks: Record<string, QuadTermName[][]> | undefined = ActorQueryOperationQuadpattern
        .getDuplicateElementLinks(pattern);

      // SPARQL query semantics allow graph variables to only match with named graphs, excluding the default graph
      // But this is not the case when using union default graph semantics
      if (pattern.graph.termType === 'Variable' && !unionDefaultGraph) {
        filteredOutput = filteredOutput.filter(quad => quad.graph.termType !== 'DefaultGraph');
      }

      // If there are duplicate variables in the search pattern,
      // make sure that we filter out the triples that don't have equal values for those triple elements,
      // as the rdf-resolve-quad-pattern bus ignores variable names.
      if (duplicateElementLinks) {
        filteredOutput = filteredOutput.filter(quad => {
          for (const keyLeft in duplicateElementLinks) {
            const keysLeft: QuadTermName[] = <QuadTermName[]> keyLeft.split('_');
            const valueLeft = getValueNestedPath(quad, keysLeft);
            for (const keysRight of duplicateElementLinks[keyLeft]) {
              if (!valueLeft.equals(getValueNestedPath(quad, keysRight))) {
                return false;
              }
            }
          }
          return true;
        });
      }
      const BF = new BindingsFactory(undefined, (await this.mediatorMergeHandlers.mediate({context: context})).mergeHandlers);
      return filteredOutput.map(quad => BF.bindings(Object.keys(elementVariables).map(key => {
        const keys: QuadTermName[] = <any>key.split('_');
        const variable = elementVariables[key];
        const term = getValueNestedPath(quad, keys);
        return [ DF.variable(variable), term ];
      })));
    }, {
      autoStart: false,
      onClose: () => result.data.destroy(),
    });

    return { type: 'bindings', bindingsStream, metadata };
  }
}

export interface IActorQueryOperationQuadpatternArgs extends
  IActorArgs<IActionQueryOperation, IActorTest, IQueryOperationResult> {
  /**
   * The quad pattern resolve mediator
   */
  mediatorResolveQuadPattern: MediatorRdfResolveQuadPattern;
  /**
   * If the default graph should also contain the union of all named graphs.
   * This can be overridden by {@link KeysQueryOperation#unionDefaultGraph}.
   * @default {false}
   */
  unionDefaultGraph: boolean;
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeHandlers: MediatorMergeBindingFactory;
}
