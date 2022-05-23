import type { IActionHttp, IActorHttpOutput, IActorHttpArgs } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type { IMediatorTypeTime } from '@comunica/mediatortype-time';

/**
 * A comunica Cache Http Actor.
 */
export class ActorHttpCache extends ActorHttp {
  public constructor(args: IActorHttpArgs) {
    super(args);
    console.log('ActorHttpCache constructor called');
  }

  public async test(action: IActionHttp): Promise<IMediatorTypeTime> {
    console.log('In Here');
    return { time: 1 };
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    console.log('In Here 2');
    throw new Error('Not Implemented');
  }
}
