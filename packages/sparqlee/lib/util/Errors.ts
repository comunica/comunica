import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import type * as E from '../expressions';
import type * as C from './Consts';

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
  public constructor(public arg: RDF.Term) {
    super(`Invalid lexical form '${pp(arg)}'`);
  }
}

/**
 * A variable in the expression was not bound.
 */
export class UnboundVariableError extends ExpressionError {
  public constructor(public variable: string, public bindings: RDF.Bindings) {
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
  public constructor(public arg: E.Term) {
    super(`Cannot coerce term to EBV '${pp(arg)}'`);
  }
}

/**
 * An equality test was done on literals with unsupported datatypes.
 *
 * See {@link https://www.w3.org/TR/sparql11-query/#func-RDFterm-equal | term equality spec}.
 */
export class RDFEqualTypeError extends ExpressionError {
  public constructor(public args: E.Expression[]) {
    super('Equality test for literals with unsupported datatypes');
  }
}

/**
 * All the expressions in a COALESCE call threw errors.
 */
export class CoalesceError extends ExpressionError {
  public constructor(public errors: Error[]) {
    super('All COALESCE arguments threw errors');
  }
}

/**
 * No arguments to an IN call where equal, and at least one threw an error.
 */
export class InError extends ExpressionError {
  public constructor(public errors: (Error | false)[]) {
    super(
      `Some argument to IN errorred and none where equal. ${
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        errors.map(err => `(${err.toString()}) `).join('and ')}`,
    );
  }
}

/**
 * Literals were passed to an operator that doesn't support their datatypes.
 */
export class InvalidArgumentTypes extends ExpressionError {
  public constructor(public args: E.Expression[], public op: C.Operator | C.NamedOperator) {
    super(`Argument types not valid for operator: '${pp(op)}' with '${pp(args)}`);
  }
}

/**
 * An invalid typecast happened.
 */
export class CastError<T> extends ExpressionError {
  public constructor(public arg: T, cast: C.TypeURL) {
    super(`Invalid cast: '${pp(arg)}' to '${pp(cast)}'`);
  }
}

export class InvalidTimezoneCall extends ExpressionError {
  public constructor(public dateString: string) {
    super(`TIMEZONE call on ${dateString} which has no timezone`);
  }
}

export class IncompatibleLanguageOperation extends ExpressionError {
  public constructor(public arg1: E.LangStringLiteral, public arg2: E.LangStringLiteral) {
    super(`Operation on incompatible language literals '${pp(arg1)}' and '${pp(arg2)}'`);
  }
}

export class EmptyAggregateError extends ExpressionError {
  public constructor() {
    super('Empty aggregate expression');
  }
}

export class ParseError extends ExpressionError {
  public constructor(str: string, type: string) {
    super(`Failed to parse ${str} as ${type}.`);
  }
}

// Non Expression Errors ------------------------------------------------------

/**
 * An error that arises when we detect a 'should-be-impossible' state.
 * Given that this error is thrown, it clearly wasn't impossible, and some
 * mistake has been made.
 */
export class UnexpectedError<T> extends Error {
  public constructor(message: string, public payload?: T) {
    super(`Programmer Error '${message}'`);
  }
}

export class InvalidArity extends Error {
  public constructor(public args: E.Expression[], public op: C.Operator) {
    super(`The number of args does not match the arity of the operator '${pp(op)}'.`);
  }
}

export class InvalidExpression<T> extends Error {
  public constructor(expr: T) {
    super(`Invalid SPARQL Expression '${pp(expr)}'`);
  }
}

export class InvalidExpressionType<T> extends Error {
  public constructor(public expr: T) {
    super(`Invalid expression type for SPARQL Expression '${pp(expr)}'`);
  }
}

export class InvalidTermType extends Error {
  public constructor(public term: Algebra.TermExpression) {
    super(`Invalid term type for term '${pp(term)}'`);
  }
}

export class UnknownOperator extends Error {
  public constructor(name: string) {
    super(`Unknown operator: '${pp(name)}`);
  }
}

export class UnknownNamedOperator extends Error {
  public constructor(name: string) {
    super(`Unknown named operator: '${pp(name)}'`);
  }
}

export class ExtensionFunctionError extends Error {
  public constructor(name: string, functionError: unknown) {
    if (functionError instanceof Error) {
      super(`Error thrown in ${name}: ${functionError.message}${functionError.stack ? `\n${functionError.stack}` : ''}`);
    } else {
      super(`Error thrown in ${name}`);
    }
  }
}

export class NoAggregator extends Error {
  public constructor(name?: string) {
    super(`Aggregate expression ${pp(name)} found, but no aggregate hook provided.`);
  }
}

export class NoExistenceHook extends Error {
  public constructor() {
    super('EXISTS found, but no existence hook provided.');
  }
}

function pp<T>(object: T): string {
  return JSON.stringify(object);
}
