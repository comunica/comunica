import * as Promise from 'bluebird';
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import * as RDFDM from 'rdf-data-model';
import * as RDF from 'rdf-js';
import { Algebra } from 'sparqlalgebrajs';

import { Bindings } from '../core/Types';
import * as C from '../util/Consts';
import { InvalidArgumentTypes, InvalidArity, UnimplementedError } from '../util/Errors';

export enum expressionTypes {
  AGGREGATE = 'aggregate',
  EXISTENCE = 'existence',
  NAMED = 'named',
  OPERATOR = 'operator',
  TERM = 'term',
  VARIABLE = 'variable',
}

export type Expression =
  AggregateExpression |
  ExistenceExpression |
  NamedExpression |
  OperatorExpression |
  TermExpression |
  VariableExpression;

export interface ExpressionProps {
  expressionType: 'aggregate' | 'existence' | 'named' | 'operator' | 'term' | 'variable';
}

export type AggregateExpression = ExpressionProps & {
  expressionType: 'aggregate';
  aggregator: string;
  distinct: boolean;
  separator?: string; // used by GROUP_CONCAT
  expression: Expression;
};

export type ExistenceExpression = ExpressionProps & {
  expressionType: 'existence';
  not: boolean;
  input: Algebra.Operation;
};

export type NamedExpression = ExpressionProps & {
  expressionType: 'named';
  name: RDF.NamedNode;
  args: Expression[];
};

export type OperatorExpression = ExpressionProps & {
  expressionType: 'operator';
  args: Expression[];
  func: SPARQLFunc;
};

export type TermType = 'namedNode' | 'literal';
export type TermExpression = ExpressionProps & {
  expressionType: 'term';
  termType: TermType;
  str(): string;
  coerceEBV(): boolean;
  toRDF(): RDF.Term;
};

export type VariableExpression = ExpressionProps & {
  expressionType: 'variable';
  name: string;
};

// ----------------------------------------------------------------------------
// Variable
// ----------------------------------------------------------------------------

export class Variable implements VariableExpression {
  expressionType: 'variable' = 'variable';
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

// ----------------------------------------------------------------------------
// Terms
// ----------------------------------------------------------------------------

export abstract class Term implements TermExpression {
  expressionType: 'term' = 'term';
  abstract termType: TermType;

  abstract toRDF(): RDF.Term;

  str(): string {
    throw new InvalidArgumentTypes([this], C.Operator.STR);
  }

  coerceEBV(): boolean {
    throw new TypeError('Cannot coerce this term to EBV.');
  }

}

export interface LiteralTerm extends TermExpression {
  category: C.DataTypeCategory;
}

export class Literal<T> extends Term implements LiteralTerm {
  expressionType: 'term' = 'term';
  termType: 'literal' = 'literal';
  category: C.DataTypeCategory;

  constructor(
    public typedValue: T,
    public strValue?: string,
    public dataType?: RDF.NamedNode,
    public language?: string) {
    super();
    this.category = C.categorize(dataType.value);
  }

  toRDF(): RDF.Term {
    return RDFDM.literal(
      this.strValue || this.typedValue.toString(),
      this.language || this.dataType);
  }
}

export class NumericLiteral extends Literal<number> {
  category: C.NumericTypeCategory;
  coerceEBV(): boolean {
    return !!this.typedValue;
  }
}

export class BooleanLiteral extends Literal<boolean> {
  coerceEBV(): boolean {
    return !!this.typedValue;
  }
}

export class DateTimeLiteral extends Literal<Date> { }

// https://www.w3.org/TR/2004/REC-rdf-concepts-20040210/#dfn-plain-literal
export class PlainLiteral extends Literal<string> {
  constructor(
    public typedValue: string,
    public strValue?: string,
    public language?: string) {
    super(typedValue, strValue, undefined, language);
    this.category = 'plain';
  }

  coerceEBV(): boolean {
    return this.strValue.length !== 0;
  }
}

// https://www.w3.org/TR/sparql11-query/#defn_SimpleLiteral
export class SimpleLiteral extends PlainLiteral {
  language?: undefined;
  category: 'simple';

  constructor(
    public typedValue: string,
    public strValue?: string) {
    super(typedValue, strValue, undefined);
    this.category = 'simple';
  }

  coerceEBV(): boolean {
    return this.strValue.length !== 0;
  }
}

export class StringLiteral extends Literal<string> {
  coerceEBV(): boolean {
    return this.strValue.length !== 0;
  }
}

/*
 * This class is used when a literal is parsed, and it's value is
 * an invalid lexical form for it's datatype. The spec defines value with
 * invalid lexical form are still valid terms, and as such we can not error
 * immediately. This class makes sure that the typedValue will remain undefined,
 * and the category 'other'. This way, only when operators apply to the
 * 'other' category, they will keep working, otherwise they will throw a
 * type error.
 * This seems to match the spec.
 *
 * See:
 *  - https://www.w3.org/TR/xquery/#dt-type-error
 *  - https://www.w3.org/TR/rdf-concepts/#section-Literal-Value
 *  - https://www.w3.org/TR/xquery/#dt-ebv
 *  - ... some other more precise thing i can't find...
 */
export class NonLexicalLiteral extends Literal<undefined> {
  constructor(
    typedValue: undefined,
    strValue?: string,
    dataType?: RDF.NamedNode,
    language?: string) {
    super(typedValue, strValue, dataType, language);
    this.typedValue = undefined;
    this.category = 'invalid';
  }
}

// ----------------------------------------------------------------------------
// Functions
// ----------------------------------------------------------------------------

/*
 * An Application is a type for a function, depending in the Application,
 * the evaluator needs to pass more info to the function (eg: SpecialApplication).
 *
 * Both SimpleFunctions and OverloadedFunctions have a simple application.
 * (although they evaluate in different manners, the API is the same).
 */

// TODO Type better

export interface SPARQLFuncProps {
  functionClass: 'simple' | 'overloaded' | 'special';
}

export type SPARQLFunc = SimpleFunc | OverloadedFunc | SpecialFunc;
export type SimpleFunc = SPARQLFuncProps & {
  functionClass: 'simple';
  apply: SimpleApplication;
};
export type OverloadedFunc = SPARQLFuncProps & {
  functionClass: 'overloaded';
  apply: SimpleApplication;
};
export type SpecialFunc = SPARQLFuncProps & {
  functionClass: 'special';
  apply: SpecialApplication;
};

// export interface ISPARQLFunc<SApplication extends Application> {
//   functionClass: 'simple' | 'overloaded' | 'special';
//   apply: SApplication;
// }

export type Application = SimpleApplication | SpecialApplication;
export type SimpleApplication = (args: TermExpression[]) => TermExpression;
export type SpecialApplication =
  (
    args: Expression[],
    mapping: Bindings,
    evaluate: Evaluator,
  ) => Promise<TermExpression>;

export type Evaluator = (e: Expression, mapping: Bindings) => Promise<TermExpression>;
