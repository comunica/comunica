import type { IActionHttp, IActorHttpOutput, MediatorHttp } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import { KeysHttp } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import { Bus, ActionContext } from '@comunica/core';
import arrayifyStream from 'arrayify-stream';
import { Readable } from 'readable-stream';
import { ActorHttpRetryBody } from '../lib/ActorHttpRetryBody';
import '@comunica/utils-jest';

describe('ActorHttpRetryBody', () => {
  let bus: Bus<ActorHttp, IActionHttp, IActorTest, IActorHttpOutput>;
  let actor: ActorHttpRetryBody;
  let context: ActionContext;
  let mediatorHttp: MediatorHttp;
  let input: string;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorHttp = <any> {
      mediate: jest.fn().mockRejectedValue(new Error('mediatorHttp.mediate called without mocking')),
    };
    input = 'http://127.0.0.1/abc';
    actor = new ActorHttpRetryBody({ bus, mediatorHttp, name: 'actor' });
    context = new ActionContext({ [KeysHttp.httpRetryBodyCount.name]: 1 });
    jest.spyOn(<any> actor, 'logDebug').mockImplementation((...args) => (<() => unknown>args[2])());
    jest.spyOn(<any> actor, 'logWarn').mockImplementation((...args) => (<() => unknown>args[2])());
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('test', () => {
    it('should reject without retry count in the context', async() => {
      const context = new ActionContext();
      await expect(actor.test({ input, context })).resolves
        .toFailTest(`${actor.name} requires a retry count greater than zero to function`);
    });

    it('should reject with retry count below 1 in the context', async() => {
      const context = new ActionContext({ [KeysHttp.httpRetryBodyCount.name]: 0 });
      await expect(actor.test({ input, context })).resolves.toFailTest(`${actor.name} requires a retry count greater than zero to function`);
    });

    it('should accept when retry count is provided in the context', async() => {
      const context = new ActionContext({ [KeysHttp.httpRetryBodyCount.name]: 1 });
      await expect(actor.test({ input, context })).resolves.toPassTest({ time: 0 });
    });

    it('should reject for non-idempotent methods by default', async() => {
      await expect(actor.test({ input, context, init: { method: 'POST' }})).resolves
        .toFailTest('actor can only retry idempotent request methods by default');
    });

    it('should accept for non-idempotent methods when allowed', async() => {
      const context = new ActionContext({
        [KeysHttp.httpRetryBodyCount.name]: 1,
        [KeysHttp.httpRetryBodyAllowUnsafe.name]: true,
      });
      await expect(actor.test({ input, context, init: { method: 'POST' }})).resolves.toPassTest({ time: 0 });
    });

    it('should reject for non-replayable request bodies by default', async() => {
      const requestBody = new Readable({
        read() {
          this.push('request');
          this.push(null);
        },
      });
      await expect(actor.test({ input, context, init: { body: <any> requestBody }})).resolves
        .toFailTest('actor can only retry replayable request bodies by default');
    });

    it('should accept for non-replayable request bodies when allowed', async() => {
      const context = new ActionContext({
        [KeysHttp.httpRetryBodyCount.name]: 1,
        [KeysHttp.httpRetryBodyAllowUnsafe.name]: true,
      });
      const requestBody = new Readable({
        read() {
          this.push('request');
          this.push(null);
        },
      });
      await expect(actor.test({ input, context, init: { body: <any> requestBody }})).resolves.toPassTest({ time: 0 });
    });
  });

  describe('run', () => {
    const createErrorBody = (chunk?: string): Readable => new Readable({
      read() {
        if (chunk) {
          this.push(chunk);
        }
        this.destroy(new Error('Body stream error'));
      },
    });

    it('should remove retry body count from the mediated action context', async() => {
      const body = Readable.from([ 'abcdef' ]);
      const mediateSpy = jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any> {
        ok: true,
        status: 200,
        body,
        headers: new Headers(),
      });

      const response = await actor.run({ input, context });
      await arrayifyStream(ActorHttp.toNodeReadable(<any> response.body));

      expect(mediateSpy).toHaveBeenCalledTimes(1);
      expect(mediateSpy.mock.calls[0][0].context.get(KeysHttp.httpRetryBodyCount)).toBeUndefined();
    });

    it('should retry and emit the successful response after stream error', async() => {
      const firstBody = new Readable({
        read() {
          this.push('abc');
          this.destroy(new Error('Body stream error'));
        },
      });
      const secondBody = Readable.from([ 'abcdef' ]);
      const responses: IActorHttpOutput[] = [
        <any> { ok: true, status: 200, body: firstBody, headers: new Headers() },
        <any> { ok: true, status: 200, body: secondBody, headers: new Headers() },
      ];

      jest.spyOn(mediatorHttp, 'mediate')
        .mockResolvedValueOnce(responses.shift()!)
        .mockResolvedValueOnce(responses.shift()!);

      const response = await actor.run({ input, context });
      const chunks = await arrayifyStream(ActorHttp.toNodeReadable(<any> response.body));
      const buffer = Buffer.concat(chunks.map((chunk: any) => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      expect(buffer.toString()).toBe('abcdef');
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
    });

    it('should retry when body closes without ending', async() => {
      const firstBody = new Readable({
        read() {
          this.push('abc');
          this.destroy();
        },
      });
      const secondBody = Readable.from([ 'abcdef' ]);
      const responses: IActorHttpOutput[] = [
        <any> { ok: true, status: 200, body: firstBody, headers: new Headers() },
        <any> { ok: true, status: 200, body: secondBody, headers: new Headers() },
      ];

      jest.spyOn(mediatorHttp, 'mediate')
        .mockResolvedValueOnce(responses.shift()!)
        .mockResolvedValueOnce(responses.shift()!);

      const response = await actor.run({ input, context });
      const chunks = await arrayifyStream(ActorHttp.toNodeReadable(<any> response.body));
      const buffer = Buffer.concat(chunks.map((chunk: any) => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      expect(buffer.toString()).toBe('abcdef');
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
    });

    it('should allow retries for non-idempotent methods when allowed', async() => {
      const context = new ActionContext({
        [KeysHttp.httpRetryBodyCount.name]: 1,
        [KeysHttp.httpRetryBodyAllowUnsafe.name]: true,
      });
      const firstBody = createErrorBody('abc');
      const secondBody = Readable.from([ 'abcdef' ]);
      jest.spyOn(mediatorHttp, 'mediate')
        .mockResolvedValueOnce(<any> { ok: true, status: 200, body: firstBody, headers: new Headers() })
        .mockResolvedValueOnce(<any> { ok: true, status: 200, body: secondBody, headers: new Headers() });

      const response = await actor.run({ input, context, init: { method: 'POST' }});
      const chunks = await arrayifyStream(ActorHttp.toNodeReadable(<any> response.body));
      const buffer = Buffer.concat(chunks.map((chunk: any) => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      expect(buffer.toString()).toBe('abcdef');
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
    });

    it('should allow retries for non-replayable request bodies when allowed', async() => {
      const context = new ActionContext({
        [KeysHttp.httpRetryBodyCount.name]: 1,
        [KeysHttp.httpRetryBodyAllowUnsafe.name]: true,
      });
      const requestBody = new Readable({
        read() {
          this.push('request');
          this.push(null);
        },
      });
      const firstBody = createErrorBody('abc');
      const secondBody = Readable.from([ 'abcdef' ]);
      jest.spyOn(mediatorHttp, 'mediate')
        .mockResolvedValueOnce(<any> { ok: true, status: 200, body: firstBody, headers: new Headers() })
        .mockResolvedValueOnce(<any> { ok: true, status: 200, body: secondBody, headers: new Headers() });

      const response = await actor.run({ input, context, init: { body: <any> requestBody }});
      const chunks = await arrayifyStream(ActorHttp.toNodeReadable(<any> response.body));
      const buffer = Buffer.concat(chunks.map((chunk: any) => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      expect(buffer.toString()).toBe('abcdef');
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
    });

    it('should skip wrapping when content-length exceeds maxBytes', async() => {
      const context = new ActionContext({
        [KeysHttp.httpRetryBodyCount.name]: 1,
        [KeysHttp.httpRetryBodyMaxBytes.name]: 2,
      });
      const body = Readable.from([ 'abcdef' ]);
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any> {
        ok: true,
        status: 200,
        body,
        headers: new Headers({ 'content-length': '6' }),
      });

      const response = await actor.run({ input, context });
      expect(response.body).toBe(body);
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
    });

    it('should ignore invalid content-length header values', async() => {
      const context = new ActionContext({
        [KeysHttp.httpRetryBodyCount.name]: 1,
        [KeysHttp.httpRetryBodyMaxBytes.name]: 2,
      });
      const body = Readable.from([ 'abcdef' ]);
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any> {
        ok: true,
        status: 200,
        body,
        headers: new Headers({ 'content-length': '6abc' }),
      });

      const response = await actor.run({ input, context });
      expect(response.body).not.toBe(body);
      const chunks = await arrayifyStream(ActorHttp.toNodeReadable(<any> response.body));
      const buffer = Buffer.concat(chunks.map((chunk: any) => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      expect(buffer.toString()).toBe('abcdef');
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
    });

    it('should switch to streaming when maxBytes is exceeded', async() => {
      const context = new ActionContext({
        [KeysHttp.httpRetryBodyCount.name]: 1,
        [KeysHttp.httpRetryBodyMaxBytes.name]: 2,
      });
      const body = Readable.from([ 'abcdef' ]);
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any> {
        ok: true,
        status: 200,
        body,
        headers: new Headers(),
      });

      const response = await actor.run({ input, context });
      const chunks = await arrayifyStream(ActorHttp.toNodeReadable(<any> response.body));
      const buffer = Buffer.concat(chunks.map((chunk: any) => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      expect(buffer.toString()).toBe('abcdef');
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
    });

    it('should not retry when a request init abort signal is already aborted', async() => {
      const abortController = new AbortController();
      abortController.abort();
      const body = createErrorBody('abc');
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any> {
        ok: true,
        status: 200,
        body,
        headers: new Headers(),
      });

      const response = await actor.run({ input, context, init: { signal: abortController.signal }});
      await expect(arrayifyStream(ActorHttp.toNodeReadable(<any> response.body)))
        .rejects.toThrow('Body stream error');
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
    });

    it('should not retry when a context abort signal is already aborted', async() => {
      const abortController = new AbortController();
      abortController.abort();
      const context = new ActionContext({
        [KeysHttp.httpRetryBodyCount.name]: 1,
        [KeysHttp.httpAbortSignal.name]: abortController.signal,
      });
      const body = createErrorBody('abc');
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any> {
        ok: true,
        status: 200,
        body,
        headers: new Headers(),
      });

      const response = await actor.run({ input, context });
      await expect(arrayifyStream(ActorHttp.toNodeReadable(<any> response.body)))
        .rejects.toThrow('Body stream error');
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
    });

    it('should not retry after switching to streaming due to maxBytes', async() => {
      const context = new ActionContext({
        [KeysHttp.httpRetryBodyCount.name]: 1,
        [KeysHttp.httpRetryBodyMaxBytes.name]: 2,
      });
      let pushed = false;
      const body = new Readable({
        read() {
          if (pushed) {
            return;
          }
          pushed = true;
          this.push('abc');
          process.nextTick(() => this.destroy(new Error('Body stream error after overflow')));
        },
      });
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any> {
        ok: true,
        status: 200,
        body,
        headers: new Headers(),
      });

      const response = await actor.run({ input, context });
      await expect(arrayifyStream(ActorHttp.toNodeReadable(<any> response.body)))
        .rejects.toThrow('Body stream error after overflow');
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
    });

    it('should error when retry limit is exhausted', async() => {
      const firstBody = createErrorBody('abc');
      const secondBody = createErrorBody('abc');
      jest.spyOn(mediatorHttp, 'mediate')
        .mockResolvedValueOnce(<any> { ok: true, status: 200, body: firstBody, headers: new Headers() })
        .mockResolvedValueOnce(<any> { ok: true, status: 200, body: secondBody, headers: new Headers() });

      const response = await actor.run({ input, context });
      await expect(arrayifyStream(ActorHttp.toNodeReadable(<any> response.body))).rejects.toThrow('Body stream error');
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
    });

    it('should discard partial output before retrying', async() => {
      const firstBody = createErrorBody('abcdef');
      const secondBody = Readable.from([ 'abc' ]);
      jest.spyOn(mediatorHttp, 'mediate')
        .mockResolvedValueOnce(<any> { ok: true, status: 200, body: firstBody, headers: new Headers() })
        .mockResolvedValueOnce(<any> { ok: true, status: 200, body: secondBody, headers: new Headers() });

      const response = await actor.run({ input, context });
      const chunks = await arrayifyStream(ActorHttp.toNodeReadable(<any> response.body));
      const buffer = Buffer.concat(chunks.map((chunk: any) => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      expect(buffer.toString()).toBe('abc');
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
    });

    it('should use retry delay fallback between body retries', async() => {
      const context = new ActionContext({
        [KeysHttp.httpRetryBodyCount.name]: 1,
        [KeysHttp.httpRetryBodyDelayFallback.name]: 123,
      });
      const sleepSpy = jest.spyOn(ActorHttpRetryBody, 'sleep').mockResolvedValue();
      const firstBody = createErrorBody('abc');
      const secondBody = Readable.from([ 'abcdef' ]);
      jest.spyOn(mediatorHttp, 'mediate')
        .mockResolvedValueOnce(<any> { ok: true, status: 200, body: firstBody, headers: new Headers() })
        .mockResolvedValueOnce(<any> { ok: true, status: 200, body: secondBody, headers: new Headers() });

      const response = await actor.run({ input, context });
      await arrayifyStream(ActorHttp.toNodeReadable(<any> response.body));
      expect(sleepSpy).toHaveBeenCalledWith(123);
    });

    it('should be able to wrap native Response instances', async() => {
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any> new Response('abcdef'));

      const response = await actor.run({ input, context });
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(response.redirected).toBe(false);
      expect(response.url).toBe('');
      const chunks = await arrayifyStream(ActorHttp.toNodeReadable(<any> response.body));
      const buffer = Buffer.concat(chunks.map((chunk: any) => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      expect(buffer.toString()).toBe('abcdef');
    });

    it('should pass through when response is not ok', async() => {
      const body = Readable.from([ 'abc' ]);
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any> {
        ok: false,
        status: 500,
        body,
        headers: new Headers(),
      });

      const response = await actor.run({ input, context });
      expect(response.body).toBe(body);
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
    });

    it('should pass through when response has no body', async() => {
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any> {
        ok: true,
        status: 200,
        body: null,
        headers: new Headers(),
      });

      const response = await actor.run({ input, context });
      expect(response.body).toBeNull();
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
    });
  });

  describe('createRetryingBody', () => {
    it('should stop flushing buffered chunks when output is closed during maxBytes overflow handling', async() => {
      const url = new URL(input);
      const body = new Readable({ read() {} });
      const output: Readable = (<any> actor).createRetryingBody(body, { input, context }, 1, 0, url, 1);

      (<any> actor).logWarn.mockImplementation((...args: any[]) => {
        const callback = args[2];
        if (typeof callback === 'function') {
          callback();
        }
        if (args[1] === 'Max bytes exceeded, disabling body retry and switching to streaming') {
          output.destroy();
        }
      });

      const writeSpy = jest.spyOn(<any> output, 'write');
      body.emit('data', 'abc');
      await new Promise(resolve => process.nextTick(resolve));
      expect(writeSpy).toHaveBeenCalledTimes(0);
    });

    it('should destroy output with a non-Error value emitted after switching to streaming due to maxBytes', async() => {
      const url = new URL(input);
      const body = new Readable({ read() {} });
      const output: Readable = (<any> actor).createRetryingBody(body, { input, context }, 1, 0, url, 1);

      const outputPromise = arrayifyStream(output);
      body.emit('data', 'abc');
      body.emit('error', 'boom');

      await expect(outputPromise).rejects.toThrow('boom');
    });

    it('should stop processing end when output is already closed', async() => {
      const url = new URL(input);
      const body = new Readable({ read() {} });
      const output: Readable = (<any> actor).createRetryingBody(body, { input, context }, 1, 0, url, undefined);
      (<any> output).destroyed = true;

      const writeSpy = jest.spyOn(<any> output, 'write');
      const endSpy = jest.spyOn(<any> output, 'end');
      body.push('abc');
      body.push(null);
      await new Promise(resolve => process.nextTick(resolve));

      expect(writeSpy).toHaveBeenCalledTimes(0);
      expect(endSpy).toHaveBeenCalledTimes(0);
      output.destroy();
    });

    it('should ignore body error when output is already closed', async() => {
      const url = new URL(input);
      const body = new Readable({ read() {} });
      const output: Readable = (<any> actor).createRetryingBody(body, { input, context }, 2, 0, url, undefined);
      (<any> output).destroyed = true;

      body.emit('error', new Error('Body stream error'));
      await new Promise(resolve => process.nextTick(resolve));
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(0);
      output.destroy();
    });

    it('should ignore body close when output is already closed', async() => {
      const url = new URL(input);
      const body = new Readable({ read() {} });
      const output: Readable = (<any> actor).createRetryingBody(body, { input, context }, 2, 0, url, undefined);
      (<any> output).destroyed = true;

      body.emit('close');
      await new Promise(resolve => process.nextTick(resolve));
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(0);
      output.destroy();
    });

    it('should destroy output when error retry handling fails', async() => {
      const url = new URL(input);
      const body = new Readable({ read() {} });
      const output: Readable = (<any> actor).createRetryingBody(body, { input, context }, 2, 0, url, undefined);

      (<any> actor).logDebug.mockImplementation(() => {
        throw new Error('logDebug failed');
      });

      const outputPromise = arrayifyStream(output);
      body.emit('error', new Error('Body stream error'));
      await expect(outputPromise).rejects.toThrow('logDebug failed');
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(0);
    });

    it('should destroy output when error retry handling fails with a non-Error throw', async() => {
      const url = new URL(input);
      const body = new Readable({ read() {} });
      const output: Readable = (<any> actor).createRetryingBody(body, { input, context }, 2, 0, url, undefined);

      (<any> actor).logDebug.mockImplementation(() => {
        const fakeError: Error = <any> { toString: () => 'logDebug failed' };
        throw fakeError;
      });

      const outputPromise = arrayifyStream(output);
      body.emit('error', new Error('Body stream error'));
      await expect(outputPromise).rejects.toThrow('logDebug failed');
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(0);
    });

    it('should destroy output when close retry handling fails', async() => {
      const url = new URL(input);
      const body = new Readable({ read() {} });
      const output: Readable = (<any> actor).createRetryingBody(body, { input, context }, 2, 0, url, undefined);

      (<any> actor).logDebug.mockImplementation(() => {
        throw new Error('logDebug failed');
      });

      const outputPromise = arrayifyStream(output);
      body.emit('close');
      await expect(outputPromise).rejects.toThrow('logDebug failed');
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(0);
    });

    it('should destroy output when close retry handling fails with a non-Error throw', async() => {
      const url = new URL(input);
      const body = new Readable({ read() {} });
      const output: Readable = (<any> actor).createRetryingBody(body, { input, context }, 2, 0, url, undefined);

      (<any> actor).logDebug.mockImplementation(() => {
        const fakeError: Error = <any> { toString: () => 'logDebug failed' };
        throw fakeError;
      });

      const outputPromise = arrayifyStream(output);
      body.emit('close');
      await expect(outputPromise).rejects.toThrow('logDebug failed');
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(0);
    });

    it('should return early if a body error occurs while a retry is already in progress', async() => {
      class FakeErroredBody {
        private readonly listeners: Record<string, ((...args: any[]) => void)[]> = {};
        private emittedInitialError = false;

        public on(event: string, listener: (...args: any[]) => void) {
          this.listeners[event] ||= [];
          this.listeners[event].push(listener);

          if (event === 'error' && !this.emittedInitialError) {
            this.emittedInitialError = true;
            listener(new Error('fake body error'));
            process.nextTick(() => this.emit('close'));
          }

          return this;
        }

        public once(event: string, listener: (...args: any[]) => void) {
          const wrapped = (...args: any[]) => {
            this.removeListener(event, wrapped);
            listener(...args);
          };
          return this.on(event, wrapped);
        }

        public removeListener(event: string, listener: (...args: any[]) => void) {
          this.listeners[event] = (this.listeners[event] || []).filter(l => l !== listener);
          return this;
        }

        public emit(event: string, ...args: any[]) {
          for (const listener of this.listeners[event] || []) {
            listener(...args);
          }
        }

        public pipe(destination: any) {
          return destination;
        }

        public pause() {}

        public destroy() {}
      }

      const url = new URL(input);
      const firstBody = new Readable({ read() {} });
      const secondBody = new FakeErroredBody();
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any> {
        ok: true,
        status: 200,
        body: secondBody,
        headers: new Headers(),
      });

      const output: Readable = (<any> actor).createRetryingBody(firstBody, { input, context }, 2, 0, url, undefined);
      const outputPromise = arrayifyStream(output);
      firstBody.emit('error', new Error('Body stream error'));

      await expect(outputPromise).rejects.toThrow('Response body closed before end during body retry');
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
    });

    it('should destroy output on aborted signals when body emits non-Error errors', async() => {
      const url = new URL(input);
      const abortController = new AbortController();
      abortController.abort();
      const body = new Readable({ read() {} });
      const action = { input, context, init: { signal: abortController.signal }};
      const output: Readable = (<any> actor).createRetryingBody(body, action, 2, 0, url, undefined);

      const outputPromise = arrayifyStream(output);
      body.emit('error', 'boom');
      await expect(outputPromise).rejects.toThrow('boom');
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(0);
    });

    it('should destroy output when retry limit is exhausted with non-Error errors', async() => {
      const url = new URL(input);
      const firstBody = new Readable({ read() {} });
      const secondBody = new Readable({ read() {} });
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any> {
        ok: true,
        status: 200,
        body: secondBody,
        headers: new Headers(),
      });
      setImmediate(() => secondBody.emit('error', 'second error'));

      const output: Readable = (<any> actor).createRetryingBody(firstBody, { input, context }, 2, 0, url, undefined);
      const outputPromise = arrayifyStream(output);
      firstBody.emit('error', new Error('first error'));

      await expect(outputPromise).rejects.toThrow('second error');
    });

    it('should error if the body closes before end after switching to streaming due to maxBytes', async() => {
      const url = new URL(input);
      const body = new Readable({ read() {} });
      const output: Readable = (<any> actor).createRetryingBody(body, { input, context }, 1, 0, url, 1);

      const outputPromise = arrayifyStream(output);
      body.emit('data', 'abc');
      body.destroy();

      await expect(outputPromise).rejects.toThrow(
        'Response body closed before end after disabling body retry due to maxBytes',
      );
    });

    it('should stop retrying if output is closed during the retry delay', async() => {
      jest.useFakeTimers();
      try {
        const url = new URL(input);
        const body = new Readable({ read() {} });
        const output: Readable = (<any> actor).createRetryingBody(body, { input, context }, 2, 10, url, undefined);

        const closed = new Promise<void>(resolve => output.once('close', () => resolve()));
        body.emit('error', new Error('Body stream error'));
        output.destroy();

        jest.advanceTimersByTime(10);
        await Promise.resolve();

        expect(mediatorHttp.mediate).toHaveBeenCalledTimes(0);
        await closed;
      } finally {
        jest.useRealTimers();
      }
    });

    it('should error if the retry response is not ok', async() => {
      const url = new URL(input);
      const body = new Readable({ read() {} });
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any> {
        ok: false,
        status: 500,
        body: null,
        headers: new Headers(),
      });

      const output: Readable = (<any> actor).createRetryingBody(body, { input, context }, 2, 0, url, undefined);
      const outputPromise = arrayifyStream(output);
      body.emit('error', new Error('Body stream error'));

      await expect(outputPromise).rejects.toThrow(`Response body retry failed for ${url.href}`);
    });

    it('should destroy retry response body if output is closed after retry response arrives', async() => {
      const url = new URL(input);
      const body = new Readable({ read() {} });
      const secondBody = new Readable({ read() {} });
      const secondBodyDestroySpy = jest.spyOn(secondBody, 'destroy');

      let resolveMediate: ((value: IActorHttpOutput) => void) | undefined;
      jest.spyOn(mediatorHttp, 'mediate').mockImplementation(async() => await new Promise((resolve) => {
        resolveMediate = resolve;
      }));

      const output: Readable = (<any> actor).createRetryingBody(body, { input, context }, 2, 0, url, undefined);
      body.emit('error', new Error('Body stream error'));
      await new Promise(resolve => process.nextTick(resolve));
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);

      output.destroy();
      resolveMediate!(<any> {
        ok: true,
        status: 200,
        body: secondBody,
        headers: new Headers(),
      });

      await new Promise(resolve => setImmediate(resolve));
      expect(secondBodyDestroySpy).toHaveBeenCalledWith();
    });

    it('should error if the HTTP mediator throws during a body retry', async() => {
      const url = new URL(input);
      const body = new Readable({ read() {} });
      jest.spyOn(mediatorHttp, 'mediate').mockRejectedValue(new Error('mediate failed'));

      const output: Readable = (<any> actor).createRetryingBody(body, { input, context }, 2, 0, url, undefined);
      const outputPromise = arrayifyStream(output);
      body.emit('error', new Error('Body stream error'));

      await expect(outputPromise).rejects.toThrow('mediate failed');
    });

    it('should error if the HTTP mediator throws a non-Error during a body retry', async() => {
      const url = new URL(input);
      const body = new Readable({ read() {} });
      jest.spyOn(mediatorHttp, 'mediate').mockRejectedValue('mediate failed');

      const output: Readable = (<any> actor).createRetryingBody(body, { input, context }, 2, 0, url, undefined);
      const outputPromise = arrayifyStream(output);
      body.emit('error', new Error('Body stream error'));

      await expect(outputPromise).rejects.toThrow('mediate failed');
    });
  });

  describe('static helpers', () => {
    it('getRequestMethod should derive the method from a Request input when init.method is undefined', () => {
      const request = new Request(input, { method: 'DELETE' });
      expect(ActorHttpRetryBody.getRequestMethod(<any> { input: request })).toBe('DELETE');
    });

    it('isReplayableRequestBody should return false for Request bodies (streams)', () => {
      const request = new Request(input, { method: 'POST', body: 'abc' });
      expect(ActorHttpRetryBody.isReplayableRequestBody(<any> { input: request })).toBe(false);
    });

    it('isReplayableBody should return true for supported BodyInit values', () => {
      expect(ActorHttpRetryBody.isReplayableBody(null)).toBe(true);
      expect(ActorHttpRetryBody.isReplayableBody(undefined)).toBe(true);
      expect(ActorHttpRetryBody.isReplayableBody('abc')).toBe(true);
      expect(ActorHttpRetryBody.isReplayableBody(new URLSearchParams('a=b'))).toBe(true);
      expect(ActorHttpRetryBody.isReplayableBody(new FormData())).toBe(true);
      expect(ActorHttpRetryBody.isReplayableBody(new ArrayBuffer(1))).toBe(true);
      expect(ActorHttpRetryBody.isReplayableBody(new Uint8Array([ 1, 2, 3 ]))).toBe(true);
      expect(ActorHttpRetryBody.isReplayableBody(new Blob([ 'a' ]))).toBe(true);
      expect(ActorHttpRetryBody.isReplayableBody({})).toBe(false);
    });
  });
});
