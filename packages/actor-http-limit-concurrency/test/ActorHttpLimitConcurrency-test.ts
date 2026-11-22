import type { IActionHttp, IActorHttpOutput, ActorHttp } from '@comunica/bus-http';
import { KeysHttp } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import { ActorHttpLimitConcurrency } from '../lib/ActorHttpLimitConcurrency';
import '@comunica/utils-jest';

describe('ActorHttpLimitConcurrency', () => {
  let bus: Bus<ActorHttp, IActionHttp, IActorTest, IActorHttpOutput>;
  let actor: ActorHttpLimitConcurrency;
  let mediatorHttp: any;
  let pending: { resolve: (response: any) => void; reject: (error: Error) => void }[];
  const input = 'http://example.org/sparql';
  const context = new ActionContext();

  function createActor(maxLimit: number): ActorHttpLimitConcurrency {
    return new ActorHttpLimitConcurrency({ name: 'actor', bus, mediatorHttp, maxLimit });
  }

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    pending = [];
    mediatorHttp = {
      mediate: jest.fn(() => new Promise((resolve, reject) => pending.push({ resolve, reject }))),
    };
    actor = createActor(100);
  });

  async function flush(): Promise<void> {
    await new Promise(setImmediate);
  }

  describe('test', () => {
    it('should pass', async() => {
      await expect(actor.test({ input, context })).resolves.toPassTest({ time: 0 });
    });

    it('should fail for wrapped requests', async() => {
      await expect(actor.test({
        input,
        context: context.set((<any> ActorHttpLimitConcurrency).keyWrapped, true),
      })).resolves.toFailTest('actor can only wrap a request once');
    });

    it('should fail without slots', async() => {
      await expect(createActor(0).test({ input, context }))
        .resolves.toFailTest('actor requires a maximum limit of at least one');
    });
  });

  describe('run', () => {
    it('should limit concurrent requests per host to the maximum', async() => {
      actor = createActor(2);
      const requests = [ 1, 2, 3 ].map(() => actor.run({ input, context }));
      const other = actor.run({ input: 'http://other.org/', context });
      await flush();
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(3);
      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        input,
        context: context.set((<any> ActorHttpLimitConcurrency).keyWrapped, true),
      });
      pending[0].resolve({ status: 200 });
      await flush();
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(4);
      for (const entry of pending.slice(1)) {
        entry.resolve({ status: 200 });
      }
      await expect(Promise.all([ ...requests, other ])).resolves.toHaveLength(4);
    });

    it('should halve the requests in flight once per overload, and grow by one per limit of successes', async() => {
      const requests = [ 1, 2, 3, 4, 5, 6, 7, 8 ].map(() => actor.run({ input, context }));
      await flush();
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(8);
      pending[0].resolve({ status: 503 });
      pending[1].resolve({ status: 429 });
      await flush();
      expect(actor.getHostState('example.org').limit).toBe(4);
      pending[2].resolve({ status: 200 });
      await flush();
      expect(actor.getHostState('example.org').limit).toBe(4.25);
      for (const entry of pending.slice(3)) {
        entry.resolve({ status: 200 });
      }
      await Promise.all(requests);
      const next = actor.run({ input, context });
      await flush();
      pending[8].resolve({ status: 503 });
      await next;
      expect(actor.getHostState('example.org').limit).toBe(1);
    });

    it('should not grow beyond the maximum', async() => {
      actor = createActor(1);
      const request = actor.run({ input, context });
      await flush();
      pending[0].resolve({ status: 200 });
      await request;
      expect(actor.getHostState('example.org').limit).toBe(1);
    });

    it('should not decrease below one', async() => {
      actor = createActor(1);
      const request = actor.run({ input, context });
      await flush();
      pending[0].resolve({ status: 503 });
      await request;
      expect(actor.getHostState('example.org').limit).toBe(1);
    });

    it('should consider failures without response as overload', async() => {
      const request = actor.run({ input, context });
      await flush();
      pending[0].reject(new Error('ECONNRESET'));
      await expect(request).rejects.toThrow('ECONNRESET');
      expect(actor.getHostState('example.org').limit).toBe(1);
      expect(actor.getHostState('example.org').active).toBe(0);
    });

    it('should not consider client aborts as overload', async() => {
      const request = actor.run({ input, context });
      await flush();
      const error = new Error('timeout');
      error.name = 'TimeoutError';
      pending[0].reject(error);
      await expect(request).rejects.toThrow('timeout');
      expect(actor.getHostState('example.org').limit).toBe(100);
      expect(ActorHttpLimitConcurrency.isClientAbort('error')).toBe(false);
    });

    it('should remove waiting requests that are aborted', async() => {
      actor = createActor(1);
      const abortController = new AbortController();
      const first = actor.run({ input, context });
      const second = actor.run({ input, context: context.set(KeysHttp.httpAbortSignal, abortController.signal) });
      const third = actor.run({ input, init: { signal: new AbortController().signal }, context });
      await flush();
      abortController.abort(new Error('aborted'));
      await expect(second).rejects.toThrow('aborted');
      expect(actor.getHostState('example.org').queue).toHaveLength(1);
      pending[0].resolve({ status: 200 });
      await flush();
      pending[1].resolve({ status: 200 });
      await expect(Promise.all([ first, third ])).resolves.toHaveLength(2);
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
    });

    it('should reject waiting requests that were aborted already', async() => {
      actor = createActor(1);
      const abortController = new AbortController();
      abortController.abort(new Error('aborted'));
      const first = actor.run({ input, context });
      await expect(actor.run({ input, init: { signal: abortController.signal }, context }))
        .rejects.toThrow('aborted');
      await flush();
      pending[0].resolve({ status: 200 });
      await first;
    });
  });
});
