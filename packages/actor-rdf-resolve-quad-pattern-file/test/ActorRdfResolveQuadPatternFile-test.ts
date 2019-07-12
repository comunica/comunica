import {ActorHttpInvalidateListenable} from "@comunica/bus-http-invalidate";
import {ActorRdfResolveQuadPattern} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Bus} from "@comunica/core";
import "jest-rdf";
import {Store as N3Store} from "n3";
import {ActorRdfResolveQuadPatternFile} from "../lib/ActorRdfResolveQuadPatternFile";
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');
const streamifyArray = require('streamify-array');

// tslint:disable:object-literal-sort-keys

describe('ActorRdfResolveQuadPatternFile', () => {
  let bus;
  let httpInvalidator;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    httpInvalidator = new ActorHttpInvalidateListenable({ name: 'httpInvalidator', bus });
  });

  describe('The ActorRdfResolveQuadPatternFile module', () => {
    it('should be a function', () => {
      expect(ActorRdfResolveQuadPatternFile).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfResolveQuadPatternFile constructor', () => {
      expect(new (<any> ActorRdfResolveQuadPatternFile)({ name: 'actor', bus, httpInvalidator }))
        .toBeInstanceOf(ActorRdfResolveQuadPatternFile);
      expect(new (<any> ActorRdfResolveQuadPatternFile)({ name: 'actor', bus, httpInvalidator }))
        .toBeInstanceOf(ActorRdfResolveQuadPattern);
    });

    it('should not be able to create new ActorRdfResolveQuadPatternFile objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfResolveQuadPatternFile)(); }).toThrow();
    });
  });

  describe('An ActorRdfResolveQuadPatternFile instance', () => {
    let actor: ActorRdfResolveQuadPatternFile;
    let mediatorRdfDereference;

    beforeEach(() => {
      mediatorRdfDereference = {
        mediate: (action) => action.url ? Promise.resolve({ quads: streamifyArray([
          quad('s1', 'p1', 'o1'),
          quad('s1', 'p1', 'o2'),
          quad('s1', 'p2', 'o1'),
          quad('s1', 'p2', 'o2'),
          quad('s2', 'p1', 'o1'),
          quad('s2', 'p1', 'o2'),
          quad('s2', 'p2', 'o1'),
          quad('s2', 'p2', 'o2'),
        ]) }) : Promise.reject('No test file'),
      };
      httpInvalidator = new ActorHttpInvalidateListenable({ name: 'httpInvalidator', bus });
      actor = new ActorRdfResolveQuadPatternFile(
        { name: 'actor', bus, mediatorRdfDereference, cacheSize: 10, httpInvalidator });
    });

    it('should test', () => {
      return expect(actor.test({ pattern: null, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'file', value: 'abc' }}) }))
        .resolves.toBeTruthy();
    });

    it('should not test without a context', () => {
      return expect(actor.test({ pattern: null, context: null })).rejects.toBeTruthy();
    });

    it('should not test without a file', () => {
      return expect(actor.test({ pattern: null, context: ActionContext({}) })).rejects.toBeTruthy();
    });

    it('should not test on an invalid file', () => {
      return expect(actor.test({ pattern: null, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'file', value: null  }}) }))
        .rejects.toBeTruthy();
    });

    it('should not test on no file', () => {
      return expect(actor.test({ pattern: null, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'entrypoint', value: null  }}) }))
        .rejects.toBeTruthy();
    });

    it('should not test on no sources', () => {
      return expect(actor.test({ pattern: null, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:sources': [] }) }))
        .rejects.toBeTruthy();
    });

    it('should not test on multiple sources', () => {
      return expect(actor.test(
        { pattern: null, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': [{ type: 'file', value: 'a' },
              { type: 'file', value: 'b' }] }) }))
        .rejects.toBeTruthy();
    });

    it('should allow file initialization with a valid file', () => {
      return expect(actor.initializeFile('myfile', null)).resolves.toBeTruthy();
    });

    it('should fail on file initialization with an invalid file', () => {
      return expect(actor.initializeFile(null, null)).rejects.toBeTruthy();
    });

    it('should allow a file quad source to be created for a context with a valid file', () => {
      return expect((<any> actor).getSource(ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source':
          { type: 'file', value: 'myFile'  }}))).resolves.toBeTruthy();
    });

    it('should fail on creating a file quad source for a context with an invalid file', () => {
      return expect((<any> actor).getSource(ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source':
          { type: 'file', value: null  }}))).rejects.toBeTruthy();
    });

    it('should create only a file quad source only once per file', () => {
      let doc1 = null;
      return (<any> actor).getSource(ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source':
          { type: 'file', value: 'myFile'  }}))
        .then((file: any) => {
          doc1 = file.store;
          return (<any> actor).getSource(ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source':
              { type: 'file', value: 'myFile'  }}));
        })
        .then((file: any) => {
          expect(file.store).toBe(doc1);
        });
    });

    it('should create different documents in file quad source for different files', () => {
      let doc1 = null;
      return (<any> actor).getSource(ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source':
          { type: 'file', value: 'myFile1'  }}))
        .then((file: any) => {
          doc1 = file.store;
          return (<any> actor).getSource(ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source':
              { type: 'file', value: 'myFile2'  }}));
        })
        .then((file: any) => {
          expect(file.store).not.toBe(doc1);
        });
    });

    it('should initialize file sources when passed to the constructor', async () => {
      const myActor = new ActorRdfResolveQuadPatternFile(
        { name: 'actor', bus, files: ['myFile'], mediatorRdfDereference, cacheSize: 10, httpInvalidator });
      await myActor.initialize();
      return expect(myActor.cache.get('myFile')).resolves.toBeInstanceOf(N3Store);
    });

    it('should run on ? ? ?', () => {
      const pattern = quad('?', '?', '?');
      return actor.run({ pattern, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'file', value: 'abc'  }}) })
        .then(async (output) => {
          expect(await output.metadata()).toEqual({ totalItems: 8 });
          expect(await arrayifyStream(output.data)).toEqualRdfQuadArray([
            quad('s1', 'p1', 'o1'),
            quad('s1', 'p1', 'o2'),
            quad('s1', 'p2', 'o1'),
            quad('s1', 'p2', 'o2'),
            quad('s2', 'p1', 'o1'),
            quad('s2', 'p1', 'o2'),
            quad('s2', 'p2', 'o1'),
            quad('s2', 'p2', 'o2'),
          ]);
        });
    });

    it('should run on s1 ? ?', () => {
      const pattern = quad('s1', '?', '?');
      return actor.run({ pattern, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'file', value: 'abc' }}) })
        .then(async (output) => {
          expect(await output.metadata()).toEqual({ totalItems: 4 });
          expect(await arrayifyStream(output.data)).toEqualRdfQuadArray([
            quad('s1', 'p1', 'o1'),
            quad('s1', 'p1', 'o2'),
            quad('s1', 'p2', 'o1'),
            quad('s1', 'p2', 'o2'),
          ]);
        });
    });

    it('should run on s3 ? ?', () => {
      const pattern = quad('s3', '?', '?');
      return actor.run({ pattern, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'file', value: 'abc' }}) })
        .then(async (output) => {
          expect(await output.metadata()).toEqual({ totalItems: 0 });
          expect(await arrayifyStream(output.data)).toEqualRdfQuadArray([]);
        });
    });

    it('should be initializable', () => {
      return expect(() => actor.initialize()).not.toThrow();
    });

    it('should be deinitializable', () => {
      return expect(() => actor.deinitialize()).not.toThrow();
    });

    it('should invalidate by URL', async () => {
      const myActor = new ActorRdfResolveQuadPatternFile(
        { name: 'actor', bus, files: ['myFile1', 'myFile2'], mediatorRdfDereference, cacheSize: 10, httpInvalidator });
      await myActor.initialize();
      expect(myActor.cache.has('myFile1')).toBeTruthy();
      expect(myActor.cache.has('myFile2')).toBeTruthy();
      await httpInvalidator.run({ url: 'myFile1' });
      expect(myActor.cache.has('myFile1')).toBeFalsy();
      expect(myActor.cache.has('myFile2')).toBeTruthy();
    });

    it('should invalidate by all URLs', async () => {
      const myActor = new ActorRdfResolveQuadPatternFile(
        { name: 'actor', bus, files: ['myFile1', 'myFile2'], mediatorRdfDereference, cacheSize: 10, httpInvalidator });
      await myActor.initialize();
      expect(myActor.cache.has('myFile1')).toBeTruthy();
      expect(myActor.cache.has('myFile2')).toBeTruthy();
      await httpInvalidator.run({});
      expect(myActor.cache.has('myFile1')).toBeFalsy();
      expect(myActor.cache.has('myFile2')).toBeFalsy();
    });
  });
});
