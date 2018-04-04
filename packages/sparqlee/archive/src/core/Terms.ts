import * as console from 'console';
import * as RDFDM from 'rdf-data-model';
import * as RDFJS from 'rdf-js';

import { DataType as DT, NumericType } from '../util/Consts';
import { InvalidOperationError, UnimplementedError } from '../util/Errors';
import { ExpressionType, ITerm, TermType } from './Expressions';
import { Impl, ImplType } from './Operators';

export abstract class BaseTerm implements ITerm {
  public abstract termType: TermType;
  public exprType = ExpressionType.Term;
  public implType = ImplType.Term;

  // https://www.w3.org/TR/sparql11-query/#ebv
  public toEBV(): boolean {
    throw new InvalidOperationError();
  }

  public not(): boolean { throw new InvalidOperationError(); }
  public unPlus(): number { throw new InvalidOperationError(); }
  public unMin(): number { throw new InvalidOperationError(); }

  public abstract toRDFJS(): RDFJS.Term;

}

// ============================================================================

export class NamedNode extends BaseTerm {
  public termType = TermType.NamedNode;
  public iri: string;

  constructor(iri: string) {
    super();
    this.iri = iri;
  }

  public toRDFJS(): RDFJS.Term {
    return RDFDM.namedNode(this.iri);
  }
}

// ============================================================================

export class BlankNode extends BaseTerm {
  public termType = TermType.BlankNode;
  public name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  public toRDFJS(): RDFJS.Term {
    return RDFDM.blankNode(this.name);
  }
}

// ============================================================================

export class DefaultGraph extends BaseTerm {
  public termType = TermType.DefaultGraph;

  constructor() {
    super();
  }

  public toRDFJS(): RDFJS.Term {
    return RDFDM.defaultGraph();
  }
}

// ============================================================================

export interface ILiteral<T> extends ITerm {
  value: T;
  dataType?: string;
}

export abstract class BaseLiteral<T> extends BaseTerm implements ILiteral<T> {
  public termType = TermType.Literal;

  public value: T;
  public abstract dataType?: string;

  constructor(value: T) {
    super();
    this.value = value;
  }

  public toRDFJS(): RDFJS.Term {
    return RDFDM.literal(this.value.toString(), this.dataType);
  }
}

export abstract class PlainLiteral extends BaseLiteral<string> {
  public dataType: undefined = undefined;

  constructor(value: string) {
    super(value);
  }

  public toEBV(): boolean {
    return this.value.length !== 0;
  }
}

export class SimpleLiteral extends PlainLiteral {
  public implType = ImplType.Simple;
}

export class LangLiteral extends PlainLiteral implements ILiteral<string> {
  public language: string;

  constructor(value: string, language: string) {
    super(value);
    this.language = language;
  }

  public toRDFJS(): RDFJS.Term {
    return RDFDM.literal(this.value, this.language);
  }
}

export class TypedLiteral<T> extends BaseLiteral<T> {
  public dataType: string;

  constructor(value: T, dataType?: string) {
    super(value);
  }
}

export class BooleanLiteral extends TypedLiteral<boolean> {
  public dataType: DT.XSD_BOOLEAN = DT.XSD_BOOLEAN;
  public implType = ImplType.Boolean;

  constructor(value: boolean) {
    super(value);
  }

  public toEBV(): boolean {
    return this.value;
  }

  public not(): boolean {
    return !this.value;
  }
}

export class StringLiteral extends TypedLiteral<string> {
  public dataType: DT.XSD_STRING = DT.XSD_STRING;
  public implType = ImplType.String;

  constructor(value: string) {
    super(value);
  }

  public toEBV(): boolean {
    return this.value.length !== 0;
  }
}

export class NumericLiteral extends TypedLiteral<number> {
  public dataType: NumericType;
  public implType = ImplType.Numeric;

  // TODO: Check need for keeping datatype in literal
  // Possibly not needed at all
  constructor(value: number, dataType?: NumericType) {
    super(value);
    this.dataType = dataType;
  }

  public toEBV(): boolean {
    // Easiest way to handle NaN, 0, and truths values
    return !!this.value;
  }

  // TODO: DataType might change
  public unPlus(): number {
    return this.value;
  }

  public unMin(): number {
    return -this.value;
  }
}

export class DateTimeLiteral extends TypedLiteral<Date> {
  public dataType: DT.XSD_DATE_TIME = DT.XSD_DATE_TIME;
  public implType = ImplType.DateTime;

  constructor(value: Date) {
    super(value);
  }
}
