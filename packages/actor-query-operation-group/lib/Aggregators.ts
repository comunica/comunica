// tslint:disable:object-literal-sort-keys
// tslint:disable:max-classes-per-file

import * as RDFDM from '@rdfjs/data-model';
import { Set } from 'immutable';
import * as RDF from 'rdf-js';
import { Algebra } from 'sparqlalgebrajs';

export abstract class BaseAggregator<State> {
  protected state: State;
  protected distinct: boolean;
  protected separator: string;

  constructor(expr: Algebra.BoundAggregate, start: RDF.Term) {
    try {
      this.state = this.init(start);
    } catch (err) {
      this.put = () => { return; };
      this.result = () => undefined;
    }
    this.distinct = expr.distinct;
    this.separator = expr.separator || " ";
  }

  public static emptyValue(): RDF.Term {
    // We want to this `throw new Error('Aggregate on empty set');`
    // But aggregate error handling just doesn't bind in case of error
    // so this is a shortcut to prevent the need to catch in consumers
    return undefined;
  }

  public abstract init(start: RDF.Term): State;

  public abstract result(): RDF.Term;

  public put(term: RDF.Term): void {
    try {
      this._put(term);
      // If any term errors, the corresponding aggregate variable should be unbound
      // This is done by setting the result to be undefined
    } catch (err) {
      this.put = () => { return; };
      this.result = () => undefined;
    }
  }

  protected abstract _put(term: RDF.Term): void;
}

export enum Aggregator {
  COUNT = 'count',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  AVG = 'avg',
  GROUP_CONCAT = 'group_concat',
  SAMPLE = 'sample',
}

class Count extends BaseAggregator<number> {
  public static emptyValue() {
    return int(0);
  }

  public init(start: RDF.Term): number {
    return 1;
  }

  public result(): RDF.Term {
    return int(this.state);
  }

  protected _put(term: RDF.Term): void {
    this.state += 1;
  }
}

class Sum extends BaseAggregator<{ sum: number, type: string }> {
  public static emptyValue() {
    return int(0);
  }

  public init(start: RDF.Term): { sum: number, type: string } {
    const value = extractNumericValueOrError(start);
    return { sum: value, type: (start as RDF.Literal).datatype.value };
  }

  public result(): RDF.Term {
    return RDFDM.literal(this.state.sum.toString(), this.state.type);
  }

  protected _put(term: RDF.Term): void {
    const value = extractNumericValueOrError(term);
    this.state.sum += value;
    this.state.type = (this.state.type === (term as RDF.Literal).datatype.value)
      ? this.state.type
      : promote(this.state.type, (term as RDF.Literal).datatype.value);
  }
}

class Min extends BaseAggregator<{ minNum: number, minTerm: RDF.Term }> {
  public init(start: RDF.Term): { minNum: number, minTerm: RDF.Term } {
    const value = extractNumericValueOrError(start);
    return { minNum: value, minTerm: start };
  }

  public _put(term: RDF.Term): void {
    const value = extractNumericValueOrError(term);
    if (value < this.state.minNum) {
      this.state.minNum = value;
      this.state.minTerm = term;
    }
  }

  public result(): RDF.Term {
    return this.state.minTerm;
  }
}

class Max extends BaseAggregator<{ maxNum: number, maxTerm: RDF.Term }> {
  public init(start: RDF.Term): { maxNum: number, maxTerm: RDF.Term } {
    const value = extractNumericValueOrError(start);
    return { maxNum: value, maxTerm: start };
  }

  public _put(term: RDF.Term): void {
    const value = extractNumericValueOrError(term);
    if (value >= this.state.maxNum) {
      this.state.maxNum = value;
      this.state.maxTerm = term;
    }
  }

  public result(): RDF.Term {
    return this.state.maxTerm;
  }
}

class Average extends BaseAggregator<{ sum: number, sumType: string, count: number }> {
  public static emptyValue() {
    return int(0);
  }

  public init(start: RDF.Term): { sum: number, sumType: string, count: number } {
    const value = extractNumericValueOrError(start);
    return { sum: value, sumType: (start as RDF.Literal).datatype.value, count: 1 };
  }

  public _put(term: RDF.Term): void {
    const value = extractNumericValueOrError(term);
    this.state.sum += value;
    this.state.count += 1;
    this.state.sumType = (this.state.sumType === (term as RDF.Literal).datatype.value)
      ? this.state.sumType
      : promote(this.state.sumType, (term as RDF.Literal).datatype.value);
  }

  public result(): RDF.Term {
    const result = this.state.sum / this.state.count;
    return this.state.sumType === 'http://www.w3.org/2001/XMLSchema#integer'
      ? decimal(result)
      : float(result);
  }

}

class GroupConcat extends BaseAggregator<string> {
  public static emptyValue() {
    return RDFDM.literal("");
  }

  public init(start: RDF.Term): string {
    return start.value;
  }

  public _put(term: RDF.Term): void {
    this.state += this.separator + term.value;
  }

  public result(): RDF.Term {
    return RDFDM.literal(this.state);
  }
}

class Sample extends BaseAggregator<RDF.Term | undefined> {
  public init(start: RDF.Term): RDF.Term {
    return start;
  }

  public _put(term: RDF.Term): void {
    return; // First value is our sample
  }

  public result(): RDF.Term {
    return this.state;
  }
}

export interface IAggregatorClass {
  new(expr: Algebra.BoundAggregate, start: RDF.Term): BaseAggregator<any>;
  emptyValue(): RDF.Term;
}
export const aggregatorClasses: Readonly<{ [key in Aggregator]: IAggregatorClass }> = {
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
    throw new Error("Term is not numeric");
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
