import type { MediatorFunctionFactoryUnsafe } from '@comunica/bus-function-factory';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica actor for term-comparator-factory events.
 *
 * Actor types:
 * * Input:  IActionTermComparatorFactory: the Query Operation Mediator and Function Factory Mediator.
 * * Test:   <none>
 * * Output: IActorTermComparatorFactoryOutput: An object that can order RDF terms.
 *
 * @see IActionTermComparatorFactory
 * @see IActorTermComparatorFactoryOutput
 */
export abstract class ActorTermComparatorFactory extends
  Actor<IActionTermComparatorFactory, IActorTest, IActorTermComparatorFactoryOutput> {
  /**
  * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
  */
  public constructor(args: IActorTermComparatorFactoryArgs) {
    super(args);
  }
}

export interface IActionTermComparatorFactory extends IAction {

}

export interface ITermComparator {
  /**
   * Orders two RDF terms according to: https://www.w3.org/TR/sparql11-query/#modOrderBy
   * @param termA the first term
   * @param termB the second term
   */
  orderTypes: (termA: RDF.Term | undefined, termB: RDF.Term | undefined) => -1 | 0 | 1;
}

export interface IActorTermComparatorFactoryOutput extends IActorOutput, ITermComparator {}

export interface IActorTermComparatorFactoryArgs extends IActorArgs<
IActionTermComparatorFactory, IActorTest, IActorTermComparatorFactoryOutput> {
  mediatorQueryOperation: MediatorQueryOperation;
  mediatorFunctionFactory: MediatorFunctionFactoryUnsafe;
}

export type MediatorTermComparatorFactory = Mediate<
IActionTermComparatorFactory, IActorTermComparatorFactoryOutput>;
