import * as RDF from 'rdf-js';
import { Algebra } from 'sparqlalgebrajs';
import * as C from './Consts';

import * as E from '../core/Expressions';

export class UnimplementedError extends Error {
  constructor() {
    super('Unimplemented feature!');
  }
}

export class InvalidLexicalForm extends Error {
  constructor(public args: RDF.Term) {
    super('Invalid lexical form.');
  }
}

export class RDFEqualTypeError extends Error {
  constructor(public args: E.IExpression[]) {
    super('Equality test for literals with unsupported datatypes');
  }
}

export class CoalesceError extends Error {
  constructor(public errors: Error[]) {
    super('All COALESCE arguments threw errors');
  }
}

export class InError extends Error {
  constructor(public errors: (Error | false)[]) {
    super(
      'Some argument to IN errored and none where equal. ' +
      errors.map((err) => `(${err.toString()}) `).join('and '));
  }
}

export class InvalidArity extends Error {
  constructor(public args: E.IExpression[], public op: C.Operator) {
    super('The amount of args don\'t match the arity of the operator.');
  }
}

export class InvalidArgumentTypes extends Error {
  constructor(public args: E.IExpression[], public op: C.Operator) {
    super("Argument types not valid for operator.");
  }
}
export class InvalidExpressionType extends Error {
  constructor(public expr: any) {
    super('The given expression type is not valid.');
  }
}

export class InvalidTermType extends Error {
  constructor(public term: Algebra.TermExpression) {
    super('The given term type is invalid.');
  }
}

export class UnexpectedError extends Error {
  constructor(message: string, public payload?: any) {
    super('Programmer Error ' + message);
  }
}
