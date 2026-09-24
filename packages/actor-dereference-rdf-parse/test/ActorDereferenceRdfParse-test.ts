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
            headers: (<any>action.context).hasRaw('contentType') ?
              new Headers({ 'content-type': (<any>action.context).getRaw('contentType') }) :
              undefined,
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
    context = new ActionContext({ parseReject: true, extension: 'other.x' });
    await expect(actor.run({ url: 'https://www.google.com/', context }))
      .rejects.toThrow(new Error('Parse reject error'));
  });

  it('should run and ignore parse rejects in lenient mode', async() => {
    context = new ActionContext({ parseReject: true, extension: 'other.x', [KeysInitQuery.lenient.name]: true });
    const spy = jest.spyOn(actor, <any> 'logWarn');
    const output = await actor.run({ url: 'https://www.google.com/', context });
    expect(output.url).toBe('https://www.google.com/other.x');
    await expect(arrayifyStream(output.data)).resolves.toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should run and ignore parse rejects in lenient mode and log them', async() => {
    const logger = new LoggerVoid();
    const spy = jest.spyOn(logger, 'warn');
    const url = 'https://www.google.com/';
    context = new ActionContext({
      parseReject: true,
      extension: 'other.x',
      [KeysInitQuery.lenient.name]: true,
      [KeysCore.log.name]: logger,
    });
    await actor.run({ url, context });
    expect(spy).toHaveBeenCalledWith('Parse reject error', {
      actor: 'actor',
      url,
    });
  });

  it('should explain parse rejects of documents without a media type', async() => {
    context = new ActionContext({ parseReject: true });
    const error = await actor.run({ url: 'https://www.google.com/', context }).catch((error_: Error) => error_);
    expect(error).toEqual(new Error('Could not determine the media type of https://www.google.com/index.html, as it has no content type, and the extension of its URL is not recognized'));
    expect((<Error> error).cause).toEqual(new Error('Parse reject error'));
  });

  it('should explain parse rejects of documents with a too generic content type', async() => {
    context = new ActionContext({ parseReject: true, contentType: 'text/plain;charset=UTF-8' });
    await expect(actor.run({ url: 'https://www.google.com/', context })).rejects.toThrow('Could not determine the media type of https://www.google.com/index.html, as its content type (text/plain;charset=UTF-8) is too generic, and the extension of its URL is not recognized');
  });

  it('should explain parse rejects of documents without a media type in lenient mode', async() => {
    const logger = new LoggerVoid();
    const spy = jest.spyOn(logger, 'warn');
    const url = 'https://www.google.com/';
    context = new ActionContext({
      parseReject: true,
      [KeysInitQuery.lenient.name]: true,
      [KeysCore.log.name]: logger,
    });
    const output = await actor.run({ url, context });
    await expect(arrayifyStream(output.data)).resolves.toEqual([]);
    expect(spy).toHaveBeenCalledWith('Could not determine the media type of https://www.google.com/index.html, as it has no content type, and the extension of its URL is not recognized', {
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
