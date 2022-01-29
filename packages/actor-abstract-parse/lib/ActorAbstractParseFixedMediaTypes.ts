import type { IActorArgsMediaTypedFixed } from '@comunica/actor-abstract-mediatyped';
import { ActorAbstractMediaTypedFixed } from '@comunica/actor-abstract-mediatyped';
import type { IActorTest } from '@comunica/core';
import type { IActionParse, IActorParseOutput, ActorAbstractParse } from './ActorAbstractParse';

/**
 * A base actor for listening to parse events that has fixed media types.
 *
 * Actor types:
 * * Input:  IActionParseOrMediaType:      A parse input or a media type input.
 * * Test:   <none>
 * * Output: IActorOutputParseOrMediaType: The parsed data.
 *
 * @see IActionInit
 */
export abstract class ActorAbstractParseFixedMediaTypes<
  I extends IActionParse<any>,
  O extends IActorParseOutput<any, any>
> extends ActorAbstractMediaTypedFixed<I, IActorTest, O> implements
IActorArgsMediaTypedFixed<I, IActorTest, O>, ActorAbstractParse<I, IActorTest, O> {
  /* eslint-disable max-len */
  /**
   * TODO: rm this (and eslint-disable) once we remove the abstract media typed actor
  //  * @param args - @defaultNested {<caap:components/ActorAbstractParse.jsonld#ActorAbstractParse_default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorArgsMediaTypedFixed<I, IActorTest, O>) {
    super(args);
  }
  /* eslint-enable max-len */

  public async testHandleChecked(action: I): Promise<boolean> {
    return true;
  }
}
