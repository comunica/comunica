import { Transform } from 'node:stream';
import { ActorInit } from '@comunica/bus-init';
import { Bus } from '@comunica/core';
import type { IActorInitQueryBaseArgs } from '../lib/ActorInitQueryBase';
import { ActorInitQueryBase } from '../lib/ActorInitQueryBase';

describe('ActorInitQueryBase', () => {
  let bus: any;
  let mediatorQueryProcess: any;
  let mediatorSparqlSerialize: any;
  let mediatorHttpInvalidate: any;

  const defaultQueryInputFormat = 'sparql';

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryProcess = <any>{
      mediate: jest.fn().mockRejectedValue(new Error('Invalid query')),
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
      mediate: () => Promise.resolve(true),
    };
  });

  describe('The ActorInitQueryBase module', () => {
    it('should be a function', () => {
      expect(ActorInitQueryBase).toBeInstanceOf(Function);
    });

    it('should be a ActorInitQueryBase constructor', () => {
      expect(new (<any> ActorInitQueryBase)(
        { name: 'actor', bus, mediatorQueryProcess, mediatorSparqlSerialize },
      ))
        .toBeInstanceOf(ActorInitQueryBase);
      expect(new (<any> ActorInitQueryBase)(
        { name: 'actor', bus, mediatorQueryProcess, mediatorSparqlSerialize },
      ))
        .toBeInstanceOf(ActorInit);
    });

    it('should not be able to create new ActorInitQueryBase objects without \'new\'', () => {
      expect(() => {
        (<any> ActorInitQueryBase)();
      }).toThrow(`Class constructor ActorInitQueryBase cannot be invoked without 'new'`);
    });
  });

  describe('An ActorInitQueryBase instance', () => {
    let actor: ActorInitQueryBase;

    beforeEach(() => {
      actor = new ActorInitQueryBase(<IActorInitQueryBaseArgs> {
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
        await expect(actor.test(<any> {})).resolves.toPassTestVoid();
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
