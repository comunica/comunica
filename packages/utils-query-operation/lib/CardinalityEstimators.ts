import type { IDataset, QueryResultCardinality } from '@comunica/types';
import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';

// These are only used internally for estimates
const DF = new DataFactory<RDF.BaseQuad>();
const AF = new AlgebraFactory(DF);

/**
 * Estimate the cardinality of the provided operation using the specified dataset metadata.
 * This is the primary function that should be called to perform cardinality estimation.
 */
export async function estimateCardinality(
  operation: Algebra.Operation,
  dataset: IDataset,
): Promise<QueryResultCardinality> {
  const estimate = await dataset.getCardinality(operation);

  if (estimate) {
    return estimate;
  }

  switch (operation.type) {
    case Algebra.Types.ASK:
      return { type: 'exact', value: 1, dataset: dataset.uri };
    case Algebra.Types.LOAD:
    case Algebra.Types.DELETE_INSERT:
    case Algebra.Types.ADD:
    case Algebra.Types.COMPOSITE_UPDATE:
    case Algebra.Types.CLEAR:
    case Algebra.Types.NOP:
    case Algebra.Types.DROP:
    case Algebra.Types.CREATE:
    case Algebra.Types.MOVE:
    case Algebra.Types.COPY:
      return { type: 'exact', value: 0, dataset: dataset.uri };
    case Algebra.Types.PROJECT:
    case Algebra.Types.FILTER:
    case Algebra.Types.ORDER_BY:
    case Algebra.Types.GROUP:
    case Algebra.Types.CONSTRUCT:
    case Algebra.Types.DISTINCT:
    case Algebra.Types.REDUCED:
    case Algebra.Types.EXTEND:
    case Algebra.Types.FROM:
    case Algebra.Types.GRAPH:
      return estimateCardinality((<Algebra.Graph> operation).input, dataset);
    case Algebra.Types.ZERO_OR_ONE_PATH:
    case Algebra.Types.ZERO_OR_MORE_PATH:
    case Algebra.Types.ONE_OR_MORE_PATH:
    case Algebra.Types.INV:
      return estimateCardinality((<Algebra.Inv> operation).path, dataset);
    case Algebra.Types.PATH:
      return estimateCardinality((<Algebra.Path> operation).predicate, dataset);
    case Algebra.Types.NPS:
      return estimateNpsCardinality((<Algebra.Nps> operation), dataset);
    case Algebra.Types.LINK:
      return estimateCardinality(
        AF.createPattern(DF.variable('s'), (<Algebra.Link> operation).iri, DF.variable('o')),
        dataset,
      );
    case Algebra.Types.UNION:
    case Algebra.Types.SEQ:
    case Algebra.Types.ALT:
      return estimateUnionCardinality((<Algebra.Alt> operation).input, dataset);
    case Algebra.Types.BGP:
      return estimateJoinCardinality((<Algebra.Bgp> operation).patterns, dataset);
    case Algebra.Types.JOIN:
    case Algebra.Types.LEFT_JOIN:
      return estimateJoinCardinality((<Algebra.LeftJoin> operation).input, dataset);
    case Algebra.Types.SLICE:
      return estimateSliceCardinality((<Algebra.Slice> operation), dataset);
    case Algebra.Types.MINUS:
      return estimateMinusCardinality((<Algebra.Minus> operation), dataset);
    case Algebra.Types.VALUES:
      return { type: 'exact', value: (<Algebra.Values> operation).bindings.length, dataset: dataset.uri };
    case Algebra.Types.SERVICE:
    case Algebra.Types.DESCRIBE:
    case Algebra.Types.EXPRESSION:
    case Algebra.Types.PATTERN:
      return { type: 'estimate', value: Number.POSITIVE_INFINITY, dataset: dataset.uri };
  }
  return { type: 'estimate', value: Number.POSITIVE_INFINITY, dataset: dataset.uri };
}

/**
 * Estimate the cardinality of a minus, by taking into account the input cardinalities.
 */
export async function estimateMinusCardinality(
  minus: Algebra.Minus,
  dataset: IDataset,
): Promise<QueryResultCardinality> {
  const estimateFirst = await estimateCardinality(minus.input[0], dataset);
  const estimateSecond = await estimateCardinality(minus.input[1], dataset);
  return {
    type: 'estimate',
    value: Math.max(estimateFirst.value - estimateSecond.value, 0),
    dataset: dataset.uri,
  };
}

/**
 * Estimate the cardinality of a slice operation, taking into account the input cardinality and the slice range.
 */
export async function estimateSliceCardinality(
  slice: Algebra.Slice,
  dataset: IDataset,
): Promise<QueryResultCardinality> {
  const estimate = await estimateCardinality(slice.input, dataset);
  if (estimate.value > 0) {
    estimate.value = Math.max(estimate.value - slice.start, 0);
    if (slice.length !== undefined) {
      estimate.value = Math.min(estimate.value, slice.length);
    }
  }
  return estimate;
}

/**
 * Estimate the cardinality of a union, using a sum of the individual input cardinalities.
 */
export async function estimateUnionCardinality(
  input: Algebra.Operation[],
  dataset: IDataset,
): Promise<QueryResultCardinality> {
  const estimate: QueryResultCardinality = { type: 'exact', value: 0, dataset: dataset.uri };
  for (const operation of input) {
    const cardinality = await estimateCardinality(operation, dataset);
    if (cardinality.type === 'estimate' && estimate.type === 'exact') {
      estimate.type = cardinality.type;
    }
    estimate.value += cardinality.value;
  }
  return estimate;
}

/**
 * Estimate the cardinality of a join. This estimation is done by:
 *  1. Grouping operations together based on variables.
 *  2. Selecting the minimum op cardinality in each group as the cardinality of that group.
 *  3. Multiplying cardinalities of these (detached) groups.
 *
 * This should provide a good balance between selective groups of operations,
 * as well as cartesian joins between groups that do not overlap.
 */
export async function estimateJoinCardinality(
  operations: Algebra.Operation[],
  dataset: IDataset,
): Promise<QueryResultCardinality> {
  const operationGroups: { ops: Algebra.Operation[]; vars: Set<string> }[] = [];
  for (const operation of operations) {
    const vars = algebraUtils.inScopeVariables(operation).map(v => v.value);
    const group = operationGroups.find(g => vars.some(v => g.vars.has(v)));
    if (group) {
      group.ops.push(operation);
      for (const v of vars) {
        group.vars.add(v);
      }
    } else {
      operationGroups.push({ ops: [ operation ], vars: new Set(vars) });
    }
  }
  const cardinality: QueryResultCardinality = {
    type: 'estimate',
    value: (await Promise.all(operationGroups
      .map(async g => Math.min(...await Promise.all(
        g.ops.map(async o => (await estimateCardinality(o, dataset)).value),
      )))))
      .reduce((acc, cur) => acc * cur, 1),
    dataset: dataset.uri,
  };
  return cardinality;
}

/**
 * Estimate the cardinality of a negated property set, by subtracting the non-inversed
 * estimate from the total number of triples.
 */
export async function estimateNpsCardinality(
  nps: Algebra.Nps,
  dataset: IDataset,
): Promise<QueryResultCardinality> {
  const seq = AF.createSeq([ ...nps.iris ].reverse().map(iri => AF.createLink(iri)));
  const seqCardinality = await estimateCardinality(seq, dataset);
  const pattern = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));
  const patternCardinality = await estimateCardinality(pattern, dataset);
  return {
    type: 'estimate',
    value: Math.max(0, patternCardinality.value - seqCardinality.value),
    dataset: dataset.uri,
  };
}
