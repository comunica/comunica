const parseUriTemplateSpy = jest.spyOn(require('uritemplate'), 'parse');

import {ActorRdfMetadataExtract} from "@comunica/bus-rdf-metadata-extract";
import {Bus} from "@comunica/core";
import {ActorRdfMetadataExtractHydraControlsQuery} from "../lib/ActorRdfMetadataExtractHydraControlsQuery";
const stream = require('streamify-array');
const quad = require('rdf-quad');

const queryEngine = require('@comunica/actor-init-sparql').newEngine();

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
      return expect(actor.test({ pageUrl: '', metadata: stream([]) })).resolves.toBeTruthy();
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
        pageUrl: 'mypage',
      });
      expect(output.metadata.searchForms.values[0].getUri({ propa: 'A', propb: 'B' }))
        .toEqual('http://example.org/?a=A&b=B');
      return expect(output).toMatchObject({
        metadata: {
          searchForms: {
            values: [
              {
                // getUri,
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

    it('should cache templates', async () => {
      jest.clearAllMocks();
      await actor.run({
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
        pageUrl: 'mypage',
      });
      await actor.run({
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
        pageUrl: 'mypage',
      });
      expect(parseUriTemplateSpy).toHaveBeenCalledTimes(1);
    });

    it('should run on no mappings', async () => {
      return expect(await actor.run({
        metadata: stream([
          quad('subset', HYDRA + 'search', 'search1'),
          quad('search1', HYDRA + 'template', 'http://example.org/{?a,b}'),
          quad('subset', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', HYDRA + 'Collection'),
          quad('subset', 'http://rdfs.org/ns/void#subset', 'mypage'),
          quad('mypage', 'somethingelse', 'somevalue'),
        ]),
        pageUrl: 'mypage',
      })).toMatchObject({
        metadata: {
          searchForms: {
            values: [
              {
                // getUri,
                mappings: {},
                template: 'http://example.org/{?a,b}',
              },
            ],
          },
        },
      });
    });

    it('should run on no search forms', async () => {
      return expect(await actor.run({
        metadata: stream([
          quad('subset', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', HYDRA + 'Collection'),
          quad('subset', 'http://rdfs.org/ns/void#subset', 'mypage'),
          quad('mypage', 'somethingelse', 'somevalue'),
        ]),
        pageUrl: 'mypage',
      })).toMatchObject({
        metadata: {
          searchForms: {
            values: [],
          },
        },
      });
    });

    it('should run on no metadata', async () => {
      return expect(await actor.run({
        metadata: stream([]),
        pageUrl: 'mypage',
      })).toMatchObject({
        metadata: {
          searchForms: {
            values: [],
          },
        },
      });
    });
  });
});
