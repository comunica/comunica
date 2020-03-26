import {ActorSparqlSerialize} from "@comunica/bus-sparql-serialize";
import {Bus} from "@comunica/core";
import {ActorSparqlSerializeRdf} from "../lib/ActorSparqlSerializeRdf";

describe('ActorSparqlSerializeRdf', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorSparqlSerializeRdf module', () => {
    it('should be a function', () => {
      expect(ActorSparqlSerializeRdf).toBeInstanceOf(Function);
    });

    it('should be a ActorSparqlSerializeRdf constructor', () => {
      expect(new (<any> ActorSparqlSerializeRdf)({ name: 'actor', bus })).toBeInstanceOf(ActorSparqlSerializeRdf);
      expect(new (<any> ActorSparqlSerializeRdf)({ name: 'actor', bus })).toBeInstanceOf(ActorSparqlSerialize);
    });

    it('should not be able to create new ActorSparqlSerializeRdf objects without \'new\'', () => {
      expect(() => { (<any> ActorSparqlSerializeRdf)(); }).toThrow();
    });
  });

  describe('An ActorSparqlSerializeRdf instance', () => {
    let actor: ActorSparqlSerializeRdf;
    let mediatorRdfSerialize;
    let mediatorMediaTypeCombiner;
    let mediatorMediaTypeFormatCombiner;

    beforeEach(() => {
      mediatorRdfSerialize = {
        mediate: (arg) => Promise.resolve(arg.mediaTypes ? { mediaTypes: {
          'application/ld+json': 1.0,
          'text/turtle': 1.0,
        } } : (
          arg.mediaTypeFormats ? { mediaTypeFormats: {
            'application/ld+json': 'JSON-LD',
            'text/turtle': 'TURTLE',
          } } : { handle: arg.handle })),
      };
      mediatorMediaTypeCombiner = mediatorRdfSerialize;
      mediatorMediaTypeFormatCombiner = mediatorRdfSerialize;
      actor = new ActorSparqlSerializeRdf(
        { mediatorRdfSerialize, mediatorMediaTypeCombiner, mediatorMediaTypeFormatCombiner, name: 'actor', bus });
    });

    describe('for serializing', () => {
      it('should not test for an invalid media type and a quad stream', () => {
        const handle: any = { quadStream: true, type: 'quads' };
        return expect(actor.test({ handle, handleMediaType: 'abc' })).rejects.toBeTruthy();
      });

      it('should not test for a valid media type and a bindings stream', () => {
        const handle: any = { bindingsStream: true, type: 'bindings' };
        return expect(actor.test({ handle, handleMediaType: 'text/turtle' })).rejects.toBeTruthy();
      });

      it('should test for a valid media type and a quad stream', () => {
        const handle: any = { quadStream: true, type: 'quads' };
        return expect(actor.test({ handle, handleMediaType: 'text/turtle' })).resolves.toBeTruthy();
      });

      it('should run for a valid media type and a quad stream', () => {
        const handle: any = { quadStream: true, type: 'quads' };
        return expect(actor.run({ handle, handleMediaType: 'text/turtle' })).resolves.toEqual(
          { handle: { quads: true } });
      });
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'application/ld+json': 1.0,
          'text/turtle': 1.0,
        }});
      });
    });

    describe('for getting media type formats', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypeFormats: true })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypeFormats: true })).resolves.toEqual({ mediaTypeFormats: {
          'application/ld+json': 'JSON-LD',
          'text/turtle': 'TURTLE',
        }});
      });
    });
  });
});
