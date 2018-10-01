import {ActorRdfResolveQuadPattern} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Bus} from "@comunica/core";
import {ActorRdfResolveQuadPatternHdt} from "../lib/ActorRdfResolveQuadPatternHdt";
import {MockedHdtDocument} from "../mocks/MockedHdtDocument";
const quad = require('rdf-quad');
const arrayifyStream = require('arrayify-stream');

// tslint:disable:object-literal-sort-keys

describe('ActorRdfResolveQuadPatternHdt', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfResolveQuadPatternHdt module', () => {
    it('should be a function', () => {
      expect(ActorRdfResolveQuadPatternHdt).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfResolveQuadPatternHdt constructor', () => {
      expect(new (<any> ActorRdfResolveQuadPatternHdt)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveQuadPatternHdt);
      expect(new (<any> ActorRdfResolveQuadPatternHdt)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveQuadPattern);
    });

    it('should not be able to create new ActorRdfResolveQuadPatternHdt objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfResolveQuadPatternHdt)(); }).toThrow();
    });
  });

  describe('An ActorRdfResolveQuadPatternHdt instance', () => {
    let actor: ActorRdfResolveQuadPatternHdt;
    let hdtDocument: MockedHdtDocument;

    beforeEach(() => {
      actor = new ActorRdfResolveQuadPatternHdt({ name: 'actor', bus });
      hdtDocument = new MockedHdtDocument([
        t('s1', 'p1', 'o1'),
        t('s1', 'p1', 'o2'),
        t('s1', 'p2', 'o1'),
        t('s1', 'p2', 'o2'),
        t('s2', 'p1', 'o1'),
        t('s2', 'p1', 'o2'),
        t('s2', 'p2', 'o1'),
        t('s2', 'p2', 'o2'),
      ]);
      require('hdt').__setMockedDocument(hdtDocument);
    });

    it('should test', () => {
      return expect(actor.test({ pattern: null, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hdtFile', value: 'abc'  }}) }))
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
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hdtFile', value: null  }}) }))
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
        { pattern: null, context: ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
              [{ type: 'hdtFile', value: 'a' }, { type: 'hdtFile', value: 'b' }] }) }))
        .rejects.toBeTruthy();
    });

    it('should allow HDT initialization with a valid file', () => {
      return expect(actor.initializeHdt('myfile')).resolves.toBeTruthy();
    });

    it('should fail on HDT initialization with an invalid file', () => {
      return expect(actor.initializeHdt(null)).rejects.toBeTruthy();
    });

    it('should allow a HDT quad source to be created for a context with a valid file', () => {
      return expect((<any> actor).getSource(ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source':
          { type: 'hdtFile', value: 'myFile'  }})))
        .resolves.toBeTruthy();
    });

    it('should fail on creating a HDT quad source for a context with an invalid file', () => {
      return expect((<any> actor).getSource({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          { type: 'hdtFile', value: null  }})).rejects.toBeTruthy();
    });

    it('should create only a HDT quad source only once per file', () => {
      let doc1 = null;
      return (<any> actor).getSource(ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source':
          { type: 'hdtFile', value: 'myFile'  }}))
        .then((file: any) => {
          doc1 = file.hdtDocument;
          return (<any> actor).getSource(ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source':
              { type: 'hdtFile', value: 'myFile'  }}));
        })
        .then((file: any) => {
          expect(file.hdtDocument).toBe(doc1);
        });
    });

    it('should create different documents in HDT quad source for different files', () => {
      let doc1 = null;
      return (<any> actor).getSource(ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source':
          { type: 'hdtFile', value: 'myFile1' }}))
        .then((file: any) => {
          doc1 = file.hdtDocument;
          require('hdt').__setMockedDocument(new MockedHdtDocument([]));
          return (<any> actor).getSource(ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source':
              { type: 'hdtFile', value: 'myFile2' }}));
        })
        .then((file: any) => {
          expect(file.hdtDocument).not.toBe(doc1);
        });
    });

    it('should initialize HDT sources when passed to the constructor', async () => {
      const myActor = new ActorRdfResolveQuadPatternHdt({ name: 'actor', bus, hdtFiles: ['myFile'] });
      await myActor.initialize();
      return expect(myActor.hdtDocuments.myFile).resolves.toBeInstanceOf(MockedHdtDocument);
    });

    it('should run on ? ? ?', () => {
      const pattern = quad('?', '?', '?');
      return actor.run({ pattern, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hdtFile', value: 'abc'  }}) })
        .then(async (output) => {
          expect(await output.metadata()).toEqual({ totalItems: 8 });
          expect(await arrayifyStream(output.data)).toEqual([
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

    it('should run on ? ? ? without data', () => {
      const pattern = quad('?', '?', '?');
      return actor.run({ pattern, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hdtFile', value: 'abc'  }}) })
        .then(async (output) => {
          expect(await output.metadata()).toEqual({ totalItems: 8 });
        });
    });

    it('should run on s1 ? ?', () => {
      const pattern = quad('s1', '?', '?');
      return actor.run({ pattern, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hdtFile', value: 'abc'  }}) })
        .then(async (output) => {
          expect(await output.metadata()).toEqual({ totalItems: 4 });
          expect(await arrayifyStream(output.data)).toEqual([
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
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hdtFile', value: 'abc'  }}) })
        .then(async (output) => {
          expect(await output.metadata()).toEqual({ totalItems: 0 });
          expect(await arrayifyStream(output.data)).toEqual([]);
        });
    });

    it('should be closeable when no queries were running', () => {
      actor.close();
      return expect(actor.closed).toBe(true);
    });

    it('should be closeable when queries were running', () => {
      (<any> actor).queries++;
      actor.close();
      expect(actor.closed).toBe(false);
      (<any> actor).queries--;
      expect((<any> actor).shouldClose).toBe(true);
      const pattern = quad('s3', '?', '?');
      return actor.run({ pattern, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'hdtFile', value: 'abc'  }}) })
        .then(async (output) => {
          expect(await arrayifyStream(output.data)).toBeTruthy();
          expect((<any> actor).shouldClose).toBe(false);
          expect(actor.closed).toBe(true);
        });
    });

    it('should only be closeable once', () => {
      actor.close();
      return expect(() => actor.close()).toThrow();
    });

    it('should be initializable', () => {
      return expect(() => actor.initialize()).not.toThrow();
    });

    it('should be deinitializable', () => {
      return expect(() => actor.deinitialize()).not.toThrow();
    });

    it('should close on process.exit', () => {
      actor.deinitialize();
      process.emit('exit', 0);
      expect(actor.closed).toBe(true);
      actor.closed = false;
    });

    it('should close on process.SIGINT', () => {
      actor.deinitialize();
      process.emit(<any> 'SIGINT');
      expect(actor.closed).toBe(true);
      actor.closed = false;
    });
  });
});

function t(subject, predicate, object) {
  return { subject, predicate, object };
}
