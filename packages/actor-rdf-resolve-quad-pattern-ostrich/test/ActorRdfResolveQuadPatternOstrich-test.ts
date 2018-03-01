import {ActorRdfResolveQuadPattern} from "@comunica/bus-rdf-resolve-quad-pattern";
import {Bus} from "@comunica/core";
import {ActorRdfResolveQuadPatternOstrich, VersionContext} from "../lib/ActorRdfResolveQuadPatternOstrich";
import {MockedOstrichDocument} from "../mocks/MockedOstrichDocument";
const quad = require('rdf-quad');
const arrayifyStream = require('arrayify-stream');

describe('ActorRdfResolveQuadPatternOstrich', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfResolveQuadPatternOstrich module', () => {
    it('should be a function', () => {
      expect(ActorRdfResolveQuadPatternOstrich).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfResolveQuadPatternOstrich constructor', () => {
      expect(new (<any> ActorRdfResolveQuadPatternOstrich)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveQuadPatternOstrich);
      expect(new (<any> ActorRdfResolveQuadPatternOstrich)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveQuadPattern);
    });

    it('should not be able to create new ActorRdfResolveQuadPatternOstrich objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfResolveQuadPatternOstrich)(); }).toThrow();
    });
  });

  describe('An ActorRdfResolveQuadPatternOstrich instance', () => {
    let actor: ActorRdfResolveQuadPatternOstrich;
    let ostrichDocument: MockedOstrichDocument;
    let version: VersionContext;
    let pattern;

    beforeEach(() => {
      actor = new ActorRdfResolveQuadPatternOstrich({ name: 'actor', bus });
      ostrichDocument = new MockedOstrichDocument({
        0: [
          t('s0', 'p1', 'o1'),
          t('s0', 'p1', 'o2'),
        ],
        1: [
          t('s1', 'p1', 'o1'),
          t('s1', 'p1', 'o2'),
        ],
        2: [
          t('s2', 'p1', 'o1'),
          t('s2', 'p1', 'o2'),
        ],
        3: [
          t('s2', 'p1', 'o1'),
          t('s2', 'p1', 'o2'),
        ],
      });
      require('ostrich-bindings').__setMockedDocument(ostrichDocument);
      version = { type: 'version-materialization', version: 0 };
      pattern = quad('?', '?', '?');
    });

    it('should test', () => {
      return expect(actor.test({ context: { sources: [{ type: 'ostrichFile', value: 'abc'  }], version },
        pattern })).resolves.toBeTruthy();
    });

    it('should not test on the non-default graph', () => {
      return expect(actor.test({ context: { sources: [{ type: 'ostrichFile', value: 'abc'  }], version },
        pattern: quad('?', '?', '?', 'G') })).rejects.toBeTruthy();
    });

    it('should not test without a context', () => {
      return expect(actor.test({ pattern, context: null })).rejects.toBeTruthy();
    });

    it('should not test without a version context', () => {
      return expect(actor.test({ context: { sources: [{ type: 'ostrichFile', value: 'abc'  }] },
        pattern: null })).rejects.toBeTruthy();
    });

    it('should not test with an invalid a version context', () => {
      return expect(actor.test({ context: { sources: [{ type: 'ostrichFile', value: 'abc'  }],
        version: { type: 'wrong' } }, pattern })).rejects.toBeTruthy();
    });

    it('should not test without a file', () => {
      return expect(actor.test({ pattern, context: {} })).rejects.toBeTruthy();
    });

    it('should not test on an invalid file', () => {
      return expect(actor.test({ pattern, context: { sources: [{ type: 'ostrichFile', value: null  }] } }))
        .rejects.toBeTruthy();
    });

    it('should not test on no file', () => {
      return expect(actor.test({ pattern, context: { sources: [{ type: 'entrypoint', value: null  }] } }))
        .rejects.toBeTruthy();
    });

    it('should not test on no sources', () => {
      return expect(actor.test({ pattern, context: { sources: [] } }))
        .rejects.toBeTruthy();
    });

    it('should not test on multiple sources', () => {
      return expect(actor.test(
        { context: { sources: [{ type: 'ostrichFile', value: 'a' },
          { type: 'ostrichFile', value: 'b' }] }, pattern: null })).rejects.toBeTruthy();
    });

    it('should allow OSTRICH initialization with a valid file', () => {
      return expect(actor.initializeOstrich('myfile')).resolves.toBeTruthy();
    });

    it('should fail on OSTRICH initialization with an invalid file', () => {
      return expect(actor.initializeOstrich(null)).rejects.toBeTruthy();
    });

    it('should allow a OSTRICH quad source to be created for a context with a valid file', () => {
      return expect((<any> actor).getSource({ sources: [{ type: 'ostrichFile', value: 'myFile'  }] }))
        .resolves.toBeTruthy();
    });

    it('should fail on creating a OSTRICH quad source for a context with an invalid file', () => {
      return expect((<any> actor).getSource({ sources: [{ type: 'ostrichFile', value: null  }] })).rejects.toBeTruthy();
    });

    it('should create only a OSTRICH quad source only once per file', () => {
      let doc1 = null;
      return (<any> actor).getSource({ sources: [{ type: 'ostrichFile', value: 'myFile'  }] }).then((file: any) => {
        doc1 = file.ostrichDocument;
        return (<any> actor).getSource({ sources: [{ type: 'ostrichFile', value: 'myFile'  }] });
      }).then((file: any) => {
        expect(file.ostrichDocument).toBe(doc1);
      });
    });

    it('should create different documents in OSTRICH quad source for different files', () => {
      let doc1 = null;
      return (<any> actor).getSource({ sources: [{ type: 'ostrichFile', value: 'myFile1'  }] }).then((file: any) => {
        doc1 = file.ostrichDocument;
        require('ostrich-bindings').__setMockedDocument(new MockedOstrichDocument([]));
        return (<any> actor).getSource({ sources: [{ type: 'ostrichFile', value: 'myFile2'  }] });
      }).then((file: any) => {
        expect(file.ostrichDocument).not.toBe(doc1);
      });
    });

    it('should initialize OSTRICH sources when passed to the constructor', async () => {
      const myActor = new ActorRdfResolveQuadPatternOstrich({ name: 'actor', bus, ostrichFiles: ['myFile'] });
      await myActor.initialize();
      return expect(myActor.ostrichDocuments.myFile).resolves.toBeInstanceOf(MockedOstrichDocument);
    });

    it('should run on ? ? ?', () => {
      return actor.run({ pattern, context: { sources: [{ type: 'ostrichFile', value: 'abc'  }], version } })
        .then(async (output) => {
          expect(await output.metadata()).toEqual({ totalItems: 2 });
          expect(await arrayifyStream(output.data)).toEqual([
            quad('s0', 'p1', 'o1'),
            quad('s0', 'p1', 'o2'),
          ]);
        });
    });

    it('should run on ? ? ? without data', () => {
      return actor.run({ pattern, context: { sources: [{ type: 'ostrichFile', value: 'abc'  }], version } })
        .then(async (output) => {
          expect(await output.metadata()).toEqual({ totalItems: 2 });
        });
    });

    it('should run on s0 ? ?', () => {
      const patternThis = quad('s0', '?', '?');
      return actor.run(
        { pattern: patternThis, context: { sources: [{ type: 'ostrichFile', value: 'abc'  }], version } })
        .then(async (output) => {
          expect(await output.metadata()).toEqual({ totalItems: 2 });
          expect(await arrayifyStream(output.data)).toEqual([
            quad('s0', 'p1', 'o1'),
            quad('s0', 'p1', 'o2'),
          ]);
        });
    });

    it('should run on s3 ? ?', () => {
      const patternThis = quad('s3', '?', '?');
      return actor.run(
        { pattern: patternThis, context: { sources: [{ type: 'ostrichFile', value: 'abc'  }], version } })
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
      const patternThis = quad('s3', '?', '?');
      return actor.run(
        { pattern: patternThis, context: { sources: [{ type: 'ostrichFile', value: 'abc'  }], version } })
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
      process.emit('SIGINT');
      expect(actor.closed).toBe(true);
      actor.closed = false;
    });
  });
});

function t(subject, predicate, object) {
  return { subject, predicate, object };
}
