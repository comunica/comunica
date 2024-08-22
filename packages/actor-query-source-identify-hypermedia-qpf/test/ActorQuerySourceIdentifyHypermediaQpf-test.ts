import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { empty, TransformIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { QuerySourceQpf } from '../lib';
import { ActorQuerySourceIdentifyHypermediaQpf } from '../lib/ActorQuerySourceIdentifyHypermediaQpf';

const DF = new DataFactory();
const v1 = DF.variable('v1');
const v2 = DF.variable('v2');
const v3 = DF.variable('v3');
const v4 = DF.variable('v4');

const mediatorMergeBindingsContext: any = {
  mediate(arg: any) {
    return {};
  },
};

describe('ActorQuerySourceIdentifyHypermediaQpf', () => {
  let bus: any;
  let actor: ActorQuerySourceIdentifyHypermediaQpf;
  let metadata: any;
  let mediatorMetadata: any;
  let mediatorMetadataExtract: any;
  let mediatorDereferenceRdf: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });

    mediatorMetadata = {
      mediate: () => Promise.resolve({}),
    };
    mediatorMetadataExtract = {
      mediate: () => Promise.resolve({ next: 'NEXT' }),
    };
    mediatorDereferenceRdf = {
      mediate: () => Promise.resolve({}),
    };

    actor = new ActorQuerySourceIdentifyHypermediaQpf({
      bus,
      mediatorMetadata,
      mediatorMetadataExtract,
      mediatorDereferenceRdf,
      mediatorMergeBindingsContext,
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
          getUri: (entries: any) => `${entries.s || '_'},${entries.p || '_'},${entries.o || '_'
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
      expect(ActorQuerySourceIdentifyHypermediaQpf).toBeInstanceOf(Function);
    });

    it('should be a ActorQuerySourceIdentifyHypermediaQpf constructor', () => {
      expect(new (<any> ActorQuerySourceIdentifyHypermediaQpf)({
        bus,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorDereferenceRdf,
        name: 'actor',
        objectUri: 'o',
        predicateUri: 'p',
        subjectUri: 's',
      }))
        .toBeInstanceOf(ActorQuerySourceIdentifyHypermediaQpf);
    });

    it('should not be able to create new ActorQuerySourceIdentifyHypermediaQpf objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQuerySourceIdentifyHypermediaQpf)();
      }).toThrow(`Class constructor ActorQuerySourceIdentifyHypermediaQpf cannot be invoked without 'new'`);
    });

    it('should not throw an error when constructed without optional graph uri', () => {
      expect(() => {
        new (<any> ActorQuerySourceIdentifyHypermediaQpf)({
          bus,
          name: 'actor',
          objectUri: 'o',
          predicateUri: 'p',
          subjectUri: 's',
        });
      }).not.toThrow('TODO');
    });
  });

  describe('#createSource', () => {
    it('should create an RdfSourceQpf', async() => {
      const context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
      const quads = empty();
      const source: any = await (<any> actor).createSource('url', metadata, context, false, quads);
      expect(source).toBeInstanceOf(QuerySourceQpf);
      expect(source.mediatorMetadata).toBe(mediatorMetadata);
      expect(source.mediatorMetadataExtract).toBe(mediatorMetadataExtract);
      expect(source.mediatorDereferenceRdf).toBe(mediatorDereferenceRdf);
      expect(source.subjectUri).toBe('s');
      expect(source.predicateUri).toBe('p');
      expect(source.objectUri).toBe('o');
      expect(source.graphUri).toBe('g');
      expect(source.getCachedQuads(v1, v2, v3, v4)).toBeInstanceOf(TransformIterator);
    });
  });

  describe('#test', () => {
    it('should test with a single source', async() => {
      await expect(actor.test({
        quads: <any> null,
        url: '',
        metadata,
        context: new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' },
        }),
      })).resolves.toEqual({ filterFactor: 1 });
    });

    it('should test with a single source and empty handledDatasets', async() => {
      await expect(actor.test({
        quads: <any> null,
        url: '',
        metadata,
        context: new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' },
        }),
        handledDatasets: {},
      })).resolves.toEqual({ filterFactor: 1 });
    });

    it('should test with a single source forced to qpf', async() => {
      await expect(actor.test({
        quads: <any> null,
        url: '',
        metadata,
        context: new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' },
        }),
        forceSourceType: 'qpf',
      })).resolves.toEqual({ filterFactor: 1 });
    });

    it('should not test with a single source forced to non-qpf', async() => {
      await expect(actor.test({
        quads: <any> null,
        url: '',
        metadata,
        context: new ActionContext({
          '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' },
        }),
        forceSourceType: 'non-qpf',
      })).rejects
        .toThrow(new Error('Actor actor is not able to handle source type non-qpf.'));
    });

    it('should not test without a search form', async() => {
      metadata = {};
      await expect(actor.test({
        quads: <any> null,
        url: '',
        metadata,
        context: new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' },
        }),
      })).rejects.toThrow(new Error('Illegal state: found no TPF/QPF search form anymore in metadata.'));
    });

    it('should when the dataset has already been handled', async() => {
      await expect(actor.test({
        quads: <any> null,
        url: '',
        metadata,
        context: new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' },
        }),
        handledDatasets: { DATASET: true },
      })).rejects.toThrow(
        new Error('Actor actor can only be applied for the first page of a QPF dataset.'),
      );
    });
  });

  describe('#run', () => {
    it('should return a source and dataset', async() => {
      const output = await actor.run({
        quads: <any> null,
        url: '',
        metadata,
        context: new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' },
        }),
      });
      expect(output.source).toBeInstanceOf(QuerySourceQpf);
      expect(output.dataset).toBe('DATASET');
    });
  });
});
