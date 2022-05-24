import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';

import type { MainSparqlType, MainNumericSparqlType } from '../util/Consts';
import * as C from '../util/Consts';
import { TypeAlias, TypeURL } from '../util/Consts';
import * as Err from '../util/Errors';
import type { ISuperTypeProvider } from '../util/TypeHandling';
import { isSubTypeOf } from '../util/TypeHandling';
import type { TermExpression, TermType } from './Expressions';
import { ExpressionType } from './Expressions';

const DF = new DataFactory();

export abstract class Term implements TermExpression {
  public expressionType: ExpressionType.Term = ExpressionType.Term;
  abstract termType: TermType;

  abstract toRDF(): RDF.Term;

  public str(): string {
    throw new Err.InvalidArgumentTypes([ this ], C.RegularOperator.STR);
  }

  public coerceEBV(): boolean {
    throw new Err.EBVCoercionError(this);
  }
}

// NamedNodes -----------------------------------------------------------------
export class NamedNode extends Term {
  public termType: TermType = 'namedNode';
  public constructor(public value: string) {
    super();
  }

  public toRDF(): RDF.Term {
    return DF.namedNode(this.value);
  }

  public str(): string {
    return this.value;
  }
}

// BlankNodes -----------------------------------------------------------------

export class BlankNode extends Term {
  public value: RDF.BlankNode;
  public termType: TermType = 'blankNode';

  public constructor(value: RDF.BlankNode | string) {
    super();
    this.value = typeof value === 'string' ? DF.blankNode(value) : value;
  }

  public toRDF(): RDF.Term {
    return this.value;
  }
}

// Literals-- -----------------------------------------------------------------
export function isLiteralTermExpression(expr: TermExpression): Literal<any> | undefined {
  if (expr.termType === 'literal') {
    return <Literal<any>> expr;
  }
  return undefined;
}
export class Literal<T extends { toString: () => string }> extends Term {
  public termType: 'literal' = 'literal';
  public readonly mainSparqlType: MainSparqlType;
  /**
   * @param typedValue internal representation of this literal's value
   * @param dataType a string representing the datatype. Can be of type @see LiteralTypes or any URI
   * @param strValue the string value of this literal. In other words, the string representing the RDF.literal value.
   * @param language the language, mainly for language enabled strings like RDF_LANG_STRING
   * @param mainSparqlType the type used by sparql's main functions
   */
  public constructor(
    public typedValue: T,
    public dataType: string,
    public strValue?: string,
    public language?: string,
    mainSparqlType?: MainSparqlType,
  ) {
    super();
    this.mainSparqlType = mainSparqlType || 'other';
  }

  public toRDF(): RDF.Literal {
    return DF.literal(
      this.strValue || this.str(),
      this.language || DF.namedNode(this.dataType),
    );
  }

  public str(): string {
    return this.strValue || this.typedValue.toString();
  }
}

export abstract class NumericLiteral extends Literal<number> {
  public readonly mainSparqlType: MainNumericSparqlType;
  protected constructor(
    public typedValue: number,
    dataType: string,
    public strValue?: string,
    public language?: string,
    mainSparqlType?: MainNumericSparqlType,
  ) {
    super(typedValue, dataType, strValue, language, mainSparqlType);
  }

  protected abstract specificFormatter(val: number): string;

  public coerceEBV(): boolean {
    return !!this.typedValue;
  }

  public toRDF(): RDF.Literal {
    const term = super.toRDF();
    if (!Number.isFinite(this.typedValue)) {
      term.value = term.value.replace('Infinity', 'INF');
    }
    return term;
  }

  public str(): string {
    return this.strValue ||
      this.specificFormatter(this.typedValue);
  }
}

export class IntegerLiteral extends NumericLiteral {
  public constructor(
    public typedValue: number,
    dataType?: string,
    public strValue?: string,
    public language?: string,
  ) {
    super(typedValue, dataType || TypeURL.XSD_INTEGER, strValue, language, 'integer');
  }

  protected specificFormatter(val: number): string {
    return val.toFixed(0);
  }
}

export class DecimalLiteral extends NumericLiteral {
  public constructor(
    public typedValue: number,
    dataType?: string,
    public strValue?: string,
    public language?: string,
  ) {
    super(typedValue, dataType || TypeURL.XSD_DECIMAL, strValue, language, 'decimal');
  }

  protected specificFormatter(val: number): string {
    return val.toString();
  }
}

