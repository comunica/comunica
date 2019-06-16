import * as RDF from 'rdf-js';
import { Algebra } from 'sparqlalgebrajs';

import * as E from '../expressions';
import * as C from './Consts';

import { Bindings } from '../Types';

/**
 * This class of error will be thrown when an expression errors.
 * Various reasons this could happen are:
 *   - invalid types for the given operator
 *   - unbound variables
 *   - invalid lexical forms
 *   - ...
 *
 * The distinction is made so that one can catch this specific type
 * and handle it accordingly to the SPARQL spec (relevant for e.g. FILTER, EXTEND),
 * while others (programming errors) can be re-thrown.
 *
 * @see isExpressionError
 */
export class ExpressionError extends Error { }

/**
 * Checks whether a given error is an {@link ExpressionError}.
 * Also useful for mocking in tests for covering all branches.
 *
 * @see ExpressionError
 */
export function isExpressionError(error: Error): boolean {
  return error instanceof ExpressionError;
}

/**
 * A literal has an invalid lexical form for the datatype it is accompanied by.
 * This error is only thrown when the term is as function argument that requires
 * a valid lexical form.
 */
export class InvalidLexicalForm extends ExpressionError {
  constructor(public arg: RDF.Term) {
    super(`Invalid lexical form '${pp(arg)}'`);
  }
}

/**
 * A variable in the expression was not bound.
 */
export class UnboundVariableError extends ExpressionError {
  constructor(public variable: string, public bindings: Bindings) {
    super(`Unbound variable '${pp(variable)}'`);
  }
}

/**
 * An invalid term was being coerced to an Effective Boolean Value.
 *
 * See the {@link https://www.w3.org/TR/sparql11-query/#ebv | SPARQL docs}
 * on EBVs.
 */
export class EBVCoercionError extends ExpressionError {
  constructor(public arg: E.Term) {
    super(`Cannot coerce term to EBV '${pp(arg)}'`);
  }
}

/**
 * An equality test was done on literals with unsupported datatypes.
 *
 * See {@link https://www.w3.org/TR/sparql11-query/#func-RDFterm-equal | term equality spec}.
 */
export class RDFEqualTypeError extends ExpressionError {
  constructor(public args: E.Expression[]) {
    super('Equality test for literals with unsupported datatypes');
  }
}

/**
 * All the expressions in a COALESCE call threw errors.
 */
export class CoalesceError extends ExpressionError {
  constructor(public errors: Error[]) {
    super('All COALESCE arguments threw errors');
  }
}

/**
 * No arguments to an IN call where equal, and at least one threw an error.
 */
export class InError extends ExpressionError {
  constructor(public errors: Array<Error | false>) {
    super(
      'Some argument to IN errorred and none where equal. ' +
      errors.map((err) => `(${err.toString()}) `).join('and '));
  }
}

/**
 * Literals were passed to an operator that doesn't support their datatypes.
 */
export class InvalidArgumentTypes extends ExpressionError {
  constructor(public args: E.Expression[], public op: C.Operator | C.NamedOperator) {
    super(`Argument types not valid for operator: '${pp(op)}' with '${pp(args)}`);
  }
}

/**
 * An invalid typecast happened.
 */
export class CastError<T> extends ExpressionError {
  constructor(public arg: T, cast: C.TypeURL) {
    super(`Invalid cast: '${pp(arg)}' to '${pp(cast)}'`);
  }
}

export class InvalidTimezoneCall extends ExpressionError {
  constructor(public dateString: string) {
    super(`TIMEZONE call on ${dateString} which has no timezone`);
  }
}

export class IncompatibleLanguageOperation extends ExpressionError {
  constructor(public arg1: E.LangStringLiteral, public arg2: E.LangStringLiteral) {
    super(`Operation on incompatible language literals '${pp(arg1)}' and '${pp(arg2)}'`);
  }
}

export class EmptyAggregateError extends ExpressionError {
  constructor() {
    super('Empty aggregate expression');
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

export class InvalidArity extends Error {
  constructor(public args: E.Expression[], public op: C.Operator) {
    super(`The number of args does not match the arity of the operator '${pp(op)}'.`);
  }
}

export class InvalidExpression<T> extends Error {
  constructor(expr: T) {
    super(`Invalid SPARQL Expression '${pp(expr)}'`);
  }
}

export class InvalidExpressionType<T> extends Error {
  constructor(public expr: T) {
    super(`Invalid expression type for SPARQL Expression '${pp(expr)}'`);
  }
}

export class InvalidTermType extends Error {
  constructor(public term: Algebra.TermExpression) {
    super(`Invalid term type for term '${pp(term)}'`);
  }
}

export class UnknownOperator extends Error {
  constructor(name: string) {
    super(`Unknown operator: '${pp(name)}`);
  }
}

export class UnknownNamedOperator extends Error {
  constructor(name: string) {
    super(`Unknown named operator: '${pp(name)}'`);
  }
}

export class NoAggregator extends Error {
  constructor(name?: string) {
    super(`Aggregate expression ${pp(name)} found, but no aggregate hook provided.`);
  }
}

export class NoExistenceHook extends Error {
  constructor() {
    super('EXISTS found, but no existence hook provided.');
  }
}

function pp<T>(o: T) {
  return JSON.stringify(o);
}
