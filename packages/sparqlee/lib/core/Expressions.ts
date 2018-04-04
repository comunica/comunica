import * as Promise from 'bluebird';
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import * as RDFDM from 'rdf-data-model';
import * as RDF from 'rdf-js';
import { Algebra } from 'sparqlalgebrajs';

import { Bindings } from '../core/Bindings';
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

export interface IExpression {
  expressionType: 'aggregate' | 'existence' | 'named' | 'operator' | 'term' | 'variable';
}

export interface IAggregateExpression extends IExpression {
  expressionType: 'aggregate';
  aggregator: string;
  distinct: boolean;
  separator?: string; // used by GROUP_CONCAT
  expression: IExpression;
}

export interface IExistenceExpression extends IExpression {
  expressionType: 'existence';
  not: boolean;
  input: Algebra.Operation;
}

export interface INamedExpression extends IExpression {
  expressionType: 'named';
  name: RDF.NamedNode;
  args: IExpression[];
}

export interface IOperatorExpression<Application extends ApplicationType> extends IExpression {
  expressionType: 'operator';
  args: IExpression[];
  func: ISPARQLFunc<Application>;
}

export interface ITermExpression extends IExpression {
  expressionType: 'term';
  termType: TermType;
  coerceEBV(): boolean;
  toRDF(): RDF.Term;
}
export type TermType = 'namedNode' | 'literal';

export interface IVariableExpression extends IExpression {
  expressionType: 'variable';
  name: string;
}

// ----------------------------------------------------------------------------
// Variable
// ----------------------------------------------------------------------------

export class Variable implements IVariableExpression {
  public expressionType: 'variable' = 'variable';
  public name: string;
  constructor(name: string) {
    this.name = name;
  }
}

// ----------------------------------------------------------------------------
// Terms
// ----------------------------------------------------------------------------

export abstract class Term implements ITermExpression {
  public expressionType: 'term' = 'term';
  public abstract termType: TermType;

  public coerceEBV(): boolean {
    throw new TypeError("Cannot coerce this term to EBV.");
  }

  public abstract toRDF(): RDF.Term;
}

export interface ILiteralTerm extends ITermExpression {
  category: C.DataTypeCategory;
}

export class Literal<T> extends Term implements ILiteralTerm {
  public expressionType: 'term' = 'term';
  public termType: 'literal' = 'literal';
  public category: C.DataTypeCategory;

  constructor(
    public typedValue: T,
    public strValue?: string,
    public dataType?: RDF.NamedNode,
    public language?: string) {
    super();
    this.category = C.categorize(dataType.value);
  }

  public toRDF(): RDF.Term {
    return RDFDM.literal(
      this.strValue || this.typedValue.toString(),
      this.language || this.dataType);
  }
}

export class NumericLiteral extends Literal<number> {
  public category: C.NumericTypeCategory;
  public coerceEBV(): boolean {
    return !!this.typedValue;
  }
}

export class BooleanLiteral extends Literal<boolean> {
  public coerceEBV(): boolean {
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

  public coerceEBV(): boolean {
    return this.strValue.length !== 0;
  }
}

// https://www.w3.org/TR/sparql11-query/#defn_SimpleLiteral
export class SimpleLiteral extends PlainLiteral {
  public language?: undefined;
  public category: 'simple';

  constructor(
    public typedValue: string,
    public strValue?: string) {
    super(typedValue, strValue, undefined);
    this.category = 'simple';
  }

  public coerceEBV(): boolean {
    return this.strValue.length !== 0;
  }
}

export class StringLiteral extends Literal<string> {
  public coerceEBV(): boolean {
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
    typedValue: any,
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

export interface ISPARQLFunc<Application extends ApplicationType> {
  functionClass: 'simple' | 'overloaded' | 'special';
  apply: Application;
}
export type SimpleApplication = (args: ITermExpression[]) => ITermExpression;

export type SpecialApplication =
  (
    args: IExpression[],
    mapping: Bindings,
    evaluate: Evaluator,
  ) => Promise<ITermExpression>;

export type ApplicationType = SimpleApplication | SpecialApplication;

export type Evaluator = (e: IExpression, mapping: Bindings) => Promise<ITermExpression>;