export class FloatLiteral extends NumericLiteral {
  public constructor(
    public typedValue: number,
    dataType?: string,
    public strValue?: string,
    public language?: string,
  ) {
    super(typedValue, dataType || TypeURL.XSD_FLOAT, strValue, language, 'float');
  }

  protected specificFormatter(val: number): string {
    return val.toString();
  }
}

export class DoubleLiteral extends NumericLiteral {
  public constructor(
    public typedValue: number,
    dataType?: string,
    public strValue?: string,
    public language?: string,
  ) {
    super(typedValue, dataType || TypeURL.XSD_DOUBLE, strValue, language, 'double');
  }

  protected specificFormatter(val: number): string {
    if (!Number.isFinite(val)) {
      if (val > 0) {
        return 'INF';
      }
      if (val < 0) {
        return '-INF';
      }
      return 'NaN';
    }

    const jsExponential = val.toExponential();
    const [ jsMantisse, jsExponent ] = jsExponential.split('e');

    // Leading + must be removed for integer
    // https://www.w3.org/TR/xmlschema-2/#integer
    const exponent = jsExponent.replace(/\+/u, '');

    // SPARQL test suite prefers trailing zero's
    const mantisse = jsMantisse.includes('.') ?
      jsMantisse :
      `${jsMantisse}.0`;

    return `${mantisse}E${exponent}`;
  }
}

export class BooleanLiteral extends Literal<boolean> {
  public constructor(public typedValue: boolean, public strValue?: string, dataType?: string) {
    super(typedValue, dataType || TypeURL.XSD_BOOLEAN, strValue, undefined, 'boolean');
  }

  public coerceEBV(): boolean {
    return this.typedValue;
  }
}

export class DateTimeLiteral extends Literal<Date> {
  // StrValue is mandatory here because toISOString will always add
  // milliseconds, even if they were not present.
  public constructor(public typedValue: Date, public strValue: string, dataType?: string) {
    super(typedValue, dataType || TypeURL.XSD_DATE_TIME, strValue, undefined, 'dateTime');
  }
}

export class LangStringLiteral extends Literal<string> {
  public constructor(public typedValue: string, public language: string, dataType?: string) {
    super(typedValue, dataType || TypeURL.RDF_LANG_STRING, typedValue, language, 'langString');
  }

  public coerceEBV(): boolean {
    return this.str().length > 0;
  }
}

// https://www.w3.org/TR/2004/REC-rdf-concepts-20040210/#dfn-plain-literal
// https://www.w3.org/TR/sparql11-query/#defn_SimpleLiteral
// https://www.w3.org/TR/sparql11-query/#func-strings
// This does not include language tagged literals
export class StringLiteral extends Literal<string> {
  /**
   * @param typedValue
   * @param dataType Should be type that implements XSD_STRING
   */
  public constructor(public typedValue: string, dataType?: string) {
    super(typedValue, dataType || TypeURL.XSD_STRING, typedValue, undefined, 'string');
  }

  public coerceEBV(): boolean {
    return this.str().length > 0;
  }
}

/**
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
export class NonLexicalLiteral extends Literal<{ toString: () => 'undefined' }> {
  public constructor(
    typedValue: undefined,
    public typeURL: string,
    private readonly openWorldType: ISuperTypeProvider,
    strValue?: string,
    language?: string,
  ) {
    super({ toString: () => 'undefined' }, typeURL, strValue, language, 'nonlexical');
    this.typedValue = { toString: () => 'undefined' };
    this.dataType = TypeAlias.SPARQL_NON_LEXICAL;
  }

  public coerceEBV(): boolean {
    const isNumericOrBool =
      isSubTypeOf(this.typeURL, TypeURL.XSD_BOOLEAN, this.openWorldType) ||
      isSubTypeOf(this.typeURL, TypeAlias.SPARQL_NUMERIC, this.openWorldType);
    if (isNumericOrBool) {
      return false;
    }
    throw new Err.EBVCoercionError(this);
  }

  public toRDF(): RDF.Literal {
    return DF.literal(
      this.str(),
      this.language || DF.namedNode(this.typeURL),
    );
  }

  public str(): string {
    return this.strValue || '';
  }
}

export function isNonLexicalLiteral(lit: Literal<any>): NonLexicalLiteral | undefined {
  if (lit.dataType === TypeAlias.SPARQL_NON_LEXICAL) {
    return <NonLexicalLiteral> lit;
  }
  return undefined;
}
