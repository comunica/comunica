import { ActorQueryResultSerialize } from '@comunica/bus-query-result-serialize';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorQueryResultSerializeRdf } from '../lib/ActorQueryResultSerializeRdf';

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
      expect(() => { (<any> ActorQueryResultSerializeRdf)(); }).toThrow();
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
      it('should not test for an invalid media type and a quad stream', () => {
        const handle: any = { quadStream: true, type: 'quads' };
        return expect(actor.test({ handle, handleMediaType: 'abc', context })).rejects.toBeTruthy();
      });

      it('should not test for a valid media type and a bindings stream', () => {
        const handle: any = { bindingsStream: true, type: 'bindings' };
        return expect(actor.test({ handle, handleMediaType: 'text/turtle', context })).rejects.toBeTruthy();
      });

      it('should test for a valid media type and a quad stream', () => {
        const handle: any = { quadStream: true, type: 'quads' };
        return expect(actor.test({ handle, handleMediaType: 'text/turtle', context })).resolves.toBeTruthy();
      });

      it('should run for a valid media type and a quad stream', () => {
        const handle: any = { quadStream: true, type: 'quads' };
        return expect(actor.run({ handle, handleMediaType: 'text/turtle', context })).resolves.toEqual(
          { handle: { quadStream: true, context }},
        );
      });
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true, context })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          'application/ld+json': 1,
          'text/turtle': 1,
        }});
      });
    });

    describe('for getting media type formats', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypeFormats: true, context })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypeFormats: true, context })).resolves.toEqual({ mediaTypeFormats: {
          'application/ld+json': 'JSON-LD',
          'text/turtle': 'TURTLE',
        }});
      });
    });
  });
});
