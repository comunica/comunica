import {ActorRdfResolveQuadPattern} from "@comunica/bus-rdf-resolve-quad-pattern";
import {Bus} from "@comunica/core";
import {ActorRdfResolveQuadPatternFile} from "../lib/ActorRdfResolveQuadPatternFile";
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');
const streamifyArray = require('streamify-array');
const N3Store = require('n3').Store;

describe('ActorRdfResolveQuadPatternFile', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfResolveQuadPatternFile module', () => {
    it('should be a function', () => {
      expect(ActorRdfResolveQuadPatternFile).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfResolveQuadPatternFile constructor', () => {
      expect(new (<any> ActorRdfResolveQuadPatternFile)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveQuadPatternFile);
      expect(new (<any> ActorRdfResolveQuadPatternFile)({ name: 'actor', bus }))
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
      actor = new ActorRdfResolveQuadPatternFile({ name: 'actor', bus, mediatorRdfDereference });
    });

    it('should test', () => {
      return expect(actor.test({ pattern: null, context: { file: 'abc' } })).resolves.toBeTruthy();
    });

    it('should not test without a context', () => {
      return expect(actor.test({ pattern: null, context: null })).rejects.toBeTruthy();
    });

    it('should not test without a file', () => {
      return expect(actor.test({ pattern: null, context: {} })).rejects.toBeTruthy();
    });

    it('should not test on an invalid file', () => {
      return expect(actor.test({ pattern: null, context: { file: null } })).rejects.toBeTruthy();
    });

    it('should allow file initialization with a valid file', () => {
      return expect(actor.initializeFile('myfile')).resolves.toBeTruthy();
    });

    it('should fail on file initialization with an invalid file', () => {
      return expect(actor.initializeFile(null)).rejects.toBeTruthy();
    });

    it('should allow a file quad source to be created for a context with a valid file', () => {
      return expect((<any> actor).getSource({ file: 'myFile' })).resolves.toBeTruthy();
    });

    it('should fail on creating a file quad source for a context with an invalid file', () => {
      return expect((<any> actor).getSource({ file: null })).rejects.toBeTruthy();
    });

    it('should create only a file quad source only once per file', () => {
      let doc1 = null;
      return (<any> actor).getSource({ file: 'myFile' }).then((file: any) => {
        doc1 = file.store;
        return (<any> actor).getSource({ file: 'myFile' });
      }).then((file: any) => {
        expect(file.store).toBe(doc1);
      });
    });

    it('should create different documents in file quad source for different files', () => {
      let doc1 = null;
      return (<any> actor).getSource({ file: 'myFile1' }).then((file: any) => {
        doc1 = file.store;
        return (<any> actor).getSource({ file: 'myFile2' });
      }).then((file: any) => {
        expect(file.store).not.toBe(doc1);
      });
    });

    it('should initialize file sources when passed to the constructor', async () => {
      const myActor = new ActorRdfResolveQuadPatternFile(
        { name: 'actor', bus, files: ['myFile'], mediatorRdfDereference });
      await myActor.initialize();
      return expect(myActor.stores.myFile).resolves.toBeInstanceOf(N3Store);
    });

    it('should run on ? ? ?', () => {
      const pattern = quad('?', '?', '?');
      return actor.run({ pattern, context: { file: 'abc' } }).then(async (output) => {
        expect(await output.metadata).toEqual({ totalItems: 8 });
        expect(await arrayifyStream(output.data)).toEqual([
          quad('s1', 'p1', 'o2'),
          quad('s1', 'p1', 'o1'),
          quad('s1', 'p2', 'o2'),
          quad('s1', 'p2', 'o1'),
          quad('s2', 'p1', 'o2'),
          quad('s2', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
          quad('s2', 'p2', 'o1'),
        ]);
      });
    });

    it('should run on s1 ? ?', () => {
      const pattern = quad('s1', '?', '?');
      return actor.run({ pattern, context: { file: 'abc' } }).then(async (output) => {
        expect(await output.metadata).toEqual({ totalItems: 4 });
        expect(await arrayifyStream(output.data)).toEqual([
          quad('s1', 'p1', 'o2'),
          quad('s1', 'p1', 'o1'),
          quad('s1', 'p2', 'o2'),
          quad('s1', 'p2', 'o1'),
        ]);
      });
    });

    it('should run on s3 ? ?', () => {
      const pattern = quad('s3', '?', '?');
      return actor.run({ pattern, context: { file: 'abc' } }).then(async (output) => {
        expect(await output.metadata).toEqual({ totalItems: 0 });
        expect(await arrayifyStream(output.data)).toEqual([]);
      });
    });

    it('should be initializable', () => {
      return expect(() => actor.initialize()).not.toThrow();
    });

    it('should be deinitializable', () => {
      return expect(() => actor.deinitialize()).not.toThrow();
    });
  });
});
