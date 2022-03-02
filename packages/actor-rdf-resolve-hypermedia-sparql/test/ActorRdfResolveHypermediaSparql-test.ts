import { ActorRdfResolveHypermedia } from '@comunica/bus-rdf-resolve-hypermedia';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorRdfResolveHypermediaSparql } from '../lib/ActorRdfResolveHypermediaSparql';
import { RdfSourceSparql } from '../lib/RdfSourceSparql';

describe('ActorRdfResolveHypermediaSparql', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
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
        { name: 'actor', bus, mediatorHttp: <any> 'mediator', checkUrlSuffix: true, forceHttpGet: false },
      );
    });

    describe('#test', () => {
      it('should test with a forced sparql source type', async() => {
        expect(await actor.test({ url: 'URL', metadata: {}, quads: <any> null, forceSourceType: 'sparql', context }))
          .toEqual({ filterFactor: 1 });
      });

      it('should not test with a forced unknown source type', async() => {
        await expect(actor.test({ url: 'URL', metadata: {}, quads: <any> null, forceSourceType: 'unknown', context }))
          .rejects.toThrow(new Error('Actor actor is not able to handle source type unknown.'));
      });

      it('should test with a sparql service metadata', async() => {
        expect(await actor.test({ url: 'URL', metadata: { sparqlService: 'SERVICE' }, quads: <any> null, context }))
          .toEqual({ filterFactor: 1 });
      });

      it('should not test without a sparql service metadata', async() => {
        await expect(actor.test({ url: 'URL', metadata: {}, quads: <any> null, context })).rejects
          .toThrow(new Error('Actor actor could not detect a SPARQL service description or URL ending on /sparql.'));
      });

      it('should test with an URL ending with /sparql', async() => {
        expect(await actor.test({ url: 'URL/sparql', metadata: {}, quads: <any> null, context }))
          .toEqual({ filterFactor: 1 });
      });

      it('should not test with an URL ending with /sparql if checkUrlSuffix is false', async() => {
        actor = new ActorRdfResolveHypermediaSparql(
          { name: 'actor', bus, mediatorHttp: <any> 'mediator', checkUrlSuffix: false, forceHttpGet: false },
        );
        await expect(actor.test({ url: 'URL/sparql', metadata: {}, quads: <any> null, context })).rejects
          .toThrow(new Error('Actor actor could not detect a SPARQL service description or URL ending on /sparql.'));
      });

      it('should not test with an URL ending with /sparql if the type is forced to something else', async() => {
        actor = new ActorRdfResolveHypermediaSparql(
          { name: 'actor', bus, mediatorHttp: <any> 'mediator', checkUrlSuffix: false, forceHttpGet: false },
        );
        await expect(actor
          .test({ url: 'URL/sparql', metadata: {}, quads: <any> null, forceSourceType: 'file', context }))
          .rejects.toThrow(new Error('Actor actor is not able to handle source type file.'));
      });
    });

    describe('#run', () => {
      it('should return a source', async() => {
        const output = await actor
          .run({ url: 'URL', metadata: { sparqlService: 'SERVICE' }, quads: <any> null, context });
        expect(output.source).toBeInstanceOf(RdfSourceSparql);
        expect((<any> output.source).url).toEqual('SERVICE');
      });

      it('should return a source when no sparqlService was defined in metadata', async() => {
        const output = await actor
          .run({ url: 'URL', metadata: {}, quads: <any> null, forceSourceType: 'sparql', context });
        expect(output.source).toBeInstanceOf(RdfSourceSparql);
        expect((<any> output.source).url).toEqual('URL');
      });
    });
  });
});
