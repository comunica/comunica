import { List, Map } from 'immutable';

import * as E from '../expressions';
import * as C from '../util/Consts';
import * as Err from '../util/Errors';

type Term = E.TermExpression;

// ----------------------------------------------------------------------------
// Overloaded Functions
// ----------------------------------------------------------------------------

// Maps argument types on their specific implementation.
export type OverloadMap = Map<List<ArgumentType>, E.SimpleApplication>;

// Function and operator arguments are 'flattened' in the SPARQL spec.
// If the argument is a literal, the datatype often also matters.
export type ArgumentType = 'term' | E.TermType | C.Type;

export type OverloadedDefinition = {
  arity: number | number[]
  overloads: OverloadMap,
};

export abstract class OverloadedFunction<Operator> {

  arity: number | number[];
  private overloads: OverloadMap;

  constructor(public operator: Operator, definition: OverloadedDefinition) {
    this.arity = definition.arity;
    this.overloads = definition.overloads;
  }

  /**
   * A function application works by monomorphing the function to a specific
   * instance depending on the runtime types. We then just apply this function
   * to the args.
   */
  apply = (args: Term[]): Term => {
    const func = this.monomorph(args) || this.handleInvalidTypes(args);
    return func(args);
  }

  protected abstract handleInvalidTypes(args: Term[]): never;

  /**
   * We monomorph by checking the map of overloads for keys corresponding
   * to the runtime types. We start by checking for an implementation for the
   * most concrete types (integer, string, date, IRI), if we find none,
   * we consider their term types (literal, blank, IRI), and lastly we consider
   * all arguments as generic terms.
   *
   * Another option would be to populate the overloads with an implementation
   * for every concrete type when the function is generic over termtypes or
   * terms.
   */
  private monomorph(args: Term[]) {
    return (false
      || this.overloads.get(Typer.asConcreteTypes(args))
      || this.overloads.get(Typer.asTermTypes(args))
      || this.overloads.get(Typer.asGenericTerms(args))
    );
  }
}

class Typer {
  static asConcreteTypes(args: Term[]): List<ArgumentType> {
    // tslint:disable-next-line:no-any
    return List(args.map((a: any) => a.type || a.termType));
  }

  static asTermTypes(args: Term[]): List<E.TermType> {
    return List(args.map((a: E.TermExpression) => a.termType));
  }

  static asGenericTerms(args: Term[]): List<'term'> {
    return List(Array(args.length).fill('term'));
  }
}

// Regular Functions ----------------------------------------------------------

/**
 * Varying kinds of functions take arguments of different types on which the
 * specific behaviour is dependant. Although their behaviour is often varying,
 * it is always relatively simple, and better suited for synced behaviour.
 * The types of their arguments are always terms, but might differ in
 * their term-type (eg: iri, literal),
 * their specific literal type (eg: string, integer),
 * their arity (see BNODE),
 * or even their specific numeric type (eg: integer, float).
 *
 * Examples include:
 *  - Arithmetic operations such as: *, -, /, +
 *  - Bool operators such as: =, !=, <=, <, ...
 *  - Functions such as: str, IRI
 *
 * See also: https://www.w3.org/TR/sparql11-query/#func-rdfTerms
 * and https://www.w3.org/TR/sparql11-query/#OperatorMapping
 */
export class RegularFunction extends OverloadedFunction<C.RegularOperator> {
  functionClass: 'regular' = 'regular';

  constructor(op: C.RegularOperator, definition: OverloadedDefinition) {
    super(op, definition);
  }

  handleInvalidTypes(args: Term[]): never {
    throw new Err.InvalidArgumentTypes(args, this.operator);
  }
}

// Named Functions ------------------------------------------------------------
export class NamedFunction extends OverloadedFunction<C.NamedOperator> {
  functionClass: 'named' = 'named';

  constructor(op: C.NamedOperator, definition: OverloadedDefinition) {
    super(op, definition);
  }

  handleInvalidTypes(args: Term[]): never {
    throw new Err.InvalidArgumentTypes(args, this.operator);
  }
}

// Special Functions ----------------------------------------------------------
/*
 * Special Functions are those that don't really fit in sensible categories and
 * have extremely heterogeneous signatures that make them impossible to abstract
 * over. They are small in number, and their behaviour is often complex and open
 * for multiple correct implementations with different trade-offs.
 *
 * Due to their varying nature, they need all available information present
 * during evaluation. This reflects in the signature of the apply() method.
 *
 * They need access to an evaluator to be able to even implement their logic.
 * Especially relevant for IF, and the logical connectives.
 *
 * They can have both sync and async implementations, and both would make sense
 * in some contexts.
 */
export class SpecialFunction {
  functionClass: 'special' = 'special';
  arity: number;
  applySync: E.SpecialApplicationSync;
  applyAsync: E.SpecialApplicationAsync;

  constructor(public operator: C.SpecialOperator, definition: SpecialDefinition) {
    this.arity = definition.arity;
    this.applySync = definition.applySync;
    this.applyAsync = definition.applyAsync;
  }
}

export type SpecialDefinition = {
  arity: number;
  applySync: E.SpecialApplicationSync;
  applyAsync: E.SpecialApplicationAsync;
};
