import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IMediatorFunctions } from '@comunica/types';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica actor for term-comparator-factory events.
 *
 * Actor types:
 * * Input:  IActionTermComparatorFactory:      TODO: fill in.
 * * Test:   <none>
 * * Output: IActorTermComparatorFactoryOutput: TODO: fill in.
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

export type IActorTermComparatorFactoryArgs = IActorArgs<
IActionTermComparatorFactory, IActorTest, IActorTermComparatorFactoryOutput> & {
  mediatorQueryOperation: MediatorQueryOperation;
  mediatorFunctions: IMediatorFunctions;
};

export type MediatorTermComparatorFactory = Mediate<
IActionTermComparatorFactory, IActorTermComparatorFactoryOutput>;
