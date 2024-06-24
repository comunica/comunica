import type * as RDF from '@rdfjs/types';
import type { IDateRepresentation, IDateTimeRepresentation, IDurationRepresentation, ITimeRepresentation, IYearMonthDurationRepresentation } from '../util/DateTimeHelpers';
import type { ISuperTypeProvider } from '../util/TypeHandling';
import type { TermExpression, TermType } from './Expressions';
import { ExpressionType } from './Expressions';
export declare abstract class Term implements TermExpression {
    expressionType: ExpressionType.Term;
    abstract termType: TermType;
    abstract toRDF(): RDF.Term;
    str(): string;
    coerceEBV(): boolean;
}
export declare class NamedNode extends Term {
    value: string;
    termType: TermType;
    constructor(value: string);
    toRDF(): RDF.Term;
    str(): string;
}
export declare class BlankNode extends Term {
    value: RDF.BlankNode;
    termType: TermType;
    constructor(value: RDF.BlankNode | string);
    toRDF(): RDF.Term;
}
export declare class Quad extends Term {
    termType: TermType;
    private readonly transformer;
    private readonly valueTerm;
    constructor(input: RDF.BaseQuad, superTypeProvider: ISuperTypeProvider);
    toRDF(): RDF.BaseQuad;
    get subject(): Term;
    get predicate(): Term;
    get object(): Term;
    get RDFsubject(): RDF.Term;
    get RDFpredicate(): RDF.Term;
    get RDFobject(): RDF.Term;
}
export declare function isLiteralTermExpression(expr: TermExpression): Literal<any> | undefined;
export interface ISerializable {
    toString: () => string;
}
export declare class Literal<T extends ISerializable> extends Term {
    typedValue: T;
    dataType: string;
    strValue?: string | undefined;
    language?: string | undefined;
    termType: "literal";
    /**
     * @param typedValue internal representation of this literal's value
     * @param dataType a string representing the datatype. Can be of type @see LiteralTypes or any URI
     * @param strValue the string value of this literal. In other words, the string representing the RDF.literal value.
     * @param language the language, mainly for language enabled strings like RDF_LANG_STRING
     */
    constructor(typedValue: T, dataType: string, strValue?: string | undefined, language?: string | undefined);
    toRDF(): RDF.Literal;
    str(): string;
}
export declare abstract class NumericLiteral extends Literal<number> {
    typedValue: number;
    strValue?: string | undefined;
    language?: string | undefined;
    protected constructor(typedValue: number, dataType: string, strValue?: string | undefined, language?: string | undefined);
    protected abstract specificFormatter(val: number): string;
    coerceEBV(): boolean;
    toRDF(): RDF.Literal;
    str(): string;
}
export declare class IntegerLiteral extends NumericLiteral {
    typedValue: number;
    strValue?: string | undefined;
    language?: string | undefined;
    constructor(typedValue: number, dataType?: string, strValue?: string | undefined, language?: string | undefined);
    protected specificFormatter(val: number): string;
}
export declare class DecimalLiteral extends NumericLiteral {
    typedValue: number;
    strValue?: string | undefined;
    language?: string | undefined;
    constructor(typedValue: number, dataType?: string, strValue?: string | undefined, language?: string | undefined);
    protected specificFormatter(val: number): string;
}
export declare class FloatLiteral extends NumericLiteral {
    typedValue: number;
    strValue?: string | undefined;
    language?: string | undefined;
    constructor(typedValue: number, dataType?: string, strValue?: string | undefined, language?: string | undefined);
    protected specificFormatter(val: number): string;
}
export declare class DoubleLiteral extends NumericLiteral {
    typedValue: number;
    strValue?: string | undefined;
    language?: string | undefined;
    constructor(typedValue: number, dataType?: string, strValue?: string | undefined, language?: string | undefined);
    protected specificFormatter(val: number): string;
}
export declare class BooleanLiteral extends Literal<boolean> {
    typedValue: boolean;
    strValue?: string | undefined;
    constructor(typedValue: boolean, strValue?: string | undefined, dataType?: string);
    coerceEBV(): boolean;
}
export declare class LangStringLiteral extends Literal<string> {
    typedValue: string;
    language: string;
    constructor(typedValue: string, language: string, dataType?: string);
    coerceEBV(): boolean;
}
export declare class StringLiteral extends Literal<string> {
    typedValue: string;
    /**
     * @param typedValue
     * @param dataType Should be type that implements XSD_STRING
     */
    constructor(typedValue: string, dataType?: string);
    coerceEBV(): boolean;
}
export declare class DateTimeLiteral extends Literal<IDateTimeRepresentation> {
    typedValue: IDateTimeRepresentation;
    strValue?: string | undefined;
    constructor(typedValue: IDateTimeRepresentation, strValue?: string | undefined, dataType?: string);
    str(): string;
}
export declare class TimeLiteral extends Literal<ITimeRepresentation> {
    typedValue: ITimeRepresentation;
    strValue?: string | undefined;
    constructor(typedValue: ITimeRepresentation, strValue?: string | undefined, dataType?: string);
    str(): string;
}
export declare class DateLiteral extends Literal<IDateRepresentation> {
    typedValue: IDateRepresentation;
    strValue?: string | undefined;
    constructor(typedValue: IDateRepresentation, strValue?: string | undefined, dataType?: string);
    str(): string;
}
export declare class DurationLiteral extends Literal<Partial<IDurationRepresentation>> {
    typedValue: Partial<IDurationRepresentation>;
    strValue?: string | undefined;
    constructor(typedValue: Partial<IDurationRepresentation>, strValue?: string | undefined, dataType?: string);
    str(): string;
}
export declare class DayTimeDurationLiteral extends DurationLiteral {
    typedValue: Partial<IDurationRepresentation>;
    strValue?: string | undefined;
    constructor(typedValue: Partial<IDurationRepresentation>, strValue?: string | undefined, dataType?: string);
}
export declare class YearMonthDurationLiteral extends Literal<Partial<IYearMonthDurationRepresentation>> {
    typedValue: Partial<IYearMonthDurationRepresentation>;
    strValue?: string | undefined;
    constructor(typedValue: Partial<IYearMonthDurationRepresentation>, strValue?: string | undefined, dataType?: string);
    str(): string;
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
export declare class NonLexicalLiteral extends Literal<{
    toString: () => 'undefined';
}> {
    private readonly openWorldType;
    constructor(typedValue: undefined, dataType: string, openWorldType: ISuperTypeProvider, strValue?: string, language?: string);
    coerceEBV(): boolean;
    toRDF(): RDF.Literal;
    str(): string;
}
export declare function isNonLexicalLiteral(lit: Literal<any>): NonLexicalLiteral | undefined;
