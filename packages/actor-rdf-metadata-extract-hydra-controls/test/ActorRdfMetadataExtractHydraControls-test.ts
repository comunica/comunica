import { ActorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorRdfMetadataExtractHydraControls } from '../lib/ActorRdfMetadataExtractHydraControls';

const quad = require('rdf-quad');
const stream = require('streamify-array');

const HYDRA = 'http://www.w3.org/ns/hydra/core#';

describe('ActorRdfMetadataExtractHydraControls', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorRdfMetadataExtractHydraControls module', () => {
    it('should be a function', () => {
      expect(ActorRdfMetadataExtractHydraControls).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfMetadataExtractHydraControls constructor', () => {
      expect(new (<any> ActorRdfMetadataExtractHydraControls)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfMetadataExtractHydraControls);
      expect(new (<any> ActorRdfMetadataExtractHydraControls)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfMetadataExtract);
    });

    it('should not be able to create new ActorRdfMetadataExtractHydraControls objects without \'new\'', () => {
      expect(() => {
        (<any> ActorRdfMetadataExtractHydraControls)();
      }).toThrow(`Class constructor ActorRdfMetadataExtractHydraControls cannot be invoked without 'new'`);
    });
  });

  describe('An ActorRdfMetadataExtractHydraControls instance', () => {
    let actor: ActorRdfMetadataExtractHydraControls;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractHydraControls({ name: 'actor', bus });
    });

    it('should get no links for empty hydra properties', () => {
      const hydraProperties = {};
      expect(actor.getLinks('myPage', hydraProperties)).toEqual({
        first: [],
        last: [],
        next: [],
        previous: [],
      });
    });

    it('should get links for defined hydra properties', () => {
      const hydraProperties = {
        first: { otherPage: [ 'first2' ], myPage: [ 'first1' ]},
        last: { myPage: [ 'last1' ]},
        next: { myPage: [ 'next1' ]},
        previous: { myPage: [ 'previous1' ]},
        somethingElse: { myPage: [ 'next1' ]},
      };
      expect(actor.getLinks('myPage', hydraProperties)).toEqual({
        first: [ 'first1' ],
        last: [ 'last1' ],
        next: [ 'next1' ],
        previous: [ 'previous1' ],
      });
    });

    it('should get no search forms for empty hydra properties', () => {
      const hydraProperties = {};
      expect(actor.getSearchForms(hydraProperties)).toEqual({ values: []});
    });

    it('should get a search forms without mappings', () => {
      const hydraProperties = {
        search: { mydataset: [ 'search1' ]},
        template: {
          search1: [ 'http://example.org/' ],
        },
      };
      expect(actor.getSearchForms(hydraProperties)).toMatchObject({ values: [{
        // GetUri,
        mappings: {},
        template: 'http://example.org/',
      }]});
    });

    it('should get a search forms multiple times without mappings', () => {
      const hydraProperties = {
        search: { mydataset: [ 'search1' ]},
        template: {
          search1: [ 'http://example.org/' ],
        },
      };
      expect(actor.getSearchForms(hydraProperties)).toMatchObject({ values: [{
        // GetUri,
        mappings: {},
        template: 'http://example.org/',
      }]});
      expect(actor.getSearchForms(hydraProperties)).toMatchObject({ values: [{
        // GetUri,
        mappings: {},
        template: 'http://example.org/',
      }]});
    });

    it('should get a search forms without valid mappings', () => {
      const hydraProperties = {
        mapping: {
          searchInvalid: [ 'noMaping' ],
        },
        search: { mydataset: [ 'search1' ]},
        template: {
          search1: [ 'http://example.org/' ],
        },
      };
      expect(actor.getSearchForms(hydraProperties)).toMatchObject({ values: [{
        // GetUri,
        dataset: 'mydataset',
        mappings: {},
        template: 'http://example.org/',
      }]});
    });

    it('should get search forms for defined hydra properties', () => {
      const hydraProperties = {
        mapping: {
          search1: [ 'mapping1', 'mapping2' ],
          search2: [ 'mapping3', 'mapping4' ],
          searchInvalid: [ 'noMaping' ],
        },
        property: {
          mapping1: [ 'propa' ],
          mapping2: [ 'propb' ],
          mapping3: [ 'propc' ],
          mapping4: [ 'propd' ],
        },
        search: { mydataset: [ 'search1', 'search2' ]},
        template: {
          search1: [ 'http://example.org/{?a,b}' ],
          search2: [ 'http://example.org/sub/{?c,d}' ],
        },
        variable: {
          mapping1: [ 'a' ],
          mapping2: [ 'b' ],
          mapping3: [ 'c' ],
          mapping4: [ 'd' ],
        },
      };
      const searchForms = actor.getSearchForms(hydraProperties);
      expect(searchForms).toMatchObject({ values: [
        {
          // GetUri,
          dataset: 'mydataset',
          mappings: {
            propa: 'a',
            propb: 'b',
          },
          template: 'http://example.org/{?a,b}',
        },
        {
          // GetUri,
          dataset: 'mydataset',
          mappings: {
            propc: 'c',
            propd: 'd',
          },
          template: 'http://example.org/sub/{?c,d}',
        },
      ]});

      expect(searchForms.values[0].getUri({ propa: 'x', propb: 'y', propc: 'z' }))
        .toBe('http://example.org/?a=x&b=y');
      expect(searchForms.values[0].getUri({ propb: 'y' }))
        .toBe('http://example.org/?b=y');
      expect(searchForms.values[0].getUri({}))
        .toBe('http://example.org/');
      expect(searchForms.values[1].getUri({ propd: 'x', propc: 'y' }))
        .toBe('http://example.org/sub/?c=y&d=x');
    });

    it('should throw an error when getting a search form without a template value', () => {
      const hydraProperties = {
        mapping: {
          search1: [ 'mapping1', 'mapping2' ],
        },
        property: {
          mapping1: [ 'propa' ],
          mapping2: [ 'propb' ],
        },
        search: { mydataset: [ 'search1' ]},
        template: {
          search1: [],
        },
        variable: {
          mapping1: [ 'a' ],
          mapping2: [ 'b' ],
        },
      };
      expect(() => actor.getSearchForms(hydraProperties))
        .toThrow(`Expected 1 hydra:template for search1`);
    });

    it('should throw an error when getting a search form without a template subject', () => {
      const hydraProperties = {
        mapping: {
          search1: [ 'mapping1', 'mapping2' ],
        },
        property: {
          mapping1: [ 'propa' ],
          mapping2: [ 'propb' ],
        },
        search: { mydataset: [ 'search1' ]},
        template: {},
        variable: {
          mapping1: [ 'a' ],
          mapping2: [ 'b' ],
        },
      };
      expect(() => actor.getSearchForms(hydraProperties))
        .toThrow(`Expected 1 hydra:template for search1`);
    });

    it('should throw an error when getting a search form without a template property', () => {
      const hydraProperties = {
        mapping: {
          search1: [ 'mapping1', 'mapping2' ],
        },
        property: {
          mapping1: [ 'propa' ],
          mapping2: [ 'propb' ],
        },
        search: { mydataset: [ 'search1' ]},
        variable: {
          mapping1: [ 'a' ],
          mapping2: [ 'b' ],
        },
      };
      expect(() => actor.getSearchForms(hydraProperties))
        .toThrow(`Expected 1 hydra:template for search1`);
    });

    it('should throw an error when getting a search form without a mapping variable value', () => {
      const hydraProperties = {
        mapping: {
          search1: [ 'mapping1', 'mapping2' ],
        },
        property: {
          mapping1: [ 'propa' ],
          mapping2: [ 'propb' ],
        },
        search: { mydataset: [ 'search1' ]},
        template: {
          search1: [ 'http://example.org/{?a,b}' ],
        },
        variable: {
          mapping1: [],
          mapping2: [ 'b' ],
        },
      };
      expect(() => actor.getSearchForms(hydraProperties))
        .toThrow(`Expected a hydra:variable for mapping1`);
    });

    it('should throw an error when getting a search form without a mapping variable subject', () => {
      const hydraProperties = {
        mapping: {
          search1: [ 'mapping1', 'mapping2' ],
        },
        property: {
          mapping1: [ 'propa' ],
          mapping2: [ 'propb' ],
        },
        search: { mydataset: [ 'search1' ]},
        template: {
          search1: [ 'http://example.org/{?a,b}' ],
        },
        variable: {
          mapping2: [ 'b' ],
        },
      };
      expect(() => actor.getSearchForms(hydraProperties))
        .toThrow(`Expected a hydra:variable for mapping1`);
    });

    it('should throw an error when getting a search form without a mapping variable property', () => {
      const hydraProperties = {
        mapping: {
          search1: [ 'mapping1', 'mapping2' ],
        },
        property: {
          mapping1: [ 'propa' ],
          mapping2: [ 'propb' ],
        },
        search: { mydataset: [ 'search1' ]},
        template: {
          search1: [ 'http://example.org/{?a,b}' ],
        },
      };
      expect(() => actor.getSearchForms(hydraProperties))
        .toThrow(`Expected a hydra:variable for mapping1`);
    });

    it('should throw an error when getting a search form without a mapping property value', () => {
      const hydraProperties = {
        mapping: {
          search1: [ 'mapping1', 'mapping2' ],
        },
        property: {
          mapping1: [],
          mapping2: [ 'propb' ],
        },
        search: { mydataset: [ 'search1' ]},
        template: {
          search1: [ 'http://example.org/{?a,b}' ],
        },
        variable: {
          mapping1: [ 'a' ],
          mapping2: [ 'b' ],
        },
      };
      expect(() => actor.getSearchForms(hydraProperties))
        .toThrow(`Expected a hydra:property for mapping1`);
    });

    it('should throw an error when getting a search form without a mapping property subject', () => {
      const hydraProperties = {
        mapping: {
          search1: [ 'mapping1', 'mapping2' ],
        },
        property: {
          mapping2: [ 'propb' ],
        },
        search: { mydataset: [ 'search1' ]},
        template: {
          search1: [ 'http://example.org/{?a,b}' ],
        },
        variable: {
          mapping1: [ 'a' ],
          mapping2: [ 'b' ],
        },
      };
      expect(() => actor.getSearchForms(hydraProperties))
        .toThrow(`Expected a hydra:property for mapping1`);
    });

    it('should throw an error when getting a search form without a mapping property property', () => {
      const hydraProperties = {
        mapping: {
          search1: [ 'mapping1', 'mapping2' ],
        },
        search: { mydataset: [ 'search1' ]},
        template: {
          search1: [ 'http://example.org/{?a,b}' ],
        },
        variable: {
          mapping1: [ 'a' ],
          mapping2: [ 'b' ],
        },
      };
      expect(() => actor.getSearchForms(hydraProperties))
        .toThrow(`Expected a hydra:property for mapping1`);
    });

    it('should get hydra properties from stream', async() => {
      await expect(actor.getHydraProperties(stream([
        quad('mypage', `${HYDRA}next`, 'next'),
        quad('mypage', `${HYDRA}previous`, 'previous'),
        quad('mypage2', `${HYDRA}previous`, 'previous2'),
        quad('mypage', `${HYDRA}first`, 'first'),
        quad('mypage', `${HYDRA}last`, 'last'),
        quad('dataset', `${HYDRA}search`, 'search1'),
        quad('search1', `${HYDRA}template`, 'template1'),
        quad('search1', `${HYDRA}mapping`, 'mapping1'),
        quad('search1', `${HYDRA}mapping`, 'mapping2'),
        quad('mapping1', `${HYDRA}variable`, 'a'),
        quad('mapping1', `${HYDRA}property`, 'propa'),
        quad('mapping2', `${HYDRA}variable`, 'b'),
        quad('mapping2', `${HYDRA}property`, 'propb'),
        quad('mypage', 'somethingelse', 'somevalue'),
      ]))).resolves.toMatchObject({
        first: { mypage: [ 'first' ]},
        last: { mypage: [ 'last' ]},
        mapping: { search1: [ 'mapping1', 'mapping2' ]},
        next: { mypage: [ 'next' ]},
        previous: { mypage: [ 'previous' ], mypage2: [ 'previous2' ]},
        property: { mapping1: [ 'propa' ], mapping2: [ 'propb' ]},
        search: { dataset: [ 'search1' ]},
        template: { search1: [ 'template1' ]},
        variable: { mapping1: [ 'a' ], mapping2: [ 'b' ]},
      });
    });

    it('should test', async() => {
      await expect(actor.test({ url: '', metadata: stream([]), requestTime: 0, context })).resolves.toBeTruthy();
    });

    it('should run on valid controls', async() => {
      await expect(actor.run({ metadata: stream([
        quad('mypage', `${HYDRA}next`, 'next'),
        quad('mypage', `${HYDRA}previous`, 'previous'),
        quad('mypage', `${HYDRA}first`, 'first'),
        quad('mypage', `${HYDRA}last`, 'last'),
        quad('dataset', `${HYDRA}search`, 'search1'),
        quad('search1', `${HYDRA}template`, 'http://example.org/{?a,b}'),
        quad('search1', `${HYDRA}mapping`, 'mapping1'),
        quad('search1', `${HYDRA}mapping`, 'mapping2'),
        quad('mapping1', `${HYDRA}variable`, 'a'),
        quad('mapping1', `${HYDRA}property`, 'propa'),
        quad('mapping2', `${HYDRA}variable`, 'b'),
        quad('mapping2', `${HYDRA}property`, 'propb'),
        quad('mypage', 'somethingelse', 'somevalue'),
      ]), url: 'mypage', requestTime: 0, context })).resolves.toMatchObject({ metadata: {
        first: [ 'first' ],
        last: [ 'last' ],
        next: [ 'next' ],
        previous: [ 'previous' ],
        searchForms: {
          values: [
            {
              // GetUri,
              mappings: {
                propa: 'a',
                propb: 'b',
              },
              template: 'http://example.org/{?a,b}',
            },
          ],
        },
      }});
    });
  });
});
