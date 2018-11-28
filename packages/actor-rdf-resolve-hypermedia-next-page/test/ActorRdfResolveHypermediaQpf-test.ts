import {ActorRdfResolveHypermedia} from "@comunica/bus-rdf-resolve-hypermedia";
import {ActionContext, Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {Readable} from "stream";
import {ActorRdfResolveHypermediaNextPage} from "../lib/ActorRdfResolveHypermediaNextPage";
const arrayifyStream = require('arrayify-stream');
import {blankNode, literal, namedNode, quad, variable} from "@rdfjs/data-model";

// tslint:disable:object-literal-sort-keys

describe('ActorRdfResolveHypermediaNextPage', () => {
  let bus;
  let actor;
  let metadata;
  let metadataFaulty;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });

    actor = new ActorRdfResolveHypermediaNextPage({ bus, name: 'actor' });

    metadata = {
      next: "next-page",
    };
    metadataFaulty = {
    };
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

    it('should not test without next link', () => {
      return expect(actor.test({metadata: metadataFaulty, context: ActionContext
        ({ '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' }}),
      })).rejects.toEqual(
        new Error(`actor requires a hydra:next link to work.`),
      );
    });
  });

  describe('#run', () => {
    it('should return a searchForm', () => {
      return actor.run({metadata, context: ActionContext
        ({ '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'source' }}),
      }).then((result) => {
        const searchForm = result.searchForm;
        return expect(searchForm.getUri()).toEqual('source') &&
          expect(searchForm.mappings).toEqual({}) &&
          expect(searchForm.template).toEqual('source');
      });
    });
  });
});
