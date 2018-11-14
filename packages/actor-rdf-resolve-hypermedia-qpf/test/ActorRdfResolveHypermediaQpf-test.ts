import {ActorRdfResolveHypermedia} from "@comunica/bus-rdf-resolve-hypermedia";
import {ActionContext, Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {Readable} from "stream";
import {ActorRdfResolveHypermediaQpf} from "../lib/ActorRdfResolveHypermediaQpf";
const arrayifyStream = require('arrayify-stream');
import {blankNode, literal, namedNode, quad, variable} from "@rdfjs/data-model";

// tslint:disable:object-literal-sort-keys

describe('ActorRdfResolveHypermediaQpf', () => {
  let bus;
  let actor;
  let metadata;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });

    actor = new ActorRdfResolveHypermediaQpf({ bus, name: 'actor', objectUri: 'o',
      predicateUri: 'p', subjectUri: 's', graphUri: 'g' });

    metadata = {
      searchForms: { values: [
        {
          getUri: (entries) => (entries.s || '_') + ',' + (entries.p || '_') + ',' + (entries.o || '_')
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
      const isOwnClass: boolean = expect(new (<any> ActorRdfResolveHypermediaQpf)({ bus,
        name: 'actor', objectUri: 'o', predicateUri: 'p', subjectUri: 's' }))
        .toBeInstanceOf(ActorRdfResolveHypermediaQpf);
      return isOwnClass && expect(new (<any> ActorRdfResolveHypermediaQpf)({ bus, graphUri: 'g',
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

  describe('#test', () => {
    it('should test when source is hypermedia', () => {
      return expect(actor.test({metadata, context: ActionContext
        ({ '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' }}),
      })).resolves.toEqual(true);
    });

    it('should not test when source is not hypermedia', () => {
      return expect(actor.test({metadata, context: ActionContext
        ({ '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'an-other-type', value: 'source' }}),
      })).rejects.toThrow();
    });

    it('should not test without metadata', () => {
      return expect(actor.test({metadata: null, context: ActionContext
        ({ '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' }}),
      })).rejects.toEqual(
        new Error(`actor requires metadata and searchForms to work on.`),
      );
    });

    it('should not test without searchForms in metadata', () => {
      return expect(actor.test({metadata: {}, context: ActionContext
        ({ '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' }}),
      })).rejects.toEqual(
        new Error(`actor requires metadata and searchForms to work on.`),
      );
    });
  });

  describe('#run', () => {
    it('should return a searchForm', () => {
      return expect(actor.run({metadata, context: ActionContext
        ({ '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' }}),
      })).resolves.toEqual({ searchForm: metadata.searchForms.values[0] });
    });

    it('should return a searchForm withouth graph', () => {
      metadata = {
        searchForms: { values: [
          {
            getUri: (entries) => (entries.s || '_') + ',' + (entries.p || '_') + ',' + (entries.o || '_')
            + ',' + (entries.g || '_'),
            mappings: {
              o: 'O',
              p: 'P',
              s: 'S',
            },
          },
        ]},
      };
      return expect(actor.run({metadata, context: ActionContext
        ({ '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' }}),
      })).resolves.toEqual({ searchForm: metadata.searchForms.values[0] });
    });

    it('should not run when no URIs are defined in the searchForms of the metadata', () => {
      return expect(actor.run({metadata: {searchForms: {values: [ {
        mappings: {},
      } ] }}, context: ActionContext
        ({ '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' }}),
      })).rejects.toEqual(
        new Error('No valid Hydra search form was found for quad pattern or triple pattern queries.'));
    });
  });
});
