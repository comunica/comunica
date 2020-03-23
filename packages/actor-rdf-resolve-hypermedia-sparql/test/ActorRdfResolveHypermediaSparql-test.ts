import {ActorRdfResolveHypermedia} from "@comunica/bus-rdf-resolve-hypermedia";
import {Bus} from "@comunica/core";
import {ActorRdfResolveHypermediaSparql} from "../lib/ActorRdfResolveHypermediaSparql";
import {RdfSourceSparql} from "../lib/RdfSourceSparql";

describe('ActorRdfResolveHypermediaSparql', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfResolveHypermediaSparql module', () => {
    it('should be a function', () => {
      expect(ActorRdfResolveHypermediaSparql).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfResolveHypermediaSparql constructor', () => {
      expect(new (<any> ActorRdfResolveHypermediaSparql)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveHypermediaSparql);
      expect(new (<any> ActorRdfResolveHypermediaSparql)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveHypermedia);
    });

    it('should not be able to create new ActorRdfResolveHypermediaSparql objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfResolveHypermediaSparql)(); }).toThrow();
    });
  });

  describe('An ActorRdfResolveHypermediaSparql instance', () => {
    let actor: ActorRdfResolveHypermediaSparql;

    beforeEach(() => {
      actor = new ActorRdfResolveHypermediaSparql(
        { name: 'actor', bus, mediatorHttp: <any> 'mediator', checkUrlSuffix: true });
    });

    describe('#test', () => {
      it('should test with a forced sparql source type', async () => {
        return expect(await actor.test({ url: 'URL', metadata: {}, quads: null, forceSourceType: 'sparql' }))
          .toEqual({ filterFactor: 1 });
      });

      it('should not test with a forced unknown source type', async () => {
        return expect(actor.test({ url: 'URL', metadata: {}, quads: null, forceSourceType: 'unknown' }))
          .rejects.toThrow(new Error('Actor actor is not able to handle source type unknown.'));
      });

      it('should test with a sparql service metadata', async () => {
        return expect(await actor.test({ url: 'URL', metadata: { sparqlService: 'SERVICE' }, quads: null }))
          .toEqual({ filterFactor: 1 });
      });

      it('should not test without a sparql service metadata', async () => {
        return expect(actor.test({ url: 'URL', metadata: {}, quads: null }))
          .rejects.toThrow(new Error('Actor actor could not detect a SPARQL service description or URL ending on /sparql.'));
      });

      it('should test with an URL ending with /sparql', async () => {
        return expect(await actor.test({ url: 'URL/sparql', metadata: {}, quads: null }))
          .toEqual({ filterFactor: 1 });
      });

      it('should not test with an URL ending with /sparql if checkUrlSuffix is false', async () => {
        actor = new ActorRdfResolveHypermediaSparql(
          { name: 'actor', bus, mediatorHttp: <any> 'mediator', checkUrlSuffix: false });
        return expect(actor.test({ url: 'URL/sparql', metadata: {}, quads: null }))
          .rejects.toThrow(new Error('Actor actor could not detect a SPARQL service description or URL ending on /sparql.'));
      });

      it('should not test with an URL ending with /sparql if the type is forced to something else', async () => {
        actor = new ActorRdfResolveHypermediaSparql(
          { name: 'actor', bus, mediatorHttp: <any> 'mediator', checkUrlSuffix: false });
        return expect(actor.test({ url: 'URL/sparql', metadata: {}, quads: null, forceSourceType: 'file' }))
          .rejects.toThrow(new Error('Actor actor is not able to handle source type file.'));
      });
    });

    describe('#run', () => {
      it('should return a source', async () => {
        const output = await actor.run({ url: 'URL', metadata: { sparqlService: 'SERVICE' }, quads: null });
        expect(output.source).toBeInstanceOf(RdfSourceSparql);
        expect((<any> output.source).url).toEqual('SERVICE');
      });

      it('should return a source when no sparqlService was defined in metadata', async () => {
        const output = await actor.run({ url: 'URL', metadata: {}, quads: null, forceSourceType: 'sparql' });
        expect(output.source).toBeInstanceOf(RdfSourceSparql);
        expect((<any> output.source).url).toEqual('URL');
      });
    });
  });
});
