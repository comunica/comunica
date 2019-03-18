// tslint:disable:object-literal-sort-keys
// tslint:disable:max-classes-per-file

import * as RDFDM from '@rdfjs/data-model';
import { Set } from 'immutable';
import * as RDF from 'rdf-js';
import { Algebra } from 'sparqlalgebrajs';
import { SimpleEvaluator } from './SimpleEvaluator';

import { Bindings } from '../Types';

import * as Err from '../util/Errors';

export class AggregateEvaluator {
  private expression: Algebra.BoundAggregate;
  private aggregator: BaseAggregator<any>;
  private evaluator: SimpleEvaluator;
  private state: any;

  constructor(expr: Algebra.BoundAggregate, start?: Bindings) {
    this.expression = expr;
    this.evaluator = new SimpleEvaluator(expr);
    this.aggregator = new aggregators[expr.aggregator as SetFunction](expr);

    try {
      const startTerm = this.evaluator.evaluate(start);
      this.state = this.aggregator.init(startTerm);
    } catch (err) {
      this.put = () => { return; };
      this.result = () => undefined;
    }
  }

  /**
   * The spec says to throw an error when a set function is called on an empty
   * set (unless explicitly mentioned otherwise like COUNT).
   * However, aggregate error handling says to not bind the result in case of an
   * error. So to simplify logic in the caller, we return undefined by default.
   *
   * @param throwError wether this function should respect the spec and throw an error if no empty value is defined
   */
  static emptyValue(expr: Algebra.BoundAggregate, throwError = false): RDF.Term {
    if (throwError) {
      throw new Err.EmptyAggregateError();
    } else {
      return aggregators[expr.aggregator as SetFunction].emptyValue();
    }
  }

  /**
   * Put a binding from the result stream in the aggregate state.
   *
   * If any binding evaluation errors, the corresponding aggregate variable should be unbound.
   * If this happens, calling @see result() will return @constant undefined
   * @param bindings the bindings to pass tho the expression
   */
  put(bindings: Bindings): void {
    try {
      const term = this.evaluator.evaluate(bindings);
      this.state = this.aggregator.put(this.state, term);
    } catch (err) {
      this.put = () => { return; };
      this.result = () => undefined;
    }
  }

  result(): RDF.Term {
    return this.aggregator.result(this.state);
  }
}

abstract class BaseAggregator<State> {
  protected distinct: boolean;
  protected separator: string;

  constructor(expr: Algebra.BoundAggregate) {
    this.distinct = expr.distinct;
    this.separator = expr.separator || ' ';
  }

  static emptyValue(): RDF.Term {
    return undefined;
  }

  abstract init(start: RDF.Term): State;

  abstract result(state: State): RDF.Term;

  abstract put(state: State, bindings: RDF.Term): State;

}

export enum SetFunction {
  COUNT = 'count',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  AVG = 'avg',
  GROUP_CONCAT = 'group_concat',
  SAMPLE = 'sample',
}

class Count extends BaseAggregator<number> {
  static emptyValue() {
    return int(0);
  }

  init(start: RDF.Term): number {
    return 1;
  }

  put(state: number, term: RDF.Term): number {
    return state + 1;
  }

  result(state: number): RDF.Term {
    return int(state);
  }
}

type SumState = { sum: number, type: string };
class Sum extends BaseAggregator<SumState> {
  static emptyValue() {
    return int(0);
  }

  init(start: RDF.Term): SumState {
    const value = extractNumericValueOrError(start);
    return { sum: value, type: (start as RDF.Literal).datatype.value };
  }

  put(state: SumState, term: RDF.Term): SumState {
    const value = extractNumericValueOrError(term);
    return {
      sum: state.sum + value,
      type: (state.type === (term as RDF.Literal).datatype.value)
        ? state.type
        : promote(state.type, (term as RDF.Literal).datatype.value),
    };
  }

  result(state: SumState): RDF.Term {
    return RDFDM.literal(state.sum.toString(), state.type);
  }
}

