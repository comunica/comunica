import { Transform } from 'node:stream';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type { IActorInitQueryBaseArgs } from '../lib';
import { ActorInitQuery } from '../lib/ActorInitQuery-browser';

describe('ActorInitQuery', () => {
  let bus: any;
  let mediatorQueryProcess: any;
  let mediatorSparqlSerialize: any;
  let mediatorHttpInvalidate: any;
  let context: IActionContext;
  const defaultQueryInputFormat = 'sparql';

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
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
      actor = new ActorInitQuery(<IActorInitQueryBaseArgs> {
        bus,
        defaultQueryInputFormat,
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
        await expect(actor.test(<any> {})).resolves.toBeTruthy();
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
