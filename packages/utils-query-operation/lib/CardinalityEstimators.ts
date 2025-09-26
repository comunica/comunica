import type { IDataset, QueryResultCardinality } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory, Util } from 'sparqlalgebrajs';

// These are only used internally for estimates
const DF = new DataFactory();
const AF = new Factory(DF);

/**
 * Estimate the cardinality of the provided operation using the specified dataset metadata.
 * This is the primary function that should be called to perform cardinality estimation.
 */
export function estimateCardinality(
  operation: Algebra.Operation,
  dataset: IDataset,
): QueryResultCardinality {
  const estimate = dataset.getCardinality(operation);

  if (estimate) {
    return estimate;
  }

  switch (operation.type) {
    case Algebra.types.ASK:
      return { type: 'exact', value: 1, dataset: dataset.uri };
    case Algebra.types.LOAD:
    case Algebra.types.DELETE_INSERT:
    case Algebra.types.ADD:
    case Algebra.types.COMPOSITE_UPDATE:
    case Algebra.types.CLEAR:
    case Algebra.types.NOP:
    case Algebra.types.DROP:
    case Algebra.types.CREATE:
    case Algebra.types.MOVE:
    case Algebra.types.COPY:
      return { type: 'exact', value: 0, dataset: dataset.uri };
    case Algebra.types.PROJECT:
    case Algebra.types.FILTER:
    case Algebra.types.ORDER_BY:
    case Algebra.types.GROUP:
    case Algebra.types.CONSTRUCT:
    case Algebra.types.DISTINCT:
    case Algebra.types.REDUCED:
    case Algebra.types.EXTEND:
    case Algebra.types.FROM:
    case Algebra.types.GRAPH:
      return estimateCardinality(operation.input, dataset);
    case Algebra.types.ZERO_OR_ONE_PATH:
    case Algebra.types.ZERO_OR_MORE_PATH:
    case Algebra.types.ONE_OR_MORE_PATH:
    case Algebra.types.INV:
      return estimateCardinality(operation.path, dataset);
    case Algebra.types.PATH:
      return estimateCardinality(operation.predicate, dataset);
    case Algebra.types.NPS:
      return estimateNpsCardinality(operation, dataset);
    case Algebra.types.LINK:
      return estimateCardinality(AF.createPattern(DF.variable('s'), operation.iri, DF.variable('o')), dataset);
    case Algebra.types.UNION:
    case Algebra.types.SEQ:
    case Algebra.types.ALT:
      return estimateUnionCardinality(operation.input, dataset);
    case Algebra.types.BGP:
      return estimateJoinCardinality(operation.patterns, dataset);
    case Algebra.types.JOIN:
    case Algebra.types.LEFT_JOIN:
      return estimateJoinCardinality(operation.input, dataset);
    case Algebra.types.SLICE:
      return estimateSliceCardinality(operation, dataset);
    case Algebra.types.MINUS:
      return estimateMinusCardinality(operation, dataset);
    case Algebra.types.VALUES:
      return { type: 'exact', value: operation.bindings.length, dataset: dataset.uri };
    case Algebra.types.SERVICE:
    case Algebra.types.DESCRIBE:
    case Algebra.types.EXPRESSION:
    case Algebra.types.PATTERN:
      return { type: 'estimate', value: Number.POSITIVE_INFINITY, dataset: dataset.uri };
  }
}

/**
 * Estimate the cardinality of a minus, by taking into account the input cardinalities.
 */
export function estimateMinusCardinality(
  minus: Algebra.Minus,
  dataset: IDataset,
): QueryResultCardinality {
  const estimateFirst = estimateCardinality(minus.input[0], dataset);
  const estimateSecond = estimateCardinality(minus.input[1], dataset);
  return {
    type: 'estimate',
    value: Math.max(estimateFirst.value - estimateSecond.value, 0),
    dataset: dataset.uri,
  };
}

/**
 * Estimate the cardinality of a slice operation, taking into account the input cardinality and the slice range.
 */
export function estimateSliceCardinality(
  slice: Algebra.Slice,
  dataset: IDataset,
): QueryResultCardinality {
  const estimate = estimateCardinality(slice.input, dataset);
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
export function estimateUnionCardinality(
  input: Algebra.Operation[],
  dataset: IDataset,
): QueryResultCardinality {
  const estimate: QueryResultCardinality = { type: 'exact', value: 0, dataset: dataset.uri };
  for (const operation of input) {
    const cardinality = estimateCardinality(operation, dataset);
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
export function estimateJoinCardinality(
  operations: Algebra.Operation[],
  dataset: IDataset,
): QueryResultCardinality {
  const operationGroups: { ops: Algebra.Operation[]; vars: Set<string> }[] = [];
  for (const operation of operations) {
    const vars = Util.inScopeVariables(operation).map(v => v.value);
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
    value: operationGroups
      .map(g => Math.min(...g.ops.map(o => estimateCardinality(o, dataset).value)))
      .reduce((acc, cur) => acc * cur, 1),
    dataset: dataset.uri,
  };
  return cardinality;
}

/**
 * Estimate the cardinality of a negated property set, by subtracting the non-inversed
 * estimate from the total number of triples.
 */
export function estimateNpsCardinality(
  nps: Algebra.Nps,
  dataset: IDataset,
): QueryResultCardinality {
  const seq = AF.createSeq([ ...nps.iris ].reverse().map(iri => AF.createLink(iri)));
  const seqCardinality = estimateCardinality(seq, dataset);
  const pattern = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));
  const patternCardinality = estimateCardinality(pattern, dataset);
  return {
    type: 'estimate',
    value: Math.max(0, patternCardinality.value - seqCardinality.value),
    dataset: dataset.uri,
  };
}
