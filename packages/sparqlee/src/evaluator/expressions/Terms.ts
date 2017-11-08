import * as RDFJS from 'rdf-js';
import * as RDFDM from 'rdf-data-model';

import { Expression, ExpressionType } from './Types';


export interface Term extends Expression {
    termType: TermType

    toEBV(): boolean
    rdfEqual(other: Term): boolean
    rdfNotEqual(other: Term): boolean

    // TODO: Maybe just return the native types (eg: boolean, number)
    not(): boolean
    unPlus(): number
    unMin(): number

    lt(other: Term): boolean
    gt(other: Term): boolean
    lte(other: Term): boolean
    gte(other: Term): boolean

    multiply(other: Term): number
    divide(other: Term): number
    add(other: Term): number
    subtract(other: Term): number

    toRDFJS(): RDFJS.Term
}

// RDFTerm = IRI, literal, blank node
// TODO: Maybe think about removing DefaultGraph

export enum TermType {
    NamedNode,
    BlankNode,
    Literal,
    DefaultGraph,
}

export abstract class BaseTerm implements Term {
    abstract termType: TermType;
    exprType = ExpressionType.Term;

    // https://www.w3.org/TR/sparql11-query/#ebv
    toEBV(): boolean {
        throw TypeError;
    }

    rdfEqual(other: Term): boolean {
        // TODO
        return undefined;
    }

    rdfNotEqual(other: Term): boolean {
        return !this.rdfEqual(other);
    }

    not(): boolean { throw Error; }
    unPlus(): number { throw Error; }
    unMin(): number { throw Error; }

    lt(other: Term): boolean { throw Error; }
    gt(other: Term): boolean { throw Error; }
    lte(other: Term): boolean { throw Error; }
    gte(other: Term): boolean { throw Error; }

    multiply(other: Term): number { throw Error; }
    divide(other: Term): number { throw Error; }
    add(other: Term): number { throw Error; }
    subtract(other: Term): number { throw Error; }

    abstract toRDFJS(): RDFJS.Term;
}

// ============================================================================

export class NamedNode extends BaseTerm {
    termType = TermType.NamedNode;
    iri: string;

    constructor(iri: string) {
        super();
        this.iri = iri;
    }

    toRDFJS(): RDFJS.Term {
        return RDFDM.namedNode(this.iri);
    }
}

// ============================================================================

export class BlankNode extends BaseTerm {
    termType = TermType.BlankNode;
    name: string;

    constructor(name: string) {
        super();
        this.name = name;
    }

    toRDFJS(): RDFJS.Term {
        return RDFDM.blankNode(name);
    }
}

// ============================================================================

export class DefaultGraph extends BaseTerm {
    termType = TermType.DefaultGraph;

    constructor() {
        super();
    }

    toRDFJS(): RDFJS.Term {
        return RDFDM.defaultGraph();
    }
}

// ============================================================================

export interface Literal<T> extends Term {
    value: T
    dataType?: string
}

export abstract class BaseLiteral<T> extends BaseTerm implements Literal<T> {
    termType = TermType.Literal;

    value: T;
    abstract dataType?: string;

    constructor(value: T) {
        super();
        this.value = value;
    }

    toRDFJS(): RDFJS.Term {
        return RDFDM.literal(this.value.toString(), this.dataType);
    }
}

export abstract class PlainLiteral extends BaseLiteral<string> {
    dataType: undefined;

    constructor(value: string) {
        super(value);
    }

    toEBV(): boolean {
        return this.value.length != 0;
    }
}

export class SimpleLiteral extends PlainLiteral { 
    rdfEqual(other: SimpleLiteral): boolean {
        return this.value === other.value;
    }

    rdfNotEqual(other: SimpleLiteral): boolean {
        return this.value !== other.value;
    }

    lt(other: SimpleLiteral): boolean {
        return this.value < other.value;
    }

    gt(other: SimpleLiteral): boolean {
        return this.value > other.value;
    }

    lte(other: SimpleLiteral): boolean {
        return this.value <= other.value;
    }

    gte(other: SimpleLiteral): boolean {
        return this.value >= other.value;
    }
}

