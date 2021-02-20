import {
  ActorQueryOperationTyped,
  Bindings,
} from '@comunica/bus-query-operation';
import type { ActionContext, IActorArgs, IActorTest } from '@comunica/core';
import type { IActionQueryOperation,
  IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings } from '@comunica/types';
import { SingletonIterator } from 'asynciterator';
import { termToString } from 'rdf-string';
import { getTerms, uniqTerms } from 'rdf-terms';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Query Operation Actor for empty BGPs.
 */
export class ActorQueryOperationBgpEmpty extends ActorQueryOperationTyped<Algebra.Bgp> {
  public constructor(args: IActorArgs<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>) {
    super(args, 'bgp');
  }

  /**
   * Get all variables in the given patterns.
   * No duplicates are returned.
   * @param {Algebra.Pattern} patterns Quad patterns.
   * @return {string[]} The variables in this pattern, with '?' prefix.
   */
  public static getVariables(patterns: Algebra.Pattern[]): string[] {
    return uniqTerms(patterns
      .map(pattern => getTerms(pattern)
        .filter(term => term.termType === 'Variable'))
      .reduce((acc, val) => [ ...acc, ...val ], []))
      .map(x => termToString(x));
  }

  public async testOperation(pattern: Algebra.Bgp, context: ActionContext): Promise<IActorTest> {
    if (pattern.patterns.length > 0) {
      throw new Error(`Actor ${this.name} can only operate on empty BGPs.`);
    }
    return true;
  }

  public async runOperation(pattern: Algebra.Bgp, context: ActionContext): Promise<IActorQueryOperationOutputBindings> {
    return {
      bindingsStream: new SingletonIterator(Bindings({})),
      metadata: () => Promise.resolve({ totalItems: 1 }),
      type: 'bindings',
      variables: ActorQueryOperationBgpEmpty.getVariables(pattern.patterns),
      canContainUndefs: false,
    };
  }
}
