import {ActorSparqlSerializeSparqlJson} from "@comunica/actor-sparql-serialize-sparql-json";
import {Bindings} from "@comunica/bus-query-operation";
import {ActorRdfMetadataExtract} from "@comunica/bus-rdf-metadata-extract";
import {Bus} from "@comunica/core";
import {namedNode} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import "jest-rdf";
import {ActorRdfMetadataExtractHydraControlsQuery} from "../lib/ActorRdfMetadataExtractHydraControlsQuery";

const stream = require('streamify-array');
const quad = require('rdf-quad');

// tslint:disable:object-literal-sort-keys
const sparqlSerialer = new ActorSparqlSerializeSparqlJson(<any> { bus: new Bus({ name: 'b' }) });
const queryEngine: any = {
  query: async () => {
    return {
      bindingsStream: new ArrayIterator([
        Bindings({
          '?id': namedNode('subset'),
          '?graph': namedNode('g'),
          '?pageUrl': namedNode('http://example.org/?a=A&b=B'),
          '?search_template': namedNode('http://example.org/{?a,b}'),
          '?search_mapping_variable': namedNode('a'),
          '?search_mapping_property': namedNode('propa'),
        }),
        Bindings({
          '?id': namedNode('subset'),
          '?graph': namedNode('g'),
          '?pageUrl': namedNode('http://example.org/?a=A&b=B'),
          '?search_template': namedNode('http://example.org/{?a,b}'),
          '?search_mapping_variable': namedNode('b'),
          '?search_mapping_property': namedNode('propb'),
        }),
      ]),
    };
  },
  resultToString: ({ bindingsStream }) => sparqlSerialer
    .runHandle(<any> { type: 'bindings', bindingsStream, variables: ['v'] }, null, null),
};

const HYDRA: string = 'http://www.w3.org/ns/hydra/core#';

describe('ActorRdfMetadataExtractHydraControlsQuery', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfMetadataExtractHydraControlsQuery module', () => {
    it('should be a function', () => {
      expect(ActorRdfMetadataExtractHydraControlsQuery).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfMetadataExtractHydraControlsQuery constructor', () => {
      expect(new (<any> ActorRdfMetadataExtractHydraControlsQuery)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfMetadataExtractHydraControlsQuery);
      expect(new (<any> ActorRdfMetadataExtractHydraControlsQuery)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfMetadataExtract);
    });

    it('should not be able to create new ActorRdfMetadataExtractHydraControlsQuery objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfMetadataExtractHydraControlsQuery)(); }).toThrow();
    });
  });

  describe('An ActorRdfMetadataExtractHydraControlsQuery instance', () => {
    let actor: ActorRdfMetadataExtractHydraControlsQuery;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractHydraControlsQuery({ name: 'actor', bus, queryEngine });
    });

    it('should test', () => {
      return expect(actor.test({ url: '', metadata: stream([]) })).resolves.toBeTruthy();
    });

    it('should run on valid controls', async () => {
      const output = await actor.run({
        metadata: stream([
          quad('subset', HYDRA + 'search', 'search1'),
          quad('search1', HYDRA + 'template', 'http://example.org/{?a,b}'),
          quad('search1', HYDRA + 'mapping', 'mapping1'),
          quad('search1', HYDRA + 'mapping', 'mapping2'),
          quad('mapping1', HYDRA + 'variable', 'a'),
          quad('mapping1', HYDRA + 'property', 'propa'),
          quad('mapping2', HYDRA + 'variable', 'b'),
          quad('mapping2', HYDRA + 'property', 'propb'),
          quad('subset', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', HYDRA + 'Collection'),
          quad('subset', 'http://rdfs.org/ns/void#subset', 'mypage'),
          quad('mypage', 'somethingelse', 'somevalue'),
        ]),
        url: 'mypage',
      });
      expect(output.metadata.searchForms.values[0].getUri({ propa: 'A', propb: 'B' }))
        .toEqual('http://example.org/?a=A&b=B');
      return expect(output).toMatchObject({
        metadata: {
          searchForms: {
            values: [
              {
                // getUri,
                dataset: 'subset',
                mappings: {
                  propa: 'a',
                  propb: 'b',
                },
                template: 'http://example.org/{?a,b}',
              },
            ],
          },
        },
      });
    });

    describe('parseUriTemplateCached', () => {
      it('should return a uri template', async () => {
        const template = actor.parseUriTemplateCached('http://example.org/{?a,b}');
        expect(template).toMatchObject({
          templateText: 'http://example.org/{?a,b}',
        });
        expect(template.expand({ a: 'A', b: 'B' })).toEqual('http://example.org/?a=A&b=B');
      });

      it('should cache its outputs', async () => {
        const o1 = actor.parseUriTemplateCached('http://example.org/{?a,b}');
        const o2 = actor.parseUriTemplateCached('http://example.org/{?a,b}');
        const o3 = actor.parseUriTemplateCached('http://example.org/{?a,c}');
        expect(o1).toBe(o2);
        expect(o1).not.toBe(o3);
      });
    });

    describe('constructHydraControls', () => {
      it('should run on empty results', () => {
        return expect(actor.constructHydraControls({})).toEqual({
          values: [],
        });
      });

      it('should run on one valid search form', () => {
        return expect(actor.constructHydraControls({
          id: 'DATASET',
          search: [
            {
              template: 'http://example.org/{?a,b}',
              mapping: [
                {
                  property: 'propa',
                  variable: 'a',
                },
                {
                  property: 'propb',
                  variable: 'b',
                },
              ],
            },
          ],
        })).toMatchObject({
          values: [
            {
              // getUri,
              dataset: 'DATASET',
              mappings: {
                propa: 'a',
                propb: 'b',
              },
              template: 'http://example.org/{?a,b}',
            },
          ],
        });
      });

      it('should run on two search forms', () => {
        return expect(actor.constructHydraControls({
          id: 'DATASET',
          search: [
            {
              template: 'http://example.org/{?a,b}',
              mapping: [
                {
                  property: 'propa',
                  variable: 'a',
                },
                {
                  property: 'propb',
                  variable: 'b',
                },
              ],
            },
            {
              template: 'http://example2.org/{?a}',
              mapping: [
                {
                  property: 'propa',
                  variable: 'a',
                },
              ],
            },
          ],
        })).toMatchObject({
          values: [
            {
              // getUri,
              dataset: 'DATASET',
              mappings: {
                propa: 'a',
                propb: 'b',
              },
              template: 'http://example.org/{?a,b}',
            },
            {
              // getUri,
              dataset: 'DATASET',
              mappings: {
                propa: 'a',
              },
              template: 'http://example2.org/{?a}',
            },
          ],
        });
      });

      it('should run on no search forms', () => {
        return expect(actor.constructHydraControls({
          id: 'DATASET',
          search: [],
        })).toMatchObject({
          values: [],
        });
      });

      it('should run on a search form with empty mappings', () => {
        return expect(actor.constructHydraControls({
          id: 'DATASET',
          search: [
            {
              template: 'http://example.org/{?a,b}',
              mapping: [],
            },
          ],
        })).toMatchObject({
          values: [
            {
              // getUri,
              dataset: 'DATASET',
              template: 'http://example.org/{?a,b}',
            },
          ],
        });
      });

      it('should run on a search form without mappings', () => {
        return expect(actor.constructHydraControls({
          id: 'DATASET',
          search: [
            {
              template: 'http://example.org/{?a,b}',
            },
          ],
        })).toMatchObject({
          values: [
            {
              // getUri,
              dataset: 'DATASET',
              template: 'http://example.org/{?a,b}',
            },
          ],
        });
      });
    });
  });
});