type MinState = { minNum: number, minTerm: RDF.Term };
class Min extends BaseAggregator<MinState> {
  init(start: RDF.Term): MinState {
    const value = extractNumericValueOrError(start);
    return { minNum: value, minTerm: start };
  }

  put(state: MinState, term: RDF.Term): MinState {
    const value = extractNumericValueOrError(term);
    if (value < state.minNum) {
      return {
        minNum: value,
        minTerm: term,
      };
    }
    return state;
  }

  result(state: MinState): RDF.Term {
    return state.minTerm;
  }
}

type MaxState = { maxNum: number, maxTerm: RDF.Term };
class Max extends BaseAggregator<MaxState> {
  init(start: RDF.Term): MaxState {
    const value = extractNumericValueOrError(start);
    return { maxNum: value, maxTerm: start };
  }

  put(state: MaxState, term: RDF.Term): MaxState {
    const value = extractNumericValueOrError(term);
    if (value >= state.maxNum) {
      return {
        maxNum: value,
        maxTerm: term,
      };
    }
    return state;
  }

  result(state: MaxState): RDF.Term {
    return state.maxTerm;
  }
}

type AverageState = { sum: number, sumType: string, count: number };
class Average extends BaseAggregator<AverageState> {
  static emptyValue() {
    return int(0);
  }

  init(start: RDF.Term): AverageState {
    const value = extractNumericValueOrError(start);
    return { sum: value, sumType: (start as RDF.Literal).datatype.value, count: 1 };
  }

  put(state: AverageState, term: RDF.Term): AverageState {
    const value = extractNumericValueOrError(term);
    return {
      sum: state.sum + value,
      count: state.count + 1,
      sumType: (state.sumType === (term as RDF.Literal).datatype.value)
        ? state.sumType
        : promote(state.sumType, (term as RDF.Literal).datatype.value),
    };
  }

  result(state: AverageState): RDF.Term {
    const result = state.sum / state.count;
    return state.sumType === 'http://www.w3.org/2001/XMLSchema#integer'
      ? decimal(result)
      : float(result);
  }

}

class GroupConcat extends BaseAggregator<string> {
  static emptyValue() {
    return RDFDM.literal('');
  }

  init(start: RDF.Term): string {
    return start.value;
  }

  put(state: string, term: RDF.Term): string {
    return state + this.separator + term.value;
  }

  result(state: string): RDF.Term {
    return RDFDM.literal(state);
  }
}

class Sample extends BaseAggregator<RDF.Term> {
  init(start: RDF.Term): RDF.Term {
    return start;
  }

  put(state: RDF.Term, term: RDF.Term): RDF.Term {
    return; // First value is our sample
  }

  result(state: RDF.Term): RDF.Term {
    return state;
  }
}

export interface AggregatorClass {
  new(expr: Algebra.BoundAggregate): BaseAggregator<any>;
  emptyValue(): RDF.Term;
}
export const aggregators: Readonly<{ [key in SetFunction]: AggregatorClass }> = {
  count: Count,
  sum: Sum,
  min: Min,
  max: Max,
  avg: Average,
  group_concat: GroupConcat,
  sample: Sample,
};

function int(value: number): RDF.Literal {
  return RDFDM.literal(value.toString(), RDFDM.namedNode('http://www.w3.org/2001/XMLSchema#integer'));
}

function float(value: number): RDF.Literal {
  return RDFDM.literal(value.toString(), RDFDM.namedNode('http://www.w3.org/2001/XMLSchema#float'));
}

function decimal(value: number): RDF.Literal {
  return RDFDM.literal(value.toString(), RDFDM.namedNode('http://www.w3.org/2001/XMLSchema#decimal'));
}