export class LangLiteral extends PlainLiteral implements Literal<string> {
    language: string;

    constructor(value: string, language: string) {
        super(value);
        this.language = language;
    }

    toRDFJS(): RDFJS.Term {
        return RDFDM.literal(this.value, this.language);
    }
}

export abstract class TypedLiteral<T> extends BaseLiteral<T> {
    dataType: string;

    constructor(value: T) {
        super(value);
    }
}


export class BooleanLiteral extends TypedLiteral<boolean> {
    dataType: "xsd:boolean";

    constructor(value: boolean) {
        super(value);
    }

    toEBV(): boolean {
        return this.value;
    }

    not(): boolean {
        return !this.value;
    }
}

export class StringLiteral extends TypedLiteral<string> {
    dataType: "xsd:string";

    constructor(value: string) {
        super(value);
    }

    toEBV(): boolean {
        return this.value.length != 0;
    }

    rdfEqual(other: StringLiteral): boolean {
        return this.value === other.value;
    }

    rdfNotEqual(other: StringLiteral): boolean {
        return this.value !== other.value;
    }

    lt(other: StringLiteral): boolean {
        return this.value < other.value;
    }

    gt(other: StringLiteral): boolean {
        return this.value > other.value;
    }

    lte(other: StringLiteral): boolean {
        return this.value <= other.value;
    }

    gte(other: StringLiteral): boolean {
        return this.value >= other.value;
    }
}

// https://www.w3.org/TR/sparql11-query/#operandDataTypes
export type numericTypes =
    "xsd:integer"
    | "xsd:decimal"
    | "xsd:float"
    | "xsd:double"
    | "xsd:nonPositiveInteger"
    | "xsd:negativeInteger"
    | "xsd:long"
    | "xsd:int"
    | "xsd:short"
    | "xsd:byte"
    | "xsd:nonNegativeInteger"
    | "xsd:unsignedLong"
    | "xsd:unsignedInt"
    | "xsd:unsignedShort"
    | "xsd:unsignedByte"
    | "xsd:positiveInteger"

export class NumericLiteral extends TypedLiteral<number> {
    dataType: numericTypes;

    constructor(value: number, dataType: numericTypes) {
        super(value);
        this.dataType = dataType;
    }

    toEBV(): boolean {
        // Easiest way to handle NaN, 0, and truths values
        return !!this.value;
    }

    // TODO: DataType might change
    unPlus(): number {
        return this.value;
    }

    unMin(): number {
        return -this.value;
    }

    rdfEqual(other: NumericLiteral): boolean {
        return this.value === other.value;
    }

    rdfNotEqual(other: NumericLiteral): boolean {
        return this.value !== other.value;
    }

    lt(other: NumericLiteral): boolean {
        return this.value < other.value;
    }

    gt(other: NumericLiteral): boolean {
        return this.value > other.value;
    }

    lte(other: NumericLiteral): boolean {
        return this.value <= other.value;
    }

    gte(other: NumericLiteral): boolean {
        return this.value >= other.value;
    }

    multiply(other: NumericLiteral): number { 
        return this.value * other.value; 
    }

    divide(other: NumericLiteral): number {
        return this.value / other.value;
    }

    add(other: NumericLiteral): number { 
        return this.value + other.value;
     }

    subtract(other: NumericLiteral): number { 
        return this.value - other.value;
    }
}

export class DateTimeLiteral extends TypedLiteral<Date> {
    dataType: "xsd:dateTime";

    constructor(value: Date) {
        super(value);
    }

    rdfEqual(other: DateTimeLiteral): boolean {
        return this.value.getTime() === other.value.getTime();
    }

    rdfNotEqual(other: DateTimeLiteral): boolean {
        return this.value.getTime() !== other.value.getTime();
    }

    lt(other: DateTimeLiteral): boolean {
        return this.value < other.value;
    }

    gt(other: DateTimeLiteral): boolean {
        return this.value > other.value;
    }

    lte(other: DateTimeLiteral): boolean {
        return this.value <= other.value;
    }

    gte(other: DateTimeLiteral): boolean {
        return this.value >= other.value;
    }
}