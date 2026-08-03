import { Readable } from 'node:stream';
import type {
  IActionAbstractMediaTypedHandle,
  IActorOutputAbstractMediaTypedHandle,
  IActorOutputAbstractMediaTypedMediaTypes,
} from '@comunica/actor-abstract-mediatyped';
import type { IActionParse, IActorParseOutput } from '@comunica/actor-abstract-parse';
import type { IActionDereference, IActorDereferenceOutput } from '@comunica/bus-dereference';
import { emptyReadable, DereferenceRdfCachePolicyDereferenceWrapper } from '@comunica/bus-dereference';
import { KeysCore, KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { LoggerVoid } from '@comunica/logger-void';
import type { ICachePolicy } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { ActorDereferenceRdfParse } from '../lib/ActorDereferenceRdfParse';

describe('ActorAbstractDereferenceParse', () => {
  let context: ActionContext;
  let actor: ActorDereferenceRdfParse;

  beforeEach(() => {
    actor = new ActorDereferenceRdfParse({
      bus: new Bus({ name: 'bus' }),
      // @ts-expect-error
      mediatorDereference: {
        mediate: jest.fn(async(action: IActionDereference): Promise<IActorDereferenceOutput> => {
          const ext = (<any>action.context).hasRaw('extension') ?
              (<any>action.context).getRaw('extension') :
            'index.html';
          let cachePolicy: ICachePolicy<IActionDereference> | undefined;
          if ((<any>action.context).hasRaw('cachepolicy')) {
            cachePolicy = <any> 'CACHEPOLICY';
          }
          return {
            data: emptyReadable(),
            url: `${action.url}${ext}`,
            requestTime: 0,
            status: 404,
            exists: !(<any>action.context).hasRaw('doesNotExist'),
            mediaType: (<any> action).mediaType,
            cachePolicy,
          };
        }),
      },
      // @ts-expect-error
      mediatorParse: {
        mediate: jest.fn(async(action: IActionAbstractMediaTypedHandle<IActionParse<any>>):
        Promise<IActorOutputAbstractMediaTypedHandle<IActorParseOutput<any, any>>> => {
          const data = new Readable();
          if ((<any>action.context).hasRaw('emitParseError')) {
            data._read = () => {
              data.emit('error', new Error('Parse error'));
            };
            return { handle: { data, metadata: { triples: true }}};
          }
          if ((<any>action.context).hasRaw('emitAbortError')) {
            data._read = () => {
              const abortError = new Error('Aborted');
              abortError.name = 'AbortError';
              data.emit('error', abortError);
            };
            return { handle: { data, metadata: { triples: true }}};
          }
          if ((<any>action.context).hasRaw('parseReject')) {
            throw new Error('Parse reject error');
          }
          data._read = () => {
            action.handle.data.read(1);
            data.push(null);
          };
          action.handle.data.on('error', (error: Error) => data.emit('error', error));
          return { handle: { data, metadata: { triples: true }}};
        }),
      },
      // @ts-expect-error
      mediatorParseMediatypes: {
        mediate: () => Promise.resolve<IActorOutputAbstractMediaTypedMediaTypes>({ mediaTypes: {}}),
      },
      mediaMappings: {
        x: 'y',
      },
      name: 'actor',
    });
  });

  it('Should resolve media mappings correctly (unknown extension)', async() => {
    context = new ActionContext({});
    const output = await actor.run({ url: 'https://www.google.com/', context });
    expect(output.url).toBe('https://www.google.com/index.html');
    expect(actor.mediatorParse.mediate).toHaveBeenCalledWith({
      context,
      handle: expect.anything(),
      handleMediaType: '',
    });
  });

  it('Should resolve media mappings correctly (unknown extension - given mediaType)', async() => {
    context = new ActionContext({});
    const output = await actor.run({ url: 'https://www.google.com/', context, mediaType: 'rdf' });
    expect(output.url).toBe('https://www.google.com/index.html');
    expect(actor.mediatorParse.mediate).toHaveBeenCalledWith({
      context,
      handle: expect.anything(),
      handleMediaType: 'rdf',
    });
  });

  it('Should resolve media mappings correctly (known extension)', async() => {
    context = new ActionContext({ extension: 'other.x' });
    const output = await actor.run({ url: 'https://www.google.com/', context });
    expect(output.url).toBe('https://www.google.com/other.x');
    expect(actor.mediatorParse.mediate).toHaveBeenCalledWith({
      context,
      handle: expect.anything(),
      handleMediaType: 'y',
    });
  });

  it('Should resolve media mappings correctly (known extension - given empty mediaType)', async() => {
    context = new ActionContext({ extension: 'other.x' });
    const output = await actor.run({ url: 'https://www.google.com/', context, mediaType: '' });
    expect(output.url).toBe('https://www.google.com/other.x');
    expect(actor.mediatorParse.mediate).toHaveBeenCalledWith({
      context,
      handle: expect.anything(),
      handleMediaType: 'y',
    });
  });

  it('should run and receive parse errors', async() => {
    context = new ActionContext({ emitParseError: true });
    const output = await actor.run({ url: 'https://www.google.com/', context });
    expect(output.url).toBe('https://www.google.com/index.html');
    await expect(arrayifyStream(output.data)).rejects.toThrow(new Error('Parse error'));
  });

  it('should run and ignore parse errors in lenient mode', async() => {
    context = new ActionContext({ emitParseError: true, [KeysInitQuery.lenient.name]: true });
    const spy = jest.spyOn(actor, <any> 'logWarn');
    const output = await actor.run({ url: 'https://www.google.com/', context });
    expect(output.url).toBe('https://www.google.com/index.html');
    await expect(arrayifyStream(output.data)).resolves.toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should run and ignore parse errors in lenient mode and log them', async() => {
    const logger = new LoggerVoid();
    const spy = jest.spyOn(logger, 'warn');
    context = new ActionContext({
      emitParseError: true,
      [KeysInitQuery.lenient.name]: true,
      [KeysCore.log.name]: logger,
    });
    const output = await actor.run({ url: 'https://www.google.com/', context });
    await expect(arrayifyStream(output.data)).resolves.toEqual([]);
    expect(spy).toHaveBeenCalledWith('Parse error', {
      actor: 'actor',
      url: 'https://www.google.com/',
    });
  });

  it('should run and not log on an abort error', async() => {
    context = new ActionContext({ emitAbortError: true, [KeysInitQuery.lenient.name]: true });
    const spy = jest.spyOn(actor, <any> 'logWarn');
    const output = await actor.run({ url: 'https://www.google.com/', context });
    expect(output.url).toBe('https://www.google.com/index.html');
    await expect(arrayifyStream(output.data)).resolves.toEqual([]);
    expect(spy).not.toHaveBeenCalledWith();
  });

  it('should run and ignore non-existing dereferenced urls', async() => {
    context = new ActionContext({ doesNotExist: true });
    const output = await actor.run({ url: 'https://www.google.com/', context });
    expect(output.url).toBe('https://www.google.com/index.html');
    await expect(arrayifyStream(output.data)).resolves.toEqual([]);
  });

  it('should not run on parse rejects', async() => {
    context = new ActionContext({ parseReject: true });
    await expect(actor.run({ url: 'https://www.google.com/', context }))
      .rejects.toThrow(new Error('Parse reject error'));
  });

  it('should run and ignore parse rejects in lenient mode', async() => {
    context = new ActionContext({ parseReject: true, [KeysInitQuery.lenient.name]: true });
    const spy = jest.spyOn(actor, <any> 'logWarn');
    const output = await actor.run({ url: 'https://www.google.com/', context });
    expect(output.url).toBe('https://www.google.com/index.html');
    await expect(arrayifyStream(output.data)).resolves.toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should run and ignore parse rejects in lenient mode and log them', async() => {
    const logger = new LoggerVoid();
    const spy = jest.spyOn(logger, 'warn');
    const url = 'https://www.google.com/';
    context = new ActionContext({
      parseReject: true,
      [KeysInitQuery.lenient.name]: true,
      [KeysCore.log.name]: logger,
    });
    await actor.run({ url, context });
    expect(spy).toHaveBeenCalledWith('Parse reject error', {
      actor: 'actor',
      url,
    });
  });

  it('should wrap a cache policy', async() => {
    context = new ActionContext({ cachepolicy: true });
    const output = await actor.run({ url: 'https://www.google.com/', context });
    expect(output.url).toBe('https://www.google.com/index.html');
    expect(output.cachePolicy).toBeInstanceOf(DereferenceRdfCachePolicyDereferenceWrapper);
    expect((<any> output.cachePolicy).cachePolicy).toBe('CACHEPOLICY');
  });
});
