import { Transform } from 'stream';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorInitQuery } from '../lib/ActorInitQuery-browser';

describe('ActorInitQuery', () => {
  let bus: any;
  let logger: any;
  let mediatorQueryProcess: any;
  let mediatorSparqlSerialize: any;
  let mediatorHttpInvalidate: any;
  let context: IActionContext;
  const contextKeyShortcuts = {
    initialBindings: '@comunica/actor-init-query:initialBindings',
    log: '@comunica/core:log',
    queryFormat: '@comunica/actor-init-query:queryFormat',
    source: '@comunica/bus-rdf-resolve-quad-pattern:source',
    sources: '@comunica/bus-rdf-resolve-quad-pattern:sources',
  };
  const defaultQueryInputFormat = 'sparql';

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    logger = null;
    mediatorQueryProcess = <any>{
      mediate: jest.fn((action: any) => {
        return Promise.reject(new Error('Invalid query'));
      }),
    };
    mediatorSparqlSerialize = {
      mediate: (arg: any) => Promise.resolve(arg.mediaTypes ?
        { mediaTypes: arg } :
        {
          handle: {
            data: arg.handle.bindingsStream
              .pipe(new Transform({
                objectMode: true,
                transform: (e: any, enc: any, cb: any) => cb(null, JSON.stringify(e)),
              })),
          },
        }),
    };
    mediatorHttpInvalidate = {
      mediate: (arg: any) => Promise.resolve(true),
    };
    context = new ActionContext();
  });

  describe('An ActorInitQuery instance', () => {
    let actor: ActorInitQuery;
    beforeEach(() => {
      actor = new ActorInitQuery({
        bus,
        contextKeyShortcuts,
        defaultQueryInputFormat,
        logger,
        mediatorHttpInvalidate,
        mediatorQueryProcess,
        mediatorQueryResultSerialize: mediatorSparqlSerialize,
        mediatorQueryResultSerializeMediaTypeCombiner: mediatorSparqlSerialize,
        mediatorQueryResultSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
        name: 'actor',
      });
    });

    describe('test', () => {
      it('should be true', async() => {
        expect(await actor.test(<any> {})).toBeTruthy();
      });
    });

    describe('run', () => {
      it('should throw', async() => {
        await expect(actor.run(<any> {})).rejects
          .toThrow('ActorInitSparql#run is not supported in the browser.');
      });
    });
  });
});
