import { DataFactory } from 'rdf-data-factory';
import type * as RDF from 'rdf-js';
import type { Algebra } from 'sparqlalgebrajs';
import * as E from './expressions';
import { regularFunctions } from './functions';
import { number, string } from './functions/Helpers';
import { transformLiteral } from './Transformation';
import type { SetFunction } from './util/Consts';
import * as C from './util/Consts';
import { TypeURL } from './util/Consts';
import { parseXSDFloat } from './util/Parsing';

const DF = new DataFactory();

export abstract class BaseAggregator<State> {
  protected distinct: boolean;
  protected separator: string;

  public constructor(expr: Algebra.AggregateExpression) {
    this.distinct = expr.distinct;
    this.separator = expr.separator || ' ';
  }

  public static emptyValue(): RDF.Term {
    return undefined;
  }

  abstract init(start: RDF.Term): State;

  abstract result(state: State): RDF.Term;

  abstract put(state: State, bindings: RDF.Term): State;
}

class Count extends BaseAggregator<number> {
  public static emptyValue(): RDF.Term {
    return number(0, TypeURL.XSD_INTEGER).toRDF();
  }

  public init(start: RDF.Term): number {
    return 1;
  }

  public put(state: number, term: RDF.Term): number {
    return state + 1;
  }

  public result(state: number): RDF.Term {
    return number(state, TypeURL.XSD_INTEGER).toRDF();
  }
}

type SumState = E.NumericLiteral;

class Sum extends BaseAggregator<SumState> {
  private readonly summer = regularFunctions.get(C.RegularOperator.ADDITION);

  public static emptyValue(): RDF.Term {
    return number(0, TypeURL.XSD_INTEGER).toRDF();
  }

  public init(start: RDF.Term): SumState {
    const { value, type } = extractNumericValueAndTypeOrError(start);
    return new E.NumericLiteral(value, DF.namedNode(type));
  }

  public put(state: SumState, term: RDF.Term): SumState {
    const { value, type } = extractNumericValueAndTypeOrError(term);
    const internalTerm = new E.NumericLiteral(value, DF.namedNode(type));
    const sum = <E.NumericLiteral> this.summer.apply([ state, internalTerm ]);
    return sum;
  }

  public result(state: SumState): RDF.Term {
    return state.toRDF();
  }
}

interface IExtremeState {
  extremeValue: number; term: RDF.Literal;
}

class Min extends BaseAggregator<IExtremeState> {
  public init(start: RDF.Term): IExtremeState {
    const { value } = extractValue(null, start);
    if (start.termType === 'Literal') {
      return { extremeValue: value, term: start };
    }
  }

  public put(state: IExtremeState, term: RDF.Term): IExtremeState {
    const extracted = extractValue(state.term, term);
    if (extracted.value < state.extremeValue && term.termType === 'Literal') {
      return {
        extremeValue: extracted.value,
        term,
      };
    }
    return state;
  }

  public result(state: IExtremeState): RDF.Term {
    return state.term;
  }
}

class Max extends BaseAggregator<IExtremeState> {
  public init(start: RDF.Term): IExtremeState {
    const { value } = extractValue(null, start);
    if (start.termType === 'Literal') {
      return { extremeValue: value, term: start };
    }
  }

  public put(state: IExtremeState, term: RDF.Term): IExtremeState {
    const extracted = extractValue(state.term, term);
    if (extracted.value > state.extremeValue && term.termType === 'Literal') {
      return {
        extremeValue: extracted.value,
        term,
      };
    }
    return state;
  }

  public result(state: IExtremeState): RDF.Term {
    return state.term;
  }
}

interface IAverageState {
  sum: E.NumericLiteral; count: number;
}

class Average extends BaseAggregator<IAverageState> {
  private readonly summer = regularFunctions.get(C.RegularOperator.ADDITION);
  private readonly divider = regularFunctions.get(C.RegularOperator.DIVISION);

  public static emptyValue(): RDF.Term {
    return number(0, TypeURL.XSD_INTEGER).toRDF();
  }

  public init(start: RDF.Term): IAverageState {
    const { value, type } = extractNumericValueAndTypeOrError(start);
    const sum = new E.NumericLiteral(value, DF.namedNode(type));
    return { sum, count: 1 };
  }

  public put(state: IAverageState, term: RDF.Term): IAverageState {
    const { value, type } = extractNumericValueAndTypeOrError(term);
    const internalTerm = new E.NumericLiteral(value, DF.namedNode(type));
    const sum = <E.NumericLiteral> this.summer.apply([ state.sum, internalTerm ]);
    return {
      sum,
      count: state.count + 1,
    };
  }

  public result(state: IAverageState): RDF.Term {
    const count = new E.NumericLiteral(state.count, DF.namedNode(C.TypeURL.XSD_INTEGER));
    const result = this.divider.apply([ state.sum, count ]);
    return result.toRDF();
  }
}

class GroupConcat extends BaseAggregator<string> {
  public static emptyValue(): RDF.Term {
    return string('').toRDF();
  }

  public init(start: RDF.Term): string {
    return start.value;
  }

  public put(state: string, term: RDF.Term): string {
    return state + this.separator + term.value;
  }

  public result(state: string): RDF.Term {
    return string(state).toRDF();
  }
}

class Sample extends BaseAggregator<RDF.Term> {
  public init(start: RDF.Term): RDF.Term {
    return start;
  }

  public put(state: RDF.Term, term: RDF.Term): RDF.Term {
    // First value is our sample
    return state;
  }

  public result(state: RDF.Term): RDF.Term {
    return state;
  }
}

export interface IAggregatorClass {
  new(expr: Algebra.AggregateExpression): BaseAggregator<any>;

  emptyValue: () => RDF.Term;
}

export const aggregators: Readonly<{[key in SetFunction]: IAggregatorClass }> = {
  count: Count,
  sum: Sum,
  min: Min,
  max: Max,
  avg: Average,
  group_concat: GroupConcat,
  sample: Sample,
};

function extractNumericValueAndTypeOrError(term: RDF.Term): { value: number; type: C.NumericTypeURL } {
  // TODO: Check behaviour
  if (term.termType !== 'Literal') {
    throw new Error(`Term with value ${term.value} has type ${term.termType} and is not a numeric literal`);
  } else if (!C.NumericTypeURLs.contains(term.datatype.value)) {
    throw new Error(`Term datatype ${term.datatype.value} with value ${term.value} has type ${term.termType} and is not a numeric literal`);
  }

  const type: C.NumericTypeURL = <C.NumericTypeURL> term.datatype.value;
  const value = parseXSDFloat(term.value);
  return { type, value };
}

function extractValue(extremeTerm: RDF.Literal, term: RDF.Term): { value: any; type: string } {
  if (term.termType !== 'Literal') {
    throw new Error(`Term with value ${term.value} has type ${term.termType} and is not a literal`);
  }

  const transformedLit = transformLiteral(term);
  return { type: transformedLit.typeURL.value, value: transformedLit.typedValue };
}
