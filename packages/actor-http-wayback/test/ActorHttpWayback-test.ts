import { ActorHttpNative } from '@comunica/actor-http-native';
import type { IActionHttp, IActorHttpOutput, MediatorHttp } from '@comunica/bus-http';
import { KeysHttp } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorHttpWayback } from '../lib/ActorHttpWayback';

describe('ActorHttpWayback', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorHttpWayback instance', () => {
    let actor: ActorHttpWayback;
    let context: IActionContext;
    let mediatorHttp: MediatorHttp;

    beforeEach(() => {
      // @ts-expect-error
      mediatorHttp = {
        mediate(action: IActionHttp): Promise<IActorHttpOutput> {
          const httpNative = new ActorHttpNative({ name: 'actor-native', bus });
          return httpNative.run(action);
        }
      }
      actor = new ActorHttpWayback({ name: 'actor', bus, mediatorHttp });
      context = new ActionContext({
        [KeysHttp.recoverBrokenLinks.name]: true,
      });
    });

    it('should to positive infinity with recoverBrokenLinks and error otherwise', async() => {
      await expect(actor.test({
        context,
        input: 'http://xmlns.com/foaf/spec/20140114.rdf',
      })).resolves.toEqual({ time: Number.POSITIVE_INFINITY });

      await expect(actor.test({
        context: context.delete(KeysHttp.recoverBrokenLinks),
        input: 'http://xmlns.com/foaf/spec/20140114.rdf',
      })).rejects.toThrowError();

      await expect(actor.test({
        context: context.set(KeysHttp.recoverBrokenLinks, false),
        input: 'http://xmlns.com/foaf/spec/20140114.rdf',
      })).rejects.toThrowError();
    });

    it('should run', () => {
      return expect(actor.run({
        context,
        input: 'http://xmlns.com/foaf/spec/20140114.rdf',
      }).then(result => result.status)).resolves.toEqual(200);
    });
  });
});
