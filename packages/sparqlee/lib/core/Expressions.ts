import * as RDFDM from '@rdfjs/data-model';
import * as Promise from 'bluebird';
import * as RDF from 'rdf-js';
import { Algebra } from 'sparqlalgebrajs';

import { Bindings } from '../core/Types';
import * as C from '../util/Consts';
import { EBVCoercionError, InvalidArgumentTypes } from '../util/Errors';

export enum ExpressionType {
  Aggregate = 'aggregate',
  Existence = 'existence',
  Named = 'named',
  Operator = 'operator',
  SpecialOperator = 'specialOperator',
  Term = 'term',
  Variable = 'variable',
}

export type Expression =
  AggregateExpression |
  ExistenceExpression |
  NamedExpression |
  OperatorExpression |
  SpecialOperatorExpression |
  TermExpression |
  VariableExpression;

export interface ExpressionProps {
  expressionType: ExpressionType;
}

export type AggregateExpression = ExpressionProps & {
  expressionType: ExpressionType.Aggregate;
  aggregator: string;
  distinct: boolean;
  separator?: string; // used by GROUP_CONCAT
  expression: Expression;
};

export type ExistenceExpression = ExpressionProps & {
  expressionType: ExpressionType.Existence;
  not: boolean;
  input: Algebra.Operation;
};

export type NamedExpression = ExpressionProps & {
  expressionType: ExpressionType.Named;
  name: RDF.NamedNode;
  args: Expression[];
};

export type SimpleApplication = (args: TermExpression[]) => TermExpression;
export type OperatorExpression = ExpressionProps & {
  expressionType: ExpressionType.Operator;
  args: Expression[];
  func: {
    apply: SimpleApplication;
  };
};

export type SpecialOperatorExpression = ExpressionProps & {
  expressionType: ExpressionType.SpecialOperator,
  args: Expression[],
  func: {
    apply: SpecialApplication;
  },
};
export type SpecialApplication =
  (
    args: Expression[],
    mapping: Bindings,
    evaluate: Evaluator,
  ) => Promise<TermExpression>;
export type Evaluator = (e: Expression, mapping: Bindings) => Promise<TermExpression>;

export type TermType = 'namedNode' | 'literal';
export type TermExpression = ExpressionProps & {
  expressionType: ExpressionType.Term;
  termType: TermType;
  str(): string;
  coerceEBV(): boolean;
  toRDF(): RDF.Term;
};

export type VariableExpression = ExpressionProps & {
  expressionType: ExpressionType.Variable;
  name: string;
};

// ----------------------------------------------------------------------------
// Variable
// ----------------------------------------------------------------------------

export class Variable implements VariableExpression {
  expressionType: ExpressionType.Variable = ExpressionType.Variable;
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

// ----------------------------------------------------------------------------
// Terms
// ----------------------------------------------------------------------------

export abstract class Term implements TermExpression {
  expressionType: ExpressionType.Term = ExpressionType.Term;
  abstract termType: TermType;

  abstract toRDF(): RDF.Term;

  str(): string {
    throw new InvalidArgumentTypes([this], C.Operator.STR);
  }

  coerceEBV(): boolean {
    throw new EBVCoercionError(this);
  }

}

export class NamedNode extends Term {
  termType: TermType = 'namedNode';
  constructor(public value: string) { super(); }

  toRDF(): RDF.Term {
    return RDFDM.namedNode(this.value);
  }

  str(): string {
    return this.value;
  }
}

export interface LiteralTerm extends TermExpression {
  category: C.DataTypeCategory;
}

export class Literal<T> extends Term implements LiteralTerm {
  expressionType: ExpressionType.Term = ExpressionType.Term;
  termType: 'literal' = 'literal';
  category: C.DataTypeCategory;

  constructor(
    public typedValue: T,
    public strValue?: string,
    public dataType?: RDF.NamedNode,
    public language?: string) {
    super();
    this.category = (dataType)
      ? C.categorize(dataType.value)
      : 'plain';
  }

  toRDF(): RDF.Term {
    return RDFDM.literal(
      this.strValue || this.typedValue.toString(),
      this.language || this.dataType);
  }

  str(): string {
    return this.strValue || this.typedValue.toString();
  }
}

export class NumericLiteral extends Literal<number> {
  category: C.NumericTypeCategory;
  coerceEBV(): boolean {
    return !!this.typedValue;
  }
  toRDF(): RDF.Term {
    const term = super.toRDF();
    if (!isFinite(this.typedValue)) {
      term.value = term.value.replace('Infinity', 'INF');
    }
    return term;
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
    this.dataType = (this.language)
      ? C.make(C.DataType.RDF_LANG_STRING)
      : undefined;
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
 * and the category 'invalid'. This way, only when operators apply to the
 * 'invalid' category, they will keep working, otherwise they will throw a
 * type error.
 * This seems to match the spec, except maybe for functions that accept
 * non-lexical values for their datatype.
 *
 * See:
 *  - https://www.w3.org/TR/xquery/#dt-type-error
 *  - https://www.w3.org/TR/rdf-concepts/#section-Literal-Value
 *  - https://www.w3.org/TR/xquery/#dt-ebv
 *  - ... some other more precise thing i can't find...
 */
export class NonLexicalLiteral extends Literal<undefined> {
  private shouldBeCategory: C.DataTypeCategory;
  constructor(
    typedValue: undefined,
    strValue?: string,
    dataType?: RDF.NamedNode,
    language?: string) {
    super(typedValue, strValue, dataType, language);
    this.typedValue = undefined;
    this.category = 'invalid';
    this.shouldBeCategory = C.categorize(dataType.value);
  }

  coerceEBV(): boolean {
    const isNumericOrBool =
      C.NumericTypeCategories.contains(this.shouldBeCategory)
      || this.shouldBeCategory === 'boolean';

    if (isNumericOrBool) { return false; }
    throw new EBVCoercionError(this);
  }
}
