import * as console from 'console';
import * as RDFJS from 'rdf-js';
import * as RDFDM from 'rdf-data-model';

import { Impl, ImplType } from './BinOpImplementation';
import { Expression, ExpressionType } from './Types';
import { DataType as DT, NumericType } from '../../util/Consts';
import { UnimplementedError, InvalidOperationError } from '../../util/Errors';

export interface Term extends Expression {
    termType: TermType
    implType: ImplType

    toEBV(): boolean

    not(): boolean
    unPlus(): number
    unMin(): number

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
    implType = ImplType.Term;

    // https://www.w3.org/TR/sparql11-query/#ebv
    toEBV(): boolean {
        throw new InvalidOperationError();
    }

    not(): boolean { throw new InvalidOperationError(); }
    unPlus(): number { throw new InvalidOperationError(); }
    unMin(): number { throw new InvalidOperationError(); }

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
    dataType: undefined = undefined;

    constructor(value: string) {
        super(value);
    }

    toEBV(): boolean {
        return this.value.length != 0;
    }
}

export class SimpleLiteral extends PlainLiteral { 
    implType = ImplType.Simple;
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

export class TypedLiteral<T> extends BaseLiteral<T> {
    dataType: string;

    constructor(value: T, dataType?: string) {
        super(value);
    }
}


export class BooleanLiteral extends TypedLiteral<boolean> {
    dataType: DT.XSD_BOOLEAN = DT.XSD_BOOLEAN;
    implType = ImplType.Boolean;

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
    dataType: DT.XSD_STRING = DT.XSD_STRING;
    implType = ImplType.String;

    constructor(value: string) {
        super(value);
    }

    toEBV(): boolean {
        return this.value.length != 0;
    }
}

export class NumericLiteral extends TypedLiteral<number> {
    dataType: NumericType;
    implType = ImplType.Numeric;

    // TODO: Check need for keeping datatype in literal
    // Possibly not needed at all
    constructor(value: number, dataType?: NumericType) {
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
}

export class DateTimeLiteral extends TypedLiteral<Date> {
    dataType: DT.XSD_DATE_TIME = DT.XSD_DATE_TIME;
    implType = ImplType.DateTime;

    constructor(value: Date) {
        super(value);
    }
}