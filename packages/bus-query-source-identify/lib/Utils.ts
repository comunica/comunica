import type { BindingsFactory } from '@comunica/bindings-factory';
import { ClosableTransformIterator } from '@comunica/bus-query-operation';
import { validateMetadataQuads } from '@comunica/metadata';
import type { BindingsStream, ComunicaDataFactory, MetadataBindings, MetadataQuads, TermsOrder } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { termToString } from 'rdf-string';
import type { QuadTermName } from 'rdf-terms';
import {
  forEachTermsNested,
  getTermsNested,
  getValueNestedPath,
  reduceTermsNested,
  someTerms,
  uniqTerms,
} from 'rdf-terms';
import { matchPatternMappings } from 'rdf-terms/lib/QuadTermUtil';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * Convert an iterator of quads to an iterator of bindings.
 * @param quads The quads to convert.
 * @param pattern The pattern to get variables from to determine bindings.
 *                All quads are also assumed to match the pattern.
 * @param dataFactory The data factory.
 * @param bindingsFactory The factory for creating bindings.
 * @param unionDefaultGraph If union default graph mode is enabled.
 *                          If true, variable graphs will match all graphs, including the default graph.
 *                          If false, variable graphs will only match named graphs, and not the default graph.
 */
export function quadsToBindings(
  quads: AsyncIterator<RDF.Quad>,
  pattern: Algebra.Pattern,
  dataFactory: ComunicaDataFactory,
  bindingsFactory: BindingsFactory,
  unionDefaultGraph: boolean,
): BindingsStream {
  const variables = getVariables(pattern);

  // If non-default-graph triples need to be filtered out
  const filterNonDefaultQuads = pattern.graph.termType === 'Variable' && !unionDefaultGraph;

  // Detect duplicate variables in the pattern
  const duplicateElementLinks: Record<string, QuadTermName[][]> | undefined = getDuplicateElementLinks(pattern);

  // Convenience datastructure for mapping quad elements to variables
  const elementVariables: Record<string, string> = reduceTermsNested(
    pattern,
    (acc: Record<string, string>, term: RDF.Term, keys: QuadTermName[]) => {
      if (term.termType === 'Variable') {
        acc[keys.join('_')] = term.value;
      }
      return acc;
    },
    {},
  );

  // Optionally filter, and construct bindings
  const it = new ClosableTransformIterator(async() => {
    let filteredOutput = quads;

    // SPARQL query semantics allow graph variables to only match with named graphs, excluding the default graph
    // But this is not the case when using union default graph semantics
    if (filterNonDefaultQuads) {
      filteredOutput = filteredOutput.filter(quad => quad.graph.termType !== 'DefaultGraph');
    }

    // If there are duplicate variables in the search pattern,
    // make sure that we filter out the triples that don't have equal values for those triple elements,
    // as the rdf-resolve-quad-pattern bus ignores variable names.
    if (duplicateElementLinks) {
      filteredOutput = filteredOutput.filter((quad) => {
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

    return filteredOutput.map<RDF.Bindings>(quad => bindingsFactory
      .bindings(Object.keys(elementVariables).map((key) => {
        const keys: QuadTermName[] = <any>key.split('_');
        const variable = elementVariables[key];
        const term = getValueNestedPath(quad, keys);
        return [ dataFactory.variable(variable), term ];
      })));
  }, {
    autoStart: false,
    onClose: () => quads.destroy(),
  });

  // Set the metadata property
  setMetadata(
    dataFactory,
    it,
    quads,
    elementVariables,
    variables,
    filterNonDefaultQuads || Boolean(duplicateElementLinks),
  );

  return it;
}

/**
 * Check if a term is a variable.
 * @param {RDF.Term} term An RDF term.
 * @return {any} If the term is a variable or blank node.
 */
export function isTermVariable(term: RDF.Term): term is RDF.Variable {
  return term.termType === 'Variable';
}

/**
 * Get all variables in the given pattern.
 * No duplicates are returned.
 * @param {RDF.BaseQuad} pattern A quad pattern.
 */
export function getVariables(pattern: RDF.BaseQuad): RDF.Variable[] {
  return uniqTerms(getTermsNested(pattern).filter(isTermVariable));
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
export function getDuplicateElementLinks(pattern: RDF.BaseQuad): Record<string, QuadTermName[][]> | undefined {
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
 * Set the metadata of the bindings stream derived from the metadata of the quads stream.
 * @param dataFactory The data factory.
 * @param {BindingsStream} bindings The bindings stream that will receive the metadata property.
 * @param {AsyncIterator<Quad>} quads The quads stream that is guaranteed to emit the metadata property.
 * @param elementVariables Mapping of quad term name to variable name.
 * @param variables Variables to include in the metadata
 * @param forceEstimateCardinality Set the cardinality to estimate
 * @return {() => Promise<{[p: string]: any}>} A lazy promise behind a callback resolving to a metadata object.
 */
export function setMetadata(
  dataFactory: ComunicaDataFactory,
  bindings: BindingsStream,
  quads: AsyncIterator<RDF.Quad>,
  elementVariables: Record<string, string>,
  variables: RDF.Variable[],
  forceEstimateCardinality: boolean,
): void {
  const getMetadataCb = (metadataRaw: Record<string, any>): void => {
    if (!('canContainUndefs' in metadataRaw)) {
      metadataRaw.canContainUndefs = false;
    }
    if (forceEstimateCardinality) {
      metadataRaw.cardinality.type = 'estimate';
    }
    bindings.setProperty(
      'metadata',
      quadsMetadataToBindingsMetadata(dataFactory, validateMetadataQuads(metadataRaw), elementVariables, variables),
    );

    // Propagate metadata invalidations
    if (metadataRaw.state) {
      metadataRaw.state.addInvalidateListener(() => {
        setMetadata(dataFactory, bindings, quads, elementVariables, variables, forceEstimateCardinality);
      });
    }
  };

  const metadata = quads.getProperty('metadata');
  if (metadata) {
    // This is to enforce sync metadata setting, because AsyncIterator will always call it async,
    // even if the property was already defined.
    getMetadataCb(metadata);
  } else {
    quads.getProperty('metadata', getMetadataCb);
  }
}

/**
 * Convert the metadata of quads to the metadata of bindings.
 * @param dataFactory The data factory.
 * @param metadataQuads Quads metadata.
 * @param elementVariables A mapping from quad elements to variables.
 * @param variables The variables in the bindings.
 */
export function quadsMetadataToBindingsMetadata(
  dataFactory: ComunicaDataFactory,
  metadataQuads: MetadataQuads,
  elementVariables: Record<string, string>,
  variables: RDF.Variable[],
): MetadataBindings {
  return {
    ...metadataQuads,
    canContainUndefs: false,
    order: metadataQuads.order ?
      quadsOrderToBindingsOrder(dataFactory, metadataQuads.order, elementVariables) :
      undefined,
    availableOrders: metadataQuads.availableOrders ?
      metadataQuads.availableOrders.map(orderDef => ({
        cost: orderDef.cost,
        terms: quadsOrderToBindingsOrder(dataFactory, orderDef.terms, elementVariables),
      })) :
      undefined,
    variables,
  };
}

/**
 * Convert the quads order metadata element to a bindings order metadata element.
 * @param dataFactory The data factory.
 * @param quadsOrder Quads order.
 * @param elementVariables A mapping from quad elements to variables.
 */
export function quadsOrderToBindingsOrder(
  dataFactory: ComunicaDataFactory,
  quadsOrder: TermsOrder<RDF.QuadTermName>,
  elementVariables: Record<string, string>,
): TermsOrder<RDF.Variable> {
  const mappedVariables: Record<string, boolean> = {};
  return <TermsOrder<RDF.Variable>> quadsOrder.map((entry) => {
    // Omit entries that do not map to a variable
    const variableName = elementVariables[entry.term];
    if (!variableName) {
      // eslint-disable-next-line array-callback-return
      return;
    }

    // Omit entries that have been mapped already
    if (mappedVariables[variableName]) {
      // eslint-disable-next-line array-callback-return
      return;
    }

    mappedVariables[variableName] = true;
    return {
      term: dataFactory.variable(variableName),
      direction: entry.direction,
    };
  }).filter(Boolean);
}

/**
 * Perform post-match-filtering if the source does not support quoted triple filtering,
 * but we have a variable inside a quoted triple.
 * @param pattern The current quad pattern operation.
 * @param it The iterator to filter.
 */
export function filterMatchingQuotedQuads(pattern: RDF.BaseQuad, it: AsyncIterator<RDF.Quad>): AsyncIterator<RDF.Quad> {
  if (someTerms(pattern, term => term.termType === 'Quad')) {
    it = it.filter(quad => matchPatternMappings(quad, pattern));
  }
  return it;
}
