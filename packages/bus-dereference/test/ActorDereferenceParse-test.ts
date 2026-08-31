import type { IActionParse, IActorParseOutput, IParseMetadata } from '@comunica/actor-abstract-parse';
import { ActionContext, Bus } from '@comunica/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IActionDereference, IActorDereferenceOutput, IActorDereferenceParseArgs } from '../lib';
import { ActorDereferenceParse, emptyReadable } from '../lib';
import '@comunica/utils-jest';

class DummyActorDereferenceParse extends ActorDereferenceParse<string> {
  public constructor(args: IActorDereferenceParseArgs<string>) {
    super(args);
  }

  public async getMetadata(): Promise<IParseMetadata | undefined> {
    return undefined;
  }
}

describe('ActorDereferenceParse', () => {
  let bus: Bus<any, any, any, any>;
  let context: ActionContext;
  let mediatorDereference: any;
  let mediatorParse: any;
  let mediatorParseMediatypes: any;
  let actor: DummyActorDereferenceParse;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
    mediatorDereference = {
      mediate: vi.fn(async(action: IActionDereference): Promise<IActorDereferenceOutput> => {
        // A real dereference actor invokes the mediaTypes callback it is handed.
        await action.mediaTypes?.();
        return {
          url: action.url,
          data: emptyReadable(),
          exists: false,
          requestTime: 0,
          status: 200,
        };
      }),
    };
    mediatorParse = {
      mediate: vi.fn(async(action: { handle: IActionParse<any> }):
      Promise<{ handle: IActorParseOutput<any, any> }> => ({
        handle: { data: emptyReadable(), metadata: action.handle.metadata },
      })),
    };
    mediatorParseMediatypes = {
      mediate: vi.fn(async() => ({ mediaTypes: { 'text/turtle': 1 }})),
    };
    actor = new DummyActorDereferenceParse({
      name: 'actor',
      bus,
      mediatorDereference,
      mediatorParse,
      mediatorParseMediatypes,
      mediaMappings: {},
    });
  });

  describe('test', () => {
    it('always passes', async() => {
      await expect(actor.test({ url: 'http://example.org/', context })).resolves.toPassTestVoid();
    });
  });

  describe('run', () => {
    it('invokes the mediatypes mediator via the mediaTypes callback passed to the dereference mediator', async() => {
      await actor.run({ url: 'http://example.org/', context });
      expect(mediatorParseMediatypes.mediate).toHaveBeenCalledWith({ context, mediaTypes: true });
    });

    it('does not invoke a mediatypes mediator when none is configured', async() => {
      actor = new DummyActorDereferenceParse({
        name: 'actor',
        bus,
        mediatorDereference,
        mediatorParse,
        mediatorParseMediatypes: <any> undefined,
        mediaMappings: {},
      });
      await actor.run({ url: 'http://example.org/', context });
      expect(mediatorParseMediatypes.mediate).not.toHaveBeenCalled();
    });
  });
});
