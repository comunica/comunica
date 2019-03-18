// tslint:disable:object-literal-sort-keys
// tslint:disable:max-classes-per-file

import * as RDF from 'rdf-js';

import { Algebra } from 'sparqlalgebrajs';

import * as C from '../util/Consts';
import * as Err from '../util/Errors';

import { number, string } from '../functions/Helpers';
import { Bindings } from '../Types';
import { parseXSDFloat } from '../util/Parsing';
import { SetFunction, TypeURL } from './../util/Consts';
import { SimpleEvaluator } from './SimpleEvaluator';

export class AggregateEvaluator {
  private expression: Algebra.AggregateExpression;
  private aggregator: BaseAggregator<any>;
  private evaluator: SimpleEvaluator;
  private throwError = false;
  private state: any;

  constructor(expr: Algebra.AggregateExpression, start?: Bindings, throwError?: boolean) {
    this.expression = expr;
    this.evaluator = new SimpleEvaluator(expr.expression);
    this.aggregator = new aggregators[expr.aggregator as SetFunction](expr);
    this.throwError = throwError;

    try {
      const startTerm = this.evaluator.evaluate(start);
      this.state = this.aggregator.init(startTerm);
    } catch (err) {
      if (throwError) {
        throw err;
      } else {
        this.put = () => { return; };
        this.result = () => undefined;
      }
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
  static emptyValue(expr: Algebra.AggregateExpression, throwError = false): RDF.Term {
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
      if (this.throwError) {
        throw err;
      } else {
        this.put = () => { return; };
        this.result = () => undefined;
      }
    }
  }

  result(): RDF.Term {
    return this.aggregator.result(this.state);
  }
}

abstract class BaseAggregator<State> {
  protected distinct: boolean;
  protected separator: string;

