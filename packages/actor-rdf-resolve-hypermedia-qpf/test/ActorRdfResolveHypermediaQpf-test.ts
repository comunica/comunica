import {ActorRdfResolveHypermedia} from "@comunica/bus-rdf-resolve-hypermedia";
import {ActionContext, Bus} from "@comunica/core";
import {PromiseProxyIterator} from "asynciterator-promiseproxy";
import {ActorRdfResolveHypermediaQpf} from "../lib/ActorRdfResolveHypermediaQpf";
import {RdfSourceQpf} from "../lib/RdfSourceQpf";

// tslint:disable:object-literal-sort-keys

describe('ActorRdfResolveHypermediaQpf', () => {
  let bus;
  let actor;
  let metadata;
  let mediatorMetadata;
  let mediatorMetadataExtract;
  let mediatorRdfDereference;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });

    mediatorMetadata = {
      mediate: () => Promise.resolve({}),
    };
    mediatorMetadataExtract = {
      mediate: () => Promise.resolve({ next: 'NEXT' }),
    };
    mediatorRdfDereference = {
      mediate: () => Promise.resolve({}),
    };

    actor = new ActorRdfResolveHypermediaQpf({
      bus,
      mediatorMetadata,
      mediatorMetadataExtract,
      mediatorRdfDereference,
      name: 'actor',
      objectUri: 'o',
      predicateUri: 'p',
      subjectUri: 's',
      graphUri: 'g',
    });

    metadata = {
      searchForms: { values: [
        {
          dataset: 'DATASET',
          getlUri: (entries) => (entries.s || '_') + ',' + (entries.p || '_') + ',' + (entries.o || '_')
          + ',' + (entries.g || '_'),
          mappings: {
            g: 'G',
            o: 'O',
            p: 'P',
            s: 'S',
          },
        },
      ]},
    };
  });

  describe('#constructor', () => {
    it('should be a function', () => {
      return expect(ActorRdfResolveHypermediaQpf).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfResolveHypermediaQpf constructor', () => {
      expect(new (<any> ActorRdfResolveHypermediaQpf)({ bus, mediatorMetadata,
        mediatorMetadataExtract, mediatorRdfDereference, name: 'actor', objectUri: 'o', predicateUri: 'p',
        subjectUri: 's' }))
        .toBeInstanceOf(ActorRdfResolveHypermediaQpf);
      expect(new (<any> ActorRdfResolveHypermediaQpf)({ bus, mediatorMetadata,
        mediatorMetadataExtract, mediatorRdfDereference, graphUri: 'g',
        name: 'actor', objectUri: 'o', predicateUri: 'p', subjectUri: 's' }))
        .toBeInstanceOf(ActorRdfResolveHypermedia);
    });

    it('should not be able to create new ActorRdfResolveHypermediaQpf objects without \'new\'', () => {
      return expect(() => { (<any> ActorRdfResolveHypermediaQpf)(); }).toThrow();
    });

    it('should not throw an error when constructed without optional graph uri', () => {
      return expect(() => { new (<any> ActorRdfResolveHypermediaQpf)({ bus,
        name: 'actor', objectUri: 'o', predicateUri: 'p', subjectUri: 's' }); }).not.toThrow();
    });
  });

  describe('#createSource', () => {
    it('should create an RdfSourceQpf', () => {
      const meta = {};
      const context = {};
      const quads = {};
      const source = actor.createSource(meta, context, quads);
      expect(source).toBeInstanceOf(RdfSourceQpf);
      expect((<any> source).mediatorMetadata).toBe(mediatorMetadata);
      expect((<any> source).mediatorMetadataExtract).toBe(mediatorMetadataExtract);
      expect((<any> source).mediatorRdfDereference).toBe(mediatorRdfDereference);
      expect((<any> source).subjectUri).toEqual('s');
      expect((<any> source).predicateUri).toEqual('p');
      expect((<any> source).objectUri).toEqual('o');
      expect((<any> source).graphUri).toEqual('g');
      expect((<any> source).context).toBe(context);
      expect((<any> source).getCachedQuads()).toBeInstanceOf(PromiseProxyIterator);
    });
  });

  describe('#test', () => {
    it('should test with a single source', () => {
      return expect(actor.test({metadata, context: ActionContext
        ({ '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' }}),
      })).resolves.toEqual({ filterFactor: 1 });
    });

    it('should test with a single source and empty handledDatasets', () => {
      return expect(actor.test({metadata, context: ActionContext
        ({ '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' }}),
        handledDatasets: {} })).resolves.toEqual({ filterFactor: 1 });
    });

    it('should test with a single source forced to qpf', () => {
      return expect(actor.test({metadata, context: ActionContext
        ({ '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' }}),
        forceSourceType: 'qpf' })).resolves.toEqual({ filterFactor: 1 });
    });

    it('should not test with a single source forced to non-qpf', () => {
      return expect(actor.test({metadata, context: ActionContext
        ({ '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' }}),
        forceSourceType: 'non-qpf'})).rejects
        .toThrow(new Error('Actor actor is not able to handle source type non-qpf.'));
    });

    it('should not test without a search form', () => {
      metadata = {};
      return expect(actor.test({metadata, context: ActionContext
        ({ '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' }}),
      })).rejects.toThrow(new Error('Actor actor could not detect a TPF/QPF search form.'));
    });

    it('should when the dataset has already been handled', () => {
      return expect(actor.test({metadata, context: ActionContext
        ({ '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' }}),
        handledDatasets: { DATASET: true } })).rejects.toThrow(
          new Error('Actor actor can only be applied for the first page of a QPF dataset.'));
    });
  });

  describe('#run', () => {
    it('should return a source and dataset', async () => {
      const output = await actor.run({
        metadata,
        context: ActionContext({
          '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' },
        }),
        url: '',
      });
      expect(output.source).toBeInstanceOf(RdfSourceQpf);
      expect(output.dataset).toEqual('DATASET');
    });
  });
});
