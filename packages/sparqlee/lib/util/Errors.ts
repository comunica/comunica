import * as RDF from 'rdf-js';
import { Algebra } from 'sparqlalgebrajs';

import * as E from '../expressions';
import * as C from './Consts';

import { Bindings } from '../Types';

/**
 * This error will be thrown when an expression errors.
 * Various reasons this could happen are:
 *   - invalid types for the given operator
 *   - unbound variables
 *   - invalid lexical forms
 *   - ...
 * The distinction is made so that one can catch this specific type
 * and handle it accordingly to the SPARQL spec (relevant for e.g. FILTER, EXTEND),
 * while others (programming errors) can be re-thrown.
 */
export class ExpressionError extends Error { }

export class InvalidLexicalForm extends ExpressionError {
  constructor(public args: RDF.Term) {
    super('Invalid lexical form');
  }
}

export class UnboundVariableError extends ExpressionError {
  constructor(public variable: string, public bindings: Bindings) {
    super(`Unbound variable ${variable}`);
  }
}

export class EBVCoercionError extends ExpressionError {
  constructor(public arg: E.Term) {
    super(`Cannot coerce term to EBV ${JSON.stringify(arg)}`);
  }
}

export class RDFEqualTypeError extends ExpressionError {
  constructor(public args: E.Expression[]) {
    super('Equality test for literals with unsupported datatypes');
  }
}

export class CoalesceError extends ExpressionError {
  constructor(public errors: Error[]) {
    super('All COALESCE arguments threw errors');
  }
}

export class InError extends ExpressionError {
  constructor(public errors: Array<Error | false>) {
    super(
      'Some argument to IN errorred and none where equal. ' +
      errors.map((err) => `(${err.toString()}) `).join('and '));
  }
}

export class InvalidArity extends ExpressionError {
  constructor(public args: E.Expression[], public op: C.Operator) {
    super('The amount of args don\'t match the arity of the operator.');
  }
}

export class InvalidArgumentTypes extends ExpressionError {
  // tslint:disable-next-line:no-any
  constructor(public args: E.Expression[], public op: C.Operator | C.NamedOperator) {
    super(`Argument types not valid for operator: '${op}' with '${args}`);
  }
}

export class CastError<T> extends ExpressionError {
  constructor(public arg: T, cast: C.TypeURL) {
    super(`Invalid cast: '${arg}' to '${cast}'`);
  }
}

// Non Expression Errors ------------------------------------------------------

/**
 * An error that arises when we detect a 'should-be-impossible' state.
 * Given that this error is thrown, it clearly wasn't impossible, and some
 * mistake has been made.
 */
export class UnexpectedError<T> extends Error {
  constructor(message: string, public payload?: T) {
    super(`Programmer Error '${message}'`);
  }
}

/**
 * An Error that signals a feature or function is yet unimplemented.
 */
export class UnimplementedError extends Error {
  constructor(feature: string) {
    super(`Unimplemented feature '${feature}!'`);
  }
}

export class InvalidExpression<T> extends Error {
  constructor(expr: T) {
    super(`Invalid SPARQL Expression '${expr}'`);
  }
}

export class InvalidExpressionType<T> extends Error {
  constructor(public expr: T) {
    super(`Invalid expression type for SPARQL Expression '${expr}'`);
  }
}

export class InvalidTermType extends Error {
  constructor(public term: Algebra.TermExpression) {
    super(`Invalid term type for term '${term}'`);
  }
}

export class UnknownOperator extends Error {
  constructor(name: string) {
    super(`Unknown operator: '${name}`);
  }
}

export class UnknownNamedOperator extends Error {
  constructor(name: string) {
    super(`Unknown named operator: '${name}'`);
  }
}

export class NoAggregator extends Error {
  constructor(name?: string) {
    const nameStr = (name) ? ('\'' + name + '\' ') : '';
    super(`Aggregate expression ${nameStr}found, but no aggregator provided`);
  }
}
