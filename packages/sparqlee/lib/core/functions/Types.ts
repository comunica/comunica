import { List, Map } from 'immutable';

import * as C from '../../util/Consts';
import * as E from '../Expressions';

import { InvalidArgumentTypes } from '../../util/Errors';
import { Bindings } from '../Types';
import { Definition } from './Definitions';
import { RegularFunc, SpecialFunc } from './index';

// ----------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

// Argument Types and their specificity ---------------------------------------

// Function and operator arguments are 'flattened' in the SPARQL spec.
// If the argument is a literal, the datatype often also matters.
export type ArgumentType = 'term' | E.TermType | C.Type;

// Overloaded Functions -------------------------------------------------------

/*
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
 * Note: functions that have multiple arities do not belong in this category.
 * Eg: BNODE.
 *
 * See also: https://www.w3.org/TR/sparql11-query/#func-rdfTerms
 * and https://www.w3.org/TR/sparql11-query/#OperatorMapping
 */

// Maps argument types on their specific implementation.
export type OverloadMap = Map<List<ArgumentType>, E.SimpleApplication>;

export class RegularFunction implements RegularFunc {
  functionClass: 'regular' = 'regular';
  arity: number | number[];
  private overloadMap: OverloadMap;

  constructor(public operator: C.Operator, definition: Definition) {
    this.arity = definition.arity;
    this.overloadMap = definition.overloads;
  }

  apply(args: E.TermExpression[]): E.TermExpression {
    const func = this._monomorph(args);
    if (!func) { throw new InvalidArgumentTypes(args, this.operator); }
    return func(args);
  }

  // TODO: Clean up a bit
  private _monomorph(args: E.TermExpression[]): E.SimpleApplication {
    // tslint:disable-next-line:no-any
    const argTypes = List(args.map((a: any) => a.type || a.termType));
    const arity = args.length;
    return this.overloadMap.get(argTypes)
      || this.overloadMap.get(List(args.map((a: E.TermExpression) => a.termType)))
      || this.overloadMap.get(List(Array(arity).fill('term')));
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

export abstract class SpecialFunctionAsync implements SpecialFunc {
  functionClass: 'special' = 'special';
  abstract arity: number;
  abstract operator: C.SpecialOperator;

  abstract apply(
    args: E.Expression[],
    mapping: Bindings,
    evaluate: (e: E.Expression, mapping: Bindings) => Promise<E.TermExpression>,
  ): Promise<E.TermExpression>;

}
