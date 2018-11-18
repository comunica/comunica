import * as RDFDM from '@rdfjs/data-model';
import * as RDF from 'rdf-js';
import { Algebra } from 'sparqlalgebrajs';

import * as C from '../util/Consts';
import * as Err from '../util/Errors';

import { Bindings } from './Types';

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
  func: { apply: SimpleApplication }
  args: Expression[];
};

export type Evaluator = (e: Expression, mapping: Bindings) => Promise<TermExpression>;
export type EvalContext = { args: Expression[], mapping: Bindings, evaluate: Evaluator };

export type Application = SimpleApplication | SpecialApplication;
export type SimpleApplication = (args: TermExpression[]) => TermExpression;
export type SpecialApplication = (context: EvalContext) => Promise<TermExpression>;

export type OperatorExpression = ExpressionProps & {
  expressionType: ExpressionType.Operator;
  args: Expression[];
  func: { apply: SimpleApplication; };
};

export type SpecialOperatorExpression = ExpressionProps & {
  expressionType: ExpressionType.SpecialOperator,
  args: Expression[],
  func: { apply: SpecialApplication; },
};

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
    throw new Err.InvalidArgumentTypes([this], C.RegularOperator.STR);
  }

  coerceEBV(): boolean {
    throw new Err.EBVCoercionError(this);
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
  type: C.Type;
}

export class Literal<T> extends Term implements LiteralTerm {
  expressionType: ExpressionType.Term = ExpressionType.Term;
  termType: 'literal' = 'literal';
  type: C.Type;

  constructor(
    public typedValue: T,
    public strValue?: string,
    public typeURL?: RDF.NamedNode,
    public language?: string) {
    super();
    this.type = C.type(typeURL.value);
  }

  toRDF(): RDF.Term {
    return RDFDM.literal(
      this.strValue || this.typedValue.toString(),
      this.language || this.typeURL);
  }

  str(): string {
    return this.strValue || this.typedValue.toString();
  }
}

export class NumericLiteral extends Literal<number> {
  type: C.NumericTypeCategory;
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
  constructor(public typedValue: boolean, public strValue?: string) {
    super(typedValue, strValue, C.make(C.TypeURL.XSD_BOOLEAN));
  }
  coerceEBV(): boolean {
    return !!this.typedValue;
  }
}

export class DateTimeLiteral extends Literal<Date> {
  constructor(public typedValue: Date, public strValue?: string) {
    super(typedValue, strValue, C.make(C.TypeURL.XSD_DATE_TIME));
  }
}

export class LangStringLiteral extends Literal<string> {
  constructor(public typedValue: string, public language: string) {
    super(typedValue, typedValue, C.make(C.TypeURL.RDF_LANG_STRING), language);
  }

  coerceEBV(): boolean {
    return this.strValue.length !== 0;
  }
}

// https://www.w3.org/TR/2004/REC-rdf-concepts-20040210/#dfn-plain-literal
// https://www.w3.org/TR/sparql11-query/#defn_SimpleLiteral
// https://www.w3.org/TR/sparql11-query/#func-strings
// This does not include language tagged literals
export class StringLiteral extends Literal<string> {
  constructor(public typedValue: string) {
    super(typedValue, typedValue, C.make(C.TypeURL.XSD_STRING));
  }

  coerceEBV(): boolean {
    return this.strValue.length !== 0;
  }
}

/*
 * This class is used when a literal is parsed, and it's value is
 * an invalid lexical form for it's datatype. The spec defines value with
 * invalid lexical form are still valid terms, and as such we can not error
 * immediately. This class makes sure that the typedValue will remain undefined,
 * and the category 'nonlexical'. This way, only when operators apply to the
 * 'nonlexical' category, they will keep working, otherwise they will throw a
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
  private shouldBeCategory: C.Type;
  constructor(
    typedValue: undefined,
    strValue?: string,
    dataType?: RDF.NamedNode,
    language?: string) {
    super(typedValue, strValue, dataType, language);
    this.typedValue = undefined;
    this.type = 'nonlexical';
    this.shouldBeCategory = C.type(dataType.value);
  }

  coerceEBV(): boolean {
    const isNumericOrBool =
      C.NumericTypeCategories.contains(this.shouldBeCategory)
      || this.shouldBeCategory === 'boolean';

    if (isNumericOrBool) { return false; }
    throw new Err.EBVCoercionError(this);
  }
}
