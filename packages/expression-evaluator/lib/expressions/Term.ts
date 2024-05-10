import type {
  IDateRepresentation,
  IDateTimeRepresentation,
  IDurationRepresentation,
  ISuperTypeProvider,
  ITimeRepresentation,
  IYearMonthDurationRepresentation,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import * as C from '../util/Consts';
import { TypeAlias, TypeURL } from '../util/Consts';

import * as Err from '../util/Errors';
import { serializeDateTime, serializeDuration, serializeTime, serializeDate } from '../util/Serialization';
import { isSubTypeOf } from '../util/TypeHandling';
import type { TermExpression, TermType } from './Expressions';
import { ExpressionType } from './Expressions';

const DF = new DataFactory();

export abstract class Term implements TermExpression {
  public expressionType: ExpressionType.Term = ExpressionType.Term;
  public abstract termType: TermType;

  public abstract toRDF(): RDF.Term;

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

  public override str(): string {
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

// Quads -----------------------------------------------------------------
export class Quad extends Term {
  public termType: TermType = 'quad';

  public constructor(
    public readonly subject: Term,
    public readonly predicate: Term,
    public readonly object: Term,
    public readonly graph: Term,
  ) {
    super();
  }

  public toRDF(): RDF.BaseQuad {
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-expect-error
    return DF.quad(this.subject.toRDF(), this.predicate.toRDF(), this.object.toRDF(), this.graph.toRDF());
  }

  public override str(): string {
    return `Quad: [${this.subject.str()}, ${this.predicate.str()}, ${this.object.str()}, ${this.graph.str()}]`;
  }
}

export class DefaultGraph extends Term {
  public termType: TermType = 'defaultGraph';

  public constructor() {
    super();
  }

  public toRDF(): RDF.DefaultGraph {
    return DF.defaultGraph();
  }

  public override str(): string {
    return 'DefaultGraph';
  }
}

// Literals-- -----------------------------------------------------------------
export function isLiteralTermExpression(expr: TermExpression): Literal<any> | undefined {
  if (expr.termType === 'literal') {
    return <Literal<any>> expr;
  }
  return undefined;
}

export interface ISerializable {
  toString: () => string;
}

export class Literal<T extends ISerializable> extends Term {
  public termType = <const> 'literal';
  /**
   * @param typedValue internal representation of this literal's value
   * @param dataType a string representing the datatype. Can be of type @see LiteralTypes or any URI
   * @param strValue the string value of this literal. In other words, the string representing the RDF.literal value.
   * @param language the language, mainly for language enabled strings like RDF_LANG_STRING
   */
  public constructor(
    public typedValue: T,
    public dataType: string,
    public strValue?: string,
    public language?: string,
  ) {
    super();
  }

  public toRDF(): RDF.Literal {
    return DF.literal(
      this.strValue ?? this.str(),
      this.language ?? DF.namedNode(this.dataType),
    );
  }

  public override str(): string {
    return this.strValue ?? this.typedValue.toString();
  }
}

export abstract class NumericLiteral extends Literal<number> {
  protected constructor(
    public override typedValue: number,
    dataType: string,
    public override strValue?: string,
    public override language?: string,
  ) {
    super(typedValue, dataType, strValue, language);
  }

  protected abstract specificFormatter(val: number): string;

  public override coerceEBV(): boolean {
    return Boolean(this.typedValue);
  }

  public override toRDF(): RDF.Literal {
    const term = super.toRDF();
    if (!Number.isFinite(this.typedValue)) {
      term.value = term.value.replace('Infinity', 'INF');
    }
    return term;
  }

  public override str(): string {
    return this.strValue ??
      this.specificFormatter(this.typedValue);
  }
}

export class IntegerLiteral extends NumericLiteral {
  public constructor(
    public override typedValue: number,
    dataType?: string,
    public override strValue?: string,
    public override language?: string,
  ) {
    super(typedValue, dataType ?? TypeURL.XSD_INTEGER, strValue, language);
  }

  protected specificFormatter(val: number): string {
    return val.toFixed(0);
  }
}

export class DecimalLiteral extends NumericLiteral {
  public constructor(
    public override typedValue: number,
    dataType?: string,
    public override strValue?: string,
    public override language?: string,
  ) {
    super(typedValue, dataType ?? TypeURL.XSD_DECIMAL, strValue, language);
  }

  protected specificFormatter(val: number): string {
    return val.toString();
  }
}

export class FloatLiteral extends NumericLiteral {
  public constructor(
    public override typedValue: number,
    dataType?: string,
    public override strValue?: string,
    public override language?: string,
  ) {
    super(typedValue, dataType ?? TypeURL.XSD_FLOAT, strValue, language);
  }

  protected specificFormatter(val: number): string {
    return val.toString();
  }
}

export class DoubleLiteral extends NumericLiteral {
  public constructor(
    public override typedValue: number,
    dataType?: string,
    public override strValue?: string,
    public override language?: string,
  ) {
    super(typedValue, dataType ?? TypeURL.XSD_DOUBLE, strValue, language);
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
  public constructor(public override typedValue: boolean, public override strValue?: string, dataType?: string) {
    super(typedValue, dataType ?? TypeURL.XSD_BOOLEAN, strValue);
  }

  public override coerceEBV(): boolean {
    return this.typedValue;
  }
}

export class LangStringLiteral extends Literal<string> {
  public constructor(public override typedValue: string, public override language: string, dataType?: string) {
    super(typedValue, dataType ?? TypeURL.RDF_LANG_STRING, typedValue, language);
  }

  public override coerceEBV(): boolean {
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
  public constructor(public override typedValue: string, dataType?: string) {
    super(typedValue, dataType ?? TypeURL.XSD_STRING, typedValue);
  }

  public override coerceEBV(): boolean {
    return this.str().length > 0;
  }
}

export class DateTimeLiteral extends Literal<IDateTimeRepresentation> {
  public constructor(
    public override typedValue: IDateTimeRepresentation,
    public override strValue?: string,
    dataType?: string,
  ) {
    super(typedValue, dataType ?? TypeURL.XSD_DATE_TIME, strValue);
  }

  public override str(): string {
    return serializeDateTime(this.typedValue);
  }
}

export class TimeLiteral extends Literal<ITimeRepresentation> {
  public constructor(
    public override typedValue: ITimeRepresentation,
    public override strValue?: string,
    dataType?: string,
  ) {
    super(typedValue, dataType ?? TypeURL.XSD_TIME, strValue);
  }

  public override str(): string {
    return serializeTime(this.typedValue);
  }
}

export class DateLiteral extends Literal<IDateRepresentation> {
  public constructor(
    public override typedValue: IDateRepresentation,
    public override strValue?: string,
    dataType?: string,
  ) {
    super(typedValue, dataType ?? TypeURL.XSD_DATE, strValue);
  }

  public override str(): string {
    return serializeDate(this.typedValue);
  }
}

export class DurationLiteral extends Literal<Partial<IDurationRepresentation>> {
  public constructor(
    public override typedValue: Partial<IDurationRepresentation>,
    public override strValue?: string,
    dataType?: string,
  ) {
    super(typedValue, dataType ?? TypeURL.XSD_DURATION, strValue);
  }

  public override str(): string {
    return serializeDuration(this.typedValue);
  }
}

export class DayTimeDurationLiteral extends DurationLiteral {
  public constructor(
    public override typedValue: Partial<IDurationRepresentation>,
    public override strValue?: string,
    dataType?: string,
  ) {
    super(typedValue, strValue, dataType ?? TypeURL.XSD_DAY_TIME_DURATION);
  }
}

export class YearMonthDurationLiteral extends Literal<Partial<IYearMonthDurationRepresentation>> {
  public constructor(
    public override typedValue: Partial<IYearMonthDurationRepresentation>,
    public override strValue?: string,
    dataType?: string,
  ) {
    super(typedValue, dataType ?? TypeURL.XSD_YEAR_MONTH_DURATION, strValue);
  }

  public override str(): string {
    return serializeDuration(this.typedValue, 'P0M');
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
    dataType: string,
    private readonly openWorldType: ISuperTypeProvider,
    strValue?: string,
    language?: string,
  ) {
    super({ toString: () => 'undefined' }, dataType, strValue, language);
  }

  public override coerceEBV(): boolean {
    const isNumericOrBool =
      isSubTypeOf(this.dataType, TypeURL.XSD_BOOLEAN, this.openWorldType) ||
      isSubTypeOf(this.dataType, TypeAlias.SPARQL_NUMERIC, this.openWorldType);
    if (isNumericOrBool) {
      return false;
    }
    throw new Err.EBVCoercionError(this);
  }

  public override toRDF(): RDF.Literal {
    return DF.literal(
      this.str(),
      this.language ?? DF.namedNode(this.dataType),
    );
  }

  public override str(): string {
    return this.strValue ?? '';
  }
}

export function isNonLexicalLiteral(lit: Literal<any>): NonLexicalLiteral | undefined {
  if (lit instanceof NonLexicalLiteral) {
    return lit;
  }
  return undefined;
}
