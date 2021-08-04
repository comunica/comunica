import {regularFunctions} from './functions';
import * as C from './util/Consts';
import {SetFunction, TypeURL} from './util/Consts';
import {number, string} from './functions/Helpers';
import * as RDF from 'rdf-js';
import * as E from './expressions';
import {parseXSDFloat} from './util/Parsing';
import {DataFactory} from 'rdf-data-factory';
import {Algebra} from 'sparqlalgebrajs';
import {transformLiteral} from './Transformation';

const DF = new DataFactory();

export abstract class BaseAggregator<State> {
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

type SumState = E.NumericLiteral;

class Sum extends BaseAggregator<SumState> {
  summer = regularFunctions.get(C.RegularOperator.ADDITION);

  static emptyValue() {
    return number(0, TypeURL.XSD_INTEGER).toRDF();
  }

  init(start: RDF.Term): SumState {
    const {value, type} = extractNumericValueAndTypeOrError(start);
    return new E.NumericLiteral(value, DF.namedNode(type));
  }

  put(state: SumState, term: RDF.Term): SumState {
    const {value, type} = extractNumericValueAndTypeOrError(term);
    const internalTerm = new E.NumericLiteral(value, DF.namedNode(type));
    const sum = this.summer.apply([state, internalTerm]) as E.NumericLiteral;
    return sum;
  }

  result(state: SumState): RDF.Term {
    return state.toRDF();
  }
}

type ExtremeState = { extremeValue: number, term: RDF.Literal };

class Min extends BaseAggregator<ExtremeState> {
  init(start: RDF.Term): ExtremeState {
    const {value} = extractValue(null, start);
    if (start.termType === 'Literal') {
      return {extremeValue: value, term: start};
    }
  }

  put(state: ExtremeState, term: RDF.Term): ExtremeState {
    const extracted = extractValue(state.term, term);
    if (extracted.value < state.extremeValue && term.termType === 'Literal') {
      return {
        extremeValue: extracted.value,
        term,
      };
    }
    return state;
  }

  result(state: ExtremeState): RDF.Term {
    return state.term;
  }
}

class Max extends BaseAggregator<ExtremeState> {
  init(start: RDF.Term): ExtremeState {
    const {value} = extractValue(null, start);
    if (start.termType === 'Literal') {
      return {extremeValue: value, term: start};
    }
  }

  put(state: ExtremeState, term: RDF.Term): ExtremeState {
    const extracted = extractValue(state.term, term);
    if (extracted.value > state.extremeValue && term.termType === 'Literal') {
      return {
        extremeValue: extracted.value,
        term,
      };
    }
    return state;
  }

  result(state: ExtremeState): RDF.Term {
    return state.term;
  }
}

type AverageState = { sum: E.NumericLiteral, count: number };

class Average extends BaseAggregator<AverageState> {
  summer = regularFunctions.get(C.RegularOperator.ADDITION);
  divider = regularFunctions.get(C.RegularOperator.DIVISION);

  static emptyValue() {
    return number(0, TypeURL.XSD_INTEGER).toRDF();
  }

  init(start: RDF.Term): AverageState {
    const {value, type} = extractNumericValueAndTypeOrError(start);
    const sum = new E.NumericLiteral(value, DF.namedNode(type));
    return {sum, count: 1};
  }

  put(state: AverageState, term: RDF.Term): AverageState {
    const {value, type} = extractNumericValueAndTypeOrError(term);
    const internalTerm = new E.NumericLiteral(value, DF.namedNode(type));
    const sum = this.summer.apply([state.sum, internalTerm]) as E.NumericLiteral;
    return {
      sum,
      count: state.count + 1,
    };
  }

  result(state: AverageState): RDF.Term {
    const count = new E.NumericLiteral(state.count, DF.namedNode(C.TypeURL.XSD_INTEGER));
    const result = this.divider.apply([state.sum, count]);
    return result.toRDF();
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

function extractNumericValueAndTypeOrError(term: RDF.Term): { value: number, type: C.NumericTypeURL } {
  // TODO: Check behaviour
  if (term.termType !== 'Literal') {
    throw new Error('Term with value ' + term.value + ' has type ' + term.termType + ' and is not a numeric literal');
  } else if (!C.NumericTypeURLs.contains(term.datatype.value)) {
    throw new Error('Term datatype ' + term.datatype.value + ' with value ' + term.value + ' has type ' + term.termType + ' and is not a numeric literal');
  }

  const type: C.NumericTypeURL = term.datatype.value as unknown as C.NumericTypeURL;
  const value = parseXSDFloat(term.value);
  return {type, value};
}

function extractValue(extremeTerm: RDF.Literal, term: RDF.Term): { value: any, type: string } {
  if (term.termType !== 'Literal') {
    throw new Error('Term with value ' + term.value + ' has type ' + term.termType + ' and is not a literal');
  }

  const transformedLit = transformLiteral(term);
  return {type: transformedLit.typeURL.value, value: transformedLit.typedValue};
}
