import { ActorQueryResultSerialize } from '@comunica/bus-query-result-serialize';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorQueryResultSerializeRdf } from '../lib/ActorQueryResultSerializeRdf';
import '@comunica/utils-jest';

describe('ActorQueryResultSerializeRdf', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorQueryResultSerializeRdf module', () => {
    it('should be a function', () => {
      expect(ActorQueryResultSerializeRdf).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryResultSerializeRdf constructor', () => {
      expect(new (<any> ActorQueryResultSerializeRdf)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryResultSerializeRdf);
      expect(new (<any> ActorQueryResultSerializeRdf)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryResultSerialize);
    });

    it('should not be able to create new ActorQueryResultSerializeRdf objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryResultSerializeRdf)();
      }).toThrow(`Class constructor ActorQueryResultSerializeRdf cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryResultSerializeRdf instance', () => {
    let actor: ActorQueryResultSerializeRdf;
    let mediatorRdfSerialize: any;
    let mediatorMediaTypeCombiner: any;
    let mediatorMediaTypeFormatCombiner: any;
    let context: IActionContext;

    beforeEach(() => {
      mediatorRdfSerialize = {
        mediate: (arg: any) => Promise.resolve(arg.mediaTypes ?
            {
              mediaTypes: {
                'application/ld+json': 1,
                'text/turtle': 1,
              },
            } :
            (arg.mediaTypeFormats ?
                {
                  mediaTypeFormats: {
                    'application/ld+json': 'JSON-LD',
                    'text/turtle': 'TURTLE',
                  },
                } :
                { handle: arg.handle })),
      };
      mediatorMediaTypeCombiner = mediatorRdfSerialize;
      mediatorMediaTypeFormatCombiner = mediatorRdfSerialize;
      actor = new ActorQueryResultSerializeRdf(
        { mediatorRdfSerialize, mediatorMediaTypeCombiner, mediatorMediaTypeFormatCombiner, name: 'actor', bus },
      );
      context = new ActionContext();
    });

    describe('for serializing', () => {
      it('should not test for an invalid media type and a quad stream', async() => {
        const handle: any = { quadStream: true, type: 'quads' };
        await expect(actor.test({ handle, handleMediaType: 'abc', context })).resolves.toFailTest(`Actor actor can not handle media type abc. All available types: application/ld+json,text/turtle`);
      });

      it('should not test for a valid media type and a bindings stream', async() => {
        const handle: any = { bindingsStream: true, type: 'bindings' };
        await expect(actor.test({ handle, handleMediaType: 'text/turtle', context })).resolves.toFailTest(`Actor actor can only handle quad streams`);
      });

      it('should test for a valid media type and a quad stream', async() => {
        const handle: any = { quadStream: true, type: 'quads' };
        await expect(actor.test({ handle, handleMediaType: 'text/turtle', context })).resolves
          .toPassTest({ handle: true });
      });

      it('should run for a valid media type and a quad stream', async() => {
        const handle: any = { quadStream: true, type: 'quads' };
        await expect(actor.run({ handle, handleMediaType: 'text/turtle', context })).resolves.toEqual(
          { handle: { quadStream: true, context }},
        );
      });
    });

    describe('for getting media types', () => {
      it('should test', async() => {
        await expect(actor.test({ mediaTypes: true, context })).resolves.toPassTest({ mediaTypes: true });
      });

      it('should run', async() => {
        await expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          'application/ld+json': 1,
          'text/turtle': 1,
        }});
      });
    });

    describe('for getting media type formats', () => {
      it('should test', async() => {
        await expect(actor.test({ mediaTypeFormats: true, context })).resolves.toPassTest({ mediaTypeFormats: true });
      });

      it('should run', async() => {
        await expect(actor.run({ mediaTypeFormats: true, context })).resolves.toEqual({ mediaTypeFormats: {
          'application/ld+json': 'JSON-LD',
          'text/turtle': 'TURTLE',
        }});
      });
    });
  });
});
