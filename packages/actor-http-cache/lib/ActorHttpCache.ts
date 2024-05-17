import type { IActionHttp, IActorHttpOutput, IActorHttpArgs, MediatorHttp } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type { IActorTest } from '@comunica/core';

/**
 * A comunica Cache Http Actor.
 */
export class ActorHttpCache extends ActorHttp {
  public readonly mediatorHttp: MediatorHttp;

  public constructor(args: IActorHttpCacheArgs) {
    super(args);
  }

  public async test(action: IActionHttp): Promise<IActorTest> {
    // Console.log('\n\ntest cache request reached!!\n\n');
    if (action) {
      return true;
    };
    return true;
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    const result = await this.mediatorHttp.mediate(action);
    return result;
  }
}

export interface IActorHttpCacheArgs extends IActorHttpArgs {
  mediatorHttp: MediatorHttp;
}