  constructor(expr: Algebra.AggregateExpression) {
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

class Count extends BaseAggregator<number> {
  static emptyValue() {
    return number(0, TypeURL.XSD_INTEGER).toRDF();
  }

  init(start: RDF.Term): number {
    return 1;
  }

  put(state: number, term: RDF.Term): number {
    return state + 1;
  }

  result(state: number): RDF.Term {
    return number(state, TypeURL.XSD_INTEGER).toRDF();
  }
}

type SumState = { sum: number, type: C.NumericType };
class Sum extends BaseAggregator<SumState> {
  static emptyValue() {
    return number(0, TypeURL.XSD_INTEGER).toRDF();
  }

  init(start: RDF.Term): SumState {
    const { value, type } = extractNumericValueAndTypeOrError(start);
    return { sum: value, type };
  }

  put(state: SumState, term: RDF.Term): SumState {
    const { value, type } = extractNumericValueAndTypeOrError(term);
    return {
      sum: state.sum + value,
      type: (state.type === type)
        ? state.type
        : promote(state.type, type),
    };
  }

  result(state: SumState): RDF.Term {
    return number(state.sum, state.type as unknown as C.TypeURL).toRDF()
  }
}

type MinState = { minNum: number, minTerm: RDF.Term };
class Min extends BaseAggregator<MinState> {
  init(start: RDF.Term): MinState {
    const { value } = extractNumericValueAndTypeOrError(start);
    return { minNum: value, minTerm: start };
  }

  put(state: MinState, term: RDF.Term): MinState {
    const { value } = extractNumericValueAndTypeOrError(term);
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
    const { value } = extractNumericValueAndTypeOrError(start);
    return { maxNum: value, maxTerm: start };
  }

  put(state: MaxState, term: RDF.Term): MaxState {
    const { value } = extractNumericValueAndTypeOrError(term);
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

type AverageState = { sum: number, sumType: C.NumericType, count: number };
class Average extends BaseAggregator<AverageState> {
  static emptyValue() {
    return number(0, TypeURL.XSD_INTEGER).toRDF();
  }

  init(start: RDF.Term): AverageState {
    const { value, type } = extractNumericValueAndTypeOrError(start);
    return { sum: value, sumType: type, count: 1 };
  }

  put(state: AverageState, term: RDF.Term): AverageState {
    const { value, type } = extractNumericValueAndTypeOrError(term);
    return {
      sum: state.sum + value,
      count: state.count + 1,
      sumType: (state.sumType === type)
        ? state.sumType
        : promote(state.sumType, type),
    };
  }

  result(state: AverageState): RDF.Term {
    const result = state.sum / state.count;
    return state.sumType === C.NumericType.XSD_INTEGER
      ? number(result, TypeURL.XSD_DECIMAL).toRDF()
      : number(result, TypeURL.XSD_FLOAT).toRDF();
  }

}

class GroupConcat extends BaseAggregator<string> {
  static emptyValue() {
    return string('').toRDF();
  }

  init(start: RDF.Term): string {
    return start.value;
  }

  put(state: string, term: RDF.Term): string {
    return state + this.separator + term.value;
  }

  result(state: string): RDF.Term {
    return string(state).toRDF();
  }
}

class Sample extends BaseAggregator<RDF.Term> {
  init(start: RDF.Term): RDF.Term {
    return start;
  }

  put(state: RDF.Term, term: RDF.Term): RDF.Term {
    return state; // First value is our sample
  }

  result(state: RDF.Term): RDF.Term {
    return state;
  }
}

export interface AggregatorClass {
  new(expr: Algebra.AggregateExpression): BaseAggregator<any>;
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

// https://www.w3.org/TR/xpath-31/#promotion
const promoTree: { [key: string]: { [key: string]: C.NumericType } } = {
  'http://www.w3.org/2001/XMLSchema#integer': {
    'http://www.w3.org/2001/XMLSchema#integer': C.NumericType.XSD_INTEGER,
    'http://www.w3.org/2001/XMLSchema#float': C.NumericType.XSD_FLOAT,
    'http://www.w3.org/2001/XMLSchema#decimal': C.NumericType.XSD_DECIMAL,
    'http://www.w3.org/2001/XMLSchema#double': C.NumericType.XSD_DOUBLE,
  },
  'http://www.w3.org/2001/XMLSchema#float': {
    'http://www.w3.org/2001/XMLSchema#integer': C.NumericType.XSD_FLOAT,
    'http://www.w3.org/2001/XMLSchema#float': C.NumericType.XSD_FLOAT,
    'http://www.w3.org/2001/XMLSchema#decimal': C.NumericType.XSD_FLOAT,
    'http://www.w3.org/2001/XMLSchema#double': C.NumericType.XSD_FLOAT,
  },
  'http://www.w3.org/2001/XMLSchema#decimal': {
    'http://www.w3.org/2001/XMLSchema#integer': C.NumericType.XSD_DECIMAL,
    'http://www.w3.org/2001/XMLSchema#float': C.NumericType.XSD_FLOAT,
    'http://www.w3.org/2001/XMLSchema#decimal': C.NumericType.XSD_DECIMAL,
    'http://www.w3.org/2001/XMLSchema#double': C.NumericType.XSD_DOUBLE,
  },
  'http://www.w3.org/2001/XMLSchema#double': {
    'http://www.w3.org/2001/XMLSchema#integer': C.NumericType.XSD_DOUBLE,
    'http://www.w3.org/2001/XMLSchema#float': C.NumericType.XSD_DOUBLE,
    'http://www.w3.org/2001/XMLSchema#decimal': C.NumericType.XSD_DOUBLE,
    'http://www.w3.org/2001/XMLSchema#double': C.NumericType.XSD_DOUBLE,
  },
};

function promote(type1: C.NumericType, type2: C.NumericType): C.NumericType {
  if (C.DerivedIntegerTypes.contains(type1)) {
    type1 = C.NumericType.XSD_INTEGER;
  }

  if (C.DerivedIntegerTypes.contains(type2)) {
    type2 = C.NumericType.XSD_INTEGER;
  }

  return promoTree[type1][type2];
}

function extractNumericValueAndTypeOrError(term: RDF.Term): { value: number, type: C.NumericType } {
  // TODO: Check behaviour
  if (term.termType !== 'Literal' || !C.NumericTypes.contains(term.datatype.value)) {
    throw new Error('Term is not numeric');
  }

  const type: C.NumericType = term.datatype.value as unknown as C.NumericType;
  const value = parseXSDFloat(term.value);
  return { type, value };
}
