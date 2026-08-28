import type * as RDF from '@rdfjs/types';
import type { ITermHash } from 'rdf-isomorphic';
import { getGraphBlankNodes, getQuadsWithBlankNodes, hashTerms, isomorphic, uniqGraph } from 'rdf-isomorphic';
import { quadToStringQuad } from 'rdf-string';
import { everyTerms, someTerms } from 'rdf-terms';

function quadArrayToString(quads: RDF.BaseQuad[]): string {
  return `[\n${quads.map(quad => `  ${JSON.stringify(quadToStringQuad(quad))}`).join(',\n')}\n]`;
}

/**
 * Determines the quads of the first array that are absent from the second, ignoring anything with blank nodes.
 *
 * Quads containing blank nodes are excluded because their labels are not stable across graphs,
 * so their absence is reported through the blank node patterns instead.
 * @param left - The quads to look for.
 * @param right - The quads to look in.
 * @returns The blank-node-free quads of `left` that do not occur in `right`.
 */
function getNonBlankDiff<Q extends RDF.BaseQuad>(left: Q[], right: Q[]): Q[] {
  return left.filter(quad => everyTerms(quad, term => term.termType !== 'BlankNode') &&
    right.every(other => !other.equals(quad)));
}

/**
 * Determines the hash keys of the first hash object whose signature does not occur in the second.
 * @param left - The term hashes to look for.
 * @param right - The term hashes to look in.
 * @returns The keys of `left` without a counterpart in `right`.
 */
function getDiff(left: ITermHash, right: ITermHash): string[] {
  const signatures = new Set(Object.values(right));
  return Object.keys(left).filter(key => !signatures.has(left[key]));
}

/**
 * Hashes every blank node of a graph based on the signature of the quads it appears in.
 * @param graph - The quads to hash the blank nodes of.
 * @returns The ungrounded hashes of the graph's blank nodes.
 */
function unGroundHashes<Q extends RDF.BaseQuad>(graph: Q[]): ITermHash {
  return hashTerms(uniqGraph(getQuadsWithBlankNodes(graph)), getGraphBlankNodes(graph), {})[1];
}

/**
 * Determines which blank node patterns occur in one graph but not the other.
 * @param received - The quads that were received.
 * @param expected - The quads that were expected.
 * @returns The quads behind the blank nodes that only occur in one of both graphs.
 */
function getBnodeDiff<Q extends RDF.BaseQuad>(received: Q[], expected: Q[]): {
  received: Record<string, Q[]>;
  expected: Record<string, Q[]>;
} {
  const hashesReceived = unGroundHashes(received);
  const hashesExpected = unGroundHashes(expected);
  const blankReceived = uniqGraph(getQuadsWithBlankNodes(received));
  const blankExpected = uniqGraph(getQuadsWithBlankNodes(expected));

  const quadsFor = (blank: string, quads: Q[]): Q[] => quads
    .filter(quad => someTerms(quad, term => term.termType === 'BlankNode' && term.value === blank.slice(2)));

  return {
    received: Object.fromEntries(getDiff(hashesReceived, hashesExpected)
      .map(blank => [ blank, quadsFor(blank, blankReceived) ])),
    expected: Object.fromEntries(getDiff(hashesExpected, hashesReceived)
      .map(blank => [ blank, quadsFor(blank, blankExpected) ])),
  };
}

function blankPatternsToString<Q extends RDF.BaseQuad>(patterns: Record<string, Q[]>): string {
  return Object.entries(patterns).map(([ blank, quads ]) => `${blank} : ${quadArrayToString(quads)}`).join('\n');
}

export default {
  toBeRdfIsomorphic<Q extends RDF.BaseQuad>(received: Iterable<Q>, actual: Iterable<Q>) {
    const receivedArray = [ ...received ];
    const actualArray = [ ...actual ];

    if (!isomorphic(receivedArray, actualArray)) {
      const { received: receivedBnodes, expected: actualBnodes } = getBnodeDiff(receivedArray, actualArray);
      return {
        message: () => `expected two graphs to be isomorphic.

  Expected:
${quadArrayToString(actualArray)}

  Actual:
${quadArrayToString(receivedArray)}

Missing Quads (that don't contain Blank Nodes):
${quadArrayToString(getNonBlankDiff(actualArray, receivedArray))}

Additional Quads (that don't contain Blank Nodes):
${quadArrayToString(getNonBlankDiff(receivedArray, actualArray))}

Missing Blank Node Patterns:
${blankPatternsToString(actualBnodes)}

Additional Blank Node Patterns:
${blankPatternsToString(receivedBnodes)}
`,
        pass: false,
      };
    }

    return {
      message: () => `expected two graphs not to be isomorphic.

  Expected:
${quadArrayToString(actualArray)}

  Actual:
${quadArrayToString(receivedArray)}
`,
      pass: true,
    };
  },
};