// https://www.w3.org/TR/xpath-31/#promotion
const promoTree: { [key: string]: { [key: string]: string } } = {
  'http://www.w3.org/2001/XMLSchema#integer': {
    'http://www.w3.org/2001/XMLSchema#integer': 'http://www.w3.org/2001/XMLSchema#integer',
    'http://www.w3.org/2001/XMLSchema#float': 'http://www.w3.org/2001/XMLSchema#float',
    'http://www.w3.org/2001/XMLSchema#decimal': 'http://www.w3.org/2001/XMLSchema#decimal',
    'http://www.w3.org/2001/XMLSchema#double': 'http://www.w3.org/2001/XMLSchema#double',
  },
  'http://www.w3.org/2001/XMLSchema#float': {
    'http://www.w3.org/2001/XMLSchema#integer': 'http://www.w3.org/2001/XMLSchema#float',
    'http://www.w3.org/2001/XMLSchema#float': 'http://www.w3.org/2001/XMLSchema#float',
    'http://www.w3.org/2001/XMLSchema#decimal': 'http://www.w3.org/2001/XMLSchema#float',
    'http://www.w3.org/2001/XMLSchema#double': 'http://www.w3.org/2001/XMLSchema#double',
  },
  'http://www.w3.org/2001/XMLSchema#decimal': {
    'http://www.w3.org/2001/XMLSchema#integer': 'http://www.w3.org/2001/XMLSchema#decimal',
    'http://www.w3.org/2001/XMLSchema#float': 'http://www.w3.org/2001/XMLSchema#float',
    'http://www.w3.org/2001/XMLSchema#decimal': 'http://www.w3.org/2001/XMLSchema#decimal',
    'http://www.w3.org/2001/XMLSchema#double': 'http://www.w3.org/2001/XMLSchema#double',
  },
  'http://www.w3.org/2001/XMLSchema#double': {
    'http://www.w3.org/2001/XMLSchema#integer': 'http://www.w3.org/2001/XMLSchema#double',
    'http://www.w3.org/2001/XMLSchema#float': 'http://www.w3.org/2001/XMLSchema#double',
    'http://www.w3.org/2001/XMLSchema#decimal': 'http://www.w3.org/2001/XMLSchema#double',
    'http://www.w3.org/2001/XMLSchema#double': 'http://www.w3.org/2001/XMLSchema#double',
  },
};

function promote(type1: string, type2: string): string {
  if (derivedIntegerTypes.contains(type1)) {
    type1 = 'http://www.w3.org/2001/XMLSchema#integer';
  }

  if (derivedIntegerTypes.contains(type2)) {
    type2 = 'http://www.w3.org/2001/XMLSchema#integer';
  }

  return promoTree[type1][type2];
}

function extractNumericValueOrError(term: RDF.Term): number {
  // TODO: Check behaviour
  if (
    term.termType !== 'Literal'
    || !numericTypes.contains(term.datatype.value)
  ) {
    throw new Error('Term is not numeric');
  }
  return parseFloat(term.value);
}

const baseNumericTypes = Set([
  'http://www.w3.org/2001/XMLSchema#integer',
  'http://www.w3.org/2001/XMLSchema#decimal',
  'http://www.w3.org/2001/XMLSchema#float',
  'http://www.w3.org/2001/XMLSchema#double',
]);

const derivedIntegerTypes = Set([
  'http://www.w3.org/2001/XMLSchema#nonPositiveInteger',
  'http://www.w3.org/2001/XMLSchema#negativeInteger',
  'http://www.w3.org/2001/XMLSchema#long',
  'http://www.w3.org/2001/XMLSchema#int',
  'http://www.w3.org/2001/XMLSchema#short',
  'http://www.w3.org/2001/XMLSchema#byte',
  'http://www.w3.org/2001/XMLSchema#nonNegativeInteger',
  'http://www.w3.org/2001/XMLSchema#unsignedLong',
  'http://www.w3.org/2001/XMLSchema#unsignedInt',
  'http://www.w3.org/2001/XMLSchema#unsignedShort',
  'http://www.w3.org/2001/XMLSchema#unsignedByte',
  'http://www.w3.org/2001/XMLSchema#positiveInteger',
]);

const numericTypes = baseNumericTypes.union(derivedIntegerTypes);
