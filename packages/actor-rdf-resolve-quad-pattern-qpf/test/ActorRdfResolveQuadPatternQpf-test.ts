import {ActorRdfResolveQuadPattern} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {Readable} from "stream";
import {ActorRdfResolveQuadPatternQpf} from "../lib/ActorRdfResolveQuadPatternQpf";
const arrayifyStream = require('arrayify-stream');
import {blankNode, literal, namedNode, quad, variable} from "@rdfjs/data-model";
import {MediatedQuadSource} from "../lib/MediatedQuadSource";

// tslint:disable:object-literal-sort-keys

// Skip pattern filtering
MediatedQuadSource.matchPattern = () => true;

describe('ActorRdfResolveQuadPatternQpf', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfResolveQuadPatternQpf module', () => {
    it('should be a function', () => {
      expect(ActorRdfResolveQuadPatternQpf).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfResolveQuadPatternQpf constructor', () => {
      expect(new (<any> ActorRdfResolveQuadPatternQpf)({ bus, graphUri: 'g', mediatorRdfDereferencePaged: {},
        name: 'actor', objectUri: 'o', predicateUri: 'p', subjectUri: 's' }))
        .toBeInstanceOf(ActorRdfResolveQuadPatternQpf);
      expect(new (<any> ActorRdfResolveQuadPatternQpf)({ bus, graphUri: 'g', mediatorRdfDereferencePaged: {},
        name: 'actor', objectUri: 'o', predicateUri: 'p', subjectUri: 's' }))
        .toBeInstanceOf(ActorRdfResolveQuadPattern);
    });

    it('should not be able to create new ActorRdfResolveQuadPatternQpf objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfResolveQuadPatternQpf)(); }).toThrow();
    });

    it('should not throw an error when constructed without optional graph uri', () => {
      expect(() => { new (<any> ActorRdfResolveQuadPatternQpf)({ bus, mediatorRdfDereferencePaged: {},
        name: 'actor', objectUri: 'o', predicateUri: 'p', subjectUri: 's' }); }).not.toThrow();
    });
  });

  describe('An ActorRdfResolveQuadPatternQpf instance', () => {
    let actor: ActorRdfResolveQuadPatternQpf;
    let mediator;
    let pattern1;
    let pattern2;
    let pattern3;
    let pattern4;
    let pattern5;
    let pattern6;
    let metadataQpf;
    let metadataTpf;

    beforeEach(() => {
      mediator = {};
      pattern1 = {
        graph: namedNode('d'),
        object: namedNode('c'),
        predicate: variable('b'),
        subject: namedNode('a'),
      };
      pattern2 = {
        graph: namedNode('d'),
        object: variable('c'),
        predicate: namedNode('b'),
        subject: namedNode('a'),
      };
      pattern3 = {
        graph: variable('d'),
        object: namedNode('c'),
        predicate: namedNode('b'),
        subject: namedNode('a'),
      };
      pattern4 = {
        graph: namedNode('d'),
        object: namedNode('c'),
        predicate: namedNode('b'),
        subject: variable('a'),
      };
      pattern5 = {
        graph: namedNode('d'),
        object: blankNode('c'),
        predicate: namedNode('b'),
        subject: variable('a'),
      };
      pattern6 = {
        object: literal('c', namedNode('data')),
        predicate: literal('b', 'nl'),
        subject: literal('a'),
      };
      metadataQpf = {
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
      metadataTpf = {
        searchForms: { values: [
          {
            getUri: (entries) => (entries.s || '_') + ',' + (entries.p || '_') + ',' + (entries.o || '_'),
            mappings: {
              o: 'O',
              p: 'P',
              s: 'S',
            },
          },
        ]},
      };
      mediator.mediate = (action) => Promise.resolve({
        data: new ArrayIterator([
          quad(namedNode(action.url + '/a'), namedNode(action.url + '/a'), namedNode(action.url + '/a'),
            namedNode(action.url + '/a')),
          quad(namedNode(action.url + '/b'), namedNode(action.url + '/b'), namedNode(action.url + '/b'),
            namedNode(action.url + '/b')),
          quad(namedNode(action.url + '/c'), namedNode(action.url + '/c'), namedNode(action.url + '/c'),
            namedNode(action.url + '/c')),
        ]),
        firstPageMetadata: () => Promise.resolve(metadataQpf),
      });
      actor = new ActorRdfResolveQuadPatternQpf({ bus, graphUri: 'g', mediatorRdfDereferencePaged: mediator,
        name: 'actor', objectUri: 'o', predicateUri: 'p', subjectUri: 's' });
    });

    it('should test', () => {
      return expect(actor.test(
        { pattern: pattern1, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia' }})}))
        .resolves.toBeTruthy();
    });

    it('should not test without an hypermedia', () => {
      return expect(actor.test({ pattern: pattern1, context: ActionContext({}) })).rejects.toBeTruthy();
    });

    it('should not test without a context', () => {
      return expect(actor.test({ pattern: pattern1 })).rejects.toBeTruthy();
    });

    it('should run and error in the stream when no metadata is available', () => {
      mediator.mediate = () => Promise.resolve({});
      return actor.run({ pattern: pattern1, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia' }})})
        .then(async (output) => {
          expect(arrayifyStream(output.data)).rejects
            .toEqual(new Error('No metadata was found at hypermedia entrypoint hypermedia'));
        });
    });

    it('should not run when no metadata search forms are available', () => {
      mediator.mediate = () => Promise.resolve({ firstPageMetadata: () => Promise.resolve({}) });
      return actor.run({ pattern: pattern1, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia' }})})
        .then(async (output) => {
          expect(arrayifyStream(output.data)).rejects
            .toEqual(new Error('No Hydra search forms were discovered in the metadata of hypermedia. ' +
              'You may be missing an actor that extracts this metadata'));
        });
    });

    it('should not run when 0 metadata search forms are available', () => {
      mediator.mediate = () => Promise.resolve(
        { firstPageMetadata: () => Promise.resolve({ searchForms: { values: [] } }) });
      return actor.run({ pattern: pattern1, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia' }})})
        .then(async (output) => {
          expect(arrayifyStream(output.data)).rejects
            .toEqual(new Error('No Hydra search forms were discovered in the metadata of hypermedia. ' +
              'You may be missing an actor that extracts this metadata'));
        });
    });

    it('should not run when no valid metadata search form was found', () => {
      mediator.mediate = () => Promise.resolve(
        { firstPageMetadata: () => Promise.resolve({ searchForms: { values: [
          {
            getUri: () => null,
            mappings: {
              a: 'g1',
              b: 'o1',
              c: 'p1',
              d: 's1',
            },
          },
        ]}})});

      return actor.run({ pattern: pattern1, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia' }})})
        .then(async (output) => {
          expect(arrayifyStream(output.data)).rejects
            .toEqual(new Error('No valid Hydra search form was found for quad pattern or triple pattern queries.'));
        });
    });

    it('should run for QPF pattern 1', () => {
      return actor.run({ pattern: pattern1, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia' }})})
        .then(async (output) => {
          expect(await output.metadata()).toBe(metadataQpf);
          expect(await arrayifyStream(output.data)).toEqual([
            quad(namedNode('a,_,c,d/a'), namedNode('a,_,c,d/a'), namedNode('a,_,c,d/a'), namedNode('a,_,c,d/a')),
            quad(namedNode('a,_,c,d/b'), namedNode('a,_,c,d/b'), namedNode('a,_,c,d/b'), namedNode('a,_,c,d/b')),
            quad(namedNode('a,_,c,d/c'), namedNode('a,_,c,d/c'), namedNode('a,_,c,d/c'), namedNode('a,_,c,d/c')),
          ]);
        });
    });

    it('should run for QPF pattern 2', () => {
      return actor.run({ pattern: pattern2, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia' }})})
        .then(async (output) => {
          expect(await output.metadata()).toBe(metadataQpf);
          expect(await arrayifyStream(output.data)).toEqual([
            quad(namedNode('a,b,_,d/a'), namedNode('a,b,_,d/a'), namedNode('a,b,_,d/a'), namedNode('a,b,_,d/a')),
            quad(namedNode('a,b,_,d/b'), namedNode('a,b,_,d/b'), namedNode('a,b,_,d/b'), namedNode('a,b,_,d/b')),
            quad(namedNode('a,b,_,d/c'), namedNode('a,b,_,d/c'), namedNode('a,b,_,d/c'), namedNode('a,b,_,d/c')),
          ]);
        });
    });

    it('should run for QPF pattern 3', () => {
      return actor.run({ pattern: pattern3, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia' }})})
        .then(async (output) => {
          expect(await output.metadata()).toBe(metadataQpf);
          expect(await arrayifyStream(output.data)).toEqual([
            quad(namedNode('a,b,c,_/a'), namedNode('a,b,c,_/a'), namedNode('a,b,c,_/a'), namedNode('a,b,c,_/a')),
            quad(namedNode('a,b,c,_/b'), namedNode('a,b,c,_/b'), namedNode('a,b,c,_/b'), namedNode('a,b,c,_/b')),
            quad(namedNode('a,b,c,_/c'), namedNode('a,b,c,_/c'), namedNode('a,b,c,_/c'), namedNode('a,b,c,_/c')),
          ]);
        });
    });

    it('should run for QPF pattern 4', () => {
      return actor.run({ pattern: pattern4, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia' }})})
        .then(async (output) => {
          expect(await output.metadata()).toBe(metadataQpf);
          expect(await arrayifyStream(output.data)).toEqual([
            quad(namedNode('_,b,c,d/a'), namedNode('_,b,c,d/a'), namedNode('_,b,c,d/a'), namedNode('_,b,c,d/a')),
            quad(namedNode('_,b,c,d/b'), namedNode('_,b,c,d/b'), namedNode('_,b,c,d/b'), namedNode('_,b,c,d/b')),
            quad(namedNode('_,b,c,d/c'), namedNode('_,b,c,d/c'), namedNode('_,b,c,d/c'), namedNode('_,b,c,d/c')),
          ]);
        });
    });

    it('should run for QPF pattern 5', () => {
      return actor.run({ pattern: pattern5, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia' }})})
        .then(async (output) => {
          expect(await output.metadata()).toBe(metadataQpf);
          expect(await arrayifyStream(output.data)).toEqual([
            quad(namedNode('_,b,_,d/a'), namedNode('_,b,_,d/a'), namedNode('_,b,_,d/a'), namedNode('_,b,_,d/a')),
            quad(namedNode('_,b,_,d/b'), namedNode('_,b,_,d/b'), namedNode('_,b,_,d/b'), namedNode('_,b,_,d/b')),
            quad(namedNode('_,b,_,d/c'), namedNode('_,b,_,d/c'), namedNode('_,b,_,d/c'), namedNode('_,b,_,d/c')),
          ]);
        });
    });

    it('should run for QPF pattern 6', () => {
      return actor.run({ pattern: pattern6, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia' }})})
        .then(async (output) => {
          expect(await output.metadata()).toBe(metadataQpf);
          expect(await arrayifyStream(output.data)).toEqual([
            quad(namedNode('"a","b"@nl,"c"^^data,_/a'), namedNode('"a","b"@nl,"c"^^data,_/a'),
              namedNode('"a","b"@nl,"c"^^data,_/a'), namedNode('"a","b"@nl,"c"^^data,_/a')),
            quad(namedNode('"a","b"@nl,"c"^^data,_/b'), namedNode('"a","b"@nl,"c"^^data,_/b'),
              namedNode('"a","b"@nl,"c"^^data,_/b'), namedNode('"a","b"@nl,"c"^^data,_/b')),
            quad(namedNode('"a","b"@nl,"c"^^data,_/c'), namedNode('"a","b"@nl,"c"^^data,_/c'),
              namedNode('"a","b"@nl,"c"^^data,_/c'), namedNode('"a","b"@nl,"c"^^data,_/c')),
          ]);
        });
    });

    it('should run for QPF pattern 6 when only the data is called', () => {
      return actor.run({ pattern: pattern6, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia' }})})
        .then(async (output) => {
          expect(await arrayifyStream(output.data)).toEqual([
            quad(namedNode('"a","b"@nl,"c"^^data,_/a'), namedNode('"a","b"@nl,"c"^^data,_/a'),
              namedNode('"a","b"@nl,"c"^^data,_/a'), namedNode('"a","b"@nl,"c"^^data,_/a')),
            quad(namedNode('"a","b"@nl,"c"^^data,_/b'), namedNode('"a","b"@nl,"c"^^data,_/b'),
              namedNode('"a","b"@nl,"c"^^data,_/b'), namedNode('"a","b"@nl,"c"^^data,_/b')),
            quad(namedNode('"a","b"@nl,"c"^^data,_/c'), namedNode('"a","b"@nl,"c"^^data,_/c'),
              namedNode('"a","b"@nl,"c"^^data,_/c'), namedNode('"a","b"@nl,"c"^^data,_/c')),
          ]);
        });
    });

    it('should run for QPF pattern 6 when only the metadata is called', () => {
      return actor.run({ pattern: pattern6, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia' }})})
        .then(async (output) => {
          expect(await output.metadata()).toBe(metadataQpf);
        });
    });

    it('should run for lazily', () => {
      mediator.mediate = (action) => { throw new Error('This should not be called'); };
      return expect(actor.run(
        { pattern: pattern6, context: ActionContext(
            { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia' }})}))
        .resolves.toBeTruthy();
    });

    it('should run for TPF', () => {
      mediator.mediate = (action) => Promise.resolve({
        data: new ArrayIterator([ action.url + '/a', action.url + '/b', action.url + '/c' ]),
        firstPageMetadata: () => Promise.resolve(metadataTpf),
      });
      return actor.run({ pattern: pattern2, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia' }})})
        .then(async (output) => {
          expect(await output.metadata()).toBe(metadataTpf);
          expect(await arrayifyStream(output.data)).toEqual([ 'a,b,_/a', 'a,b,_/b', 'a,b,_/c' ]);
        });
    });

    it('should run multiple times for TPF', () => {
      mediator.mediate = (action) => Promise.resolve({
        data: new ArrayIterator([ action.url + '/a', action.url + '/b', action.url + '/c' ]),
        firstPageMetadata: () => Promise.resolve(metadataTpf),
      });
      return actor.run({ pattern: pattern2, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia' }})})
        .then(async (output) => {
          expect(await output.metadata()).toBe(metadataTpf);
          expect(await arrayifyStream(output.data)).toEqual([ 'a,b,_/a', 'a,b,_/b', 'a,b,_/c' ]);
          return actor.run(
            { pattern: pattern2, context: ActionContext(
                { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia' }})})
            .then(async (output2) => {
              expect(await output2.metadata()).toBe(metadataTpf);
              expect(await arrayifyStream(output2.data)).toEqual([ 'a,b,_/a', 'a,b,_/b', 'a,b,_/c' ]);
            });
        });
    });

    it('should cache when run for the same hypermedia twice', () => {
      const spy = jest.spyOn(<any> actor, 'createSource');
      return actor.run({ pattern: pattern1, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia' }})})
        .then(() => {
          actor.run({ pattern: pattern1, context: ActionContext(
              { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia' }})})
            .then(() => {
              expect(spy).toHaveBeenCalledTimes(1);
            });
        });
    });

    it('should not cache when run for different hypermedias', () => {
      const spy = jest.spyOn(<any> actor, 'createSource');
      return actor.run({ pattern: pattern1, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia1' }})})
        .then(() => {
          actor.run({ pattern: pattern1, context: ActionContext(
              { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hypermedia', value: 'hypermedia2' }})})
            .then(() => {
              expect(spy).toHaveBeenCalledTimes(2);
            });
        });
    });
  });
});
