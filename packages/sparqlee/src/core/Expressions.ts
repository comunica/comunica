import * as RDFDM from 'rdf-data-model';
import * as RDFJS from 'rdf-js';

import { ImplType } from './Operators';

export interface IExpression {
  exprType: ExpressionType;
}

// TODO: Convert to string enum for verbosity in debugging (currently ints)
export enum ExpressionType {
  Operation,
  FunctionCall,
  Aggregate,
  BGP,
  Group,
  Tuple,
  Variable,
  Term,
}

// TODO: Make this an interface
export class VariableExpression implements IExpression {
  public exprType: ExpressionType.Variable = ExpressionType.Variable;
  public name: string;

  constructor(name: string) {
    this.name = name;
  }

}

// TODO: Make this an interface
export class Tuple implements IExpression {
  public exprType: ExpressionType.Tuple = ExpressionType.Tuple;
  public exprs: IExpression[];

  constructor(exprs: IExpression[]) {
    this.exprs = exprs;
  }
}

export interface ITerm extends IExpression {
  exprType: ExpressionType;
  termType: TermType;
  implType: ImplType;

  toEBV(): boolean;

  not(): boolean;
  unPlus(): number;
  unMin(): number;

  toRDFJS(): RDFJS.Term;
}

// RDFTerm = IRI, literal, blank node
// TODO: Maybe think about removing DefaultGraph

export enum TermType {
  NamedNode,
  BlankNode,
  Literal,
  DefaultGraph,
}
