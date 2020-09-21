import { ActorRdfResolveHypermedia } from '@comunica/bus-rdf-resolve-hypermedia';
import { ActionContext, Bus } from '@comunica/core';
import { TransformIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfResolveHypermediaQpf } from '../lib/ActorRdfResolveHypermediaQpf';
import { RdfSourceQpf } from '../lib/RdfSourceQpf';
const DF = new DataFactory();
const v = DF.variable('v');

describe('ActorRdfResolveHypermediaQpf', () => {
  let bus: any;
  let actor: any;
  let metadata: any;
  let mediatorMetadata: any;
  let mediatorMetadataExtract: any;
  let mediatorRdfDereference: any;

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
          getlUri: (entries: any) => `${entries.s || '_'},${entries.p || '_'},${entries.o || '_'
          },${entries.g || '_'}`,
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
      expect(new (<any> ActorRdfResolveHypermediaQpf)({ bus,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference,
        name: 'actor',
        objectUri: 'o',
        predicateUri: 'p',
        subjectUri: 's' }))
        .toBeInstanceOf(ActorRdfResolveHypermediaQpf);
      expect(new (<any> ActorRdfResolveHypermediaQpf)({ bus,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference,
        graphUri: 'g',
        name: 'actor',
        objectUri: 'o',
        predicateUri: 'p',
        subjectUri: 's' }))
        .toBeInstanceOf(ActorRdfResolveHypermedia);
    });

    it('should not be able to create new ActorRdfResolveHypermediaQpf objects without \'new\'', () => {
      return expect(() => { (<any> ActorRdfResolveHypermediaQpf)(); }).toThrow();
    });

    it('should not throw an error when constructed without optional graph uri', () => {
      return expect(() => { new (<any> ActorRdfResolveHypermediaQpf)({ bus,
        name: 'actor',
        objectUri: 'o',
        predicateUri: 'p',
        subjectUri: 's' }); }).not.toThrow();
    });
  });

  describe('#createSource', () => {
    it('should create an RdfSourceQpf', () => {
      const context = {};
      const quads = {};
      const source = actor.createSource(metadata, context, quads);
      expect(source).toBeInstanceOf(RdfSourceQpf);
      expect(source.mediatorMetadata).toBe(mediatorMetadata);
      expect(source.mediatorMetadataExtract).toBe(mediatorMetadataExtract);
      expect(source.mediatorRdfDereference).toBe(mediatorRdfDereference);
      expect(source.subjectUri).toEqual('s');
      expect(source.predicateUri).toEqual('p');
      expect(source.objectUri).toEqual('o');
      expect(source.graphUri).toEqual('g');
      expect(source.context).toBe(context);
      expect(source.getCachedQuads(v, v, v, v)).toBeInstanceOf(TransformIterator);
    });
  });

  describe('#test', () => {
    it('should test with a single source', () => {
      return expect(actor.test({ metadata,
        context: ActionContext({
          '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' },
        }) })).resolves.toEqual({ filterFactor: 1 });
    });

    it('should test with a single source and empty handledDatasets', () => {
      return expect(actor.test({ metadata,
        context: ActionContext({
          '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' },
        }),
        handledDatasets: {}})).resolves.toEqual({ filterFactor: 1 });
    });

    it('should test with a single source forced to qpf', () => {
      return expect(actor.test({ metadata,
        context: ActionContext({
          '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' },
        }),
        forceSourceType: 'qpf' })).resolves.toEqual({ filterFactor: 1 });
    });

    it('should not test with a single source forced to non-qpf', () => {
      return expect(actor.test({ metadata,
        context: ActionContext({
          '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' },
        }),
        forceSourceType: 'non-qpf' })).rejects
        .toThrow(new Error('Actor actor is not able to handle source type non-qpf.'));
    });

    it('should not test without a search form', () => {
      metadata = {};
      return expect(actor.test({ metadata,
        context: ActionContext({
          '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' },
        }) })).rejects.toThrow(new Error('Illegal state: found no TPF/QPF search form anymore in metadata.'));
    });

    it('should when the dataset has already been handled', () => {
      return expect(actor.test({ metadata,
        context: ActionContext({
          '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' },
        }),
        handledDatasets: { DATASET: true }})).rejects.toThrow(
        new Error('Actor actor can only be applied for the first page of a QPF dataset.'),
      );
    });
  });

  describe('#run', () => {
    it('should return a source and dataset', async() => {
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
