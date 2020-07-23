import { ActorHttpInvalidateListenable } from '@comunica/bus-http-invalidate';
import { ActorRdfDereferencePaged } from '@comunica/bus-rdf-dereference-paged';
import { Bus } from '@comunica/core';
import { ClonedIterator } from 'asynciterator';
import { ActorRdfDereferencePagedNext } from '../lib/ActorRdfDereferencePagedNext';
const arrayifyStream = require('arrayify-stream');
const stream = require('streamify-array');

describe('ActorRdfDereferencePagedNext', () => {
  let bus: any;
  let mediator: any;
  let httpInvalidator: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediator = {};
    httpInvalidator = new ActorHttpInvalidateListenable({ name: 'httpInvalidator', bus });
  });

  describe('The ActorRdfDereferencePagedNext module', () => {
    it('should be a function', () => {
      expect(ActorRdfDereferencePagedNext).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfDereferencePagedNext constructor', () => {
      expect(new (<any> ActorRdfDereferencePagedNext)({
        bus,
        httpInvalidator,
        mediatorMetadata: mediator,
        mediatorMetadataExtract: mediator,
        mediatorRdfDereference: mediator,
        name: 'actor',
      })).toBeInstanceOf(ActorRdfDereferencePagedNext);
      expect(new (<any> ActorRdfDereferencePagedNext)({
        bus,
        httpInvalidator,
        mediatorMetadata: mediator,
        mediatorMetadataExtract: mediator,
        mediatorRdfDereference: mediator,
        name: 'actor',
      })).toBeInstanceOf(ActorRdfDereferencePaged);
    });

    it('should not be able to create new ActorRdfDereferencePagedNext objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfDereferencePagedNext)(); }).toThrow();
    });
  });

  describe('An ActorRdfDereferencePagedNext instance', () => {
    let actor: ActorRdfDereferencePagedNext;
    let actorCached: ActorRdfDereferencePagedNext;
    let mediatorMetadata: any;
    let mediatorMetadataExtract: any;
    let mediatorRdfDereference: any;
    let stream0: any;
    let stream1: any;
    let stream2: any;
    let cacheSize: any;

    beforeEach(() => {
      stream0 = stream([ '0a', '0b', '0c' ]);
      stream1 = stream([ '1a', '1b', '1c' ]);
      stream2 = stream([ '2a', '2b', '2c' ]);

      mediatorMetadata = { mediate: (action: any) => Promise.resolve(
        { data: action.quads.data, metadata: action.quads.metadata },
      ) };
      mediatorMetadataExtract = { mediate: (action: any) => Promise.resolve({ metadata: action.metadata }) };
      mediatorRdfDereference = {
        mediate(action: any) {
          switch (action.url) {
            case 'http://example.org/':
              return Promise.resolve(
                { url: '0', quads: { data: stream0, metadata: { next: 'http://example.org/1' }}, triples: true },
              );
            case 'http://example.org/1':
              return Promise.resolve(
                { url: '1', quads: { data: stream1, metadata: { next: 'http://example.org/2' }}, triples: true },
              );
            case 'http://example.org/2':
              return Promise.resolve(
                { url: '2', quads: { data: stream2, metadata: { next: null }}, triples: true },
              );
            default:
              return Promise.reject(new Error(`Invalid paged-next URL in tests: ${action.url}`));
          }
        },
        mediateActor(action: any) {
          return action.url === 'http://example.org/' ?
            Promise.resolve(true) :
            Promise.reject(new Error('Invalid paged-next URL in tests'));
        },
      };
      cacheSize = 0;
      httpInvalidator = new ActorHttpInvalidateListenable({ name: 'httpInvalidator', bus });
      actor = new ActorRdfDereferencePagedNext({
        bus,
        cacheSize,
        httpInvalidator,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference,
        name: 'actor',
      });
      actorCached = new ActorRdfDereferencePagedNext({
        bus,
        cacheSize: 100,
        httpInvalidator,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference,
        name: 'actor',
      });
    });

    it('should test if the dereference mediator can test', () => {
      return expect(actor.test({ url: 'http://example.org/' })).resolves.toBeTruthy();
    });

    it('should not test if the dereference mediator can test', () => {
      return expect(actor.test({ url: 'http://example2.org/' })).rejects.toBeTruthy();
    });

    it('should run', () => {
      return actor.run({ url: 'http://example.org/' })
        .then(async output => {
          expect(output.firstPageUrl).toEqual('0');
          expect(output.triples).toEqual(true);
          expect(await output.firstPageMetadata()).toEqual({ next: 'http://example.org/1' });
          expect(output.data).not.toBeInstanceOf(ClonedIterator);
          expect(await arrayifyStream(output.data)).toEqual([
            '0a', '0b', '0c',
            '1a', '1b', '1c',
            '2a', '2b', '2c',
          ]);
        });
    });

    it('should run when metadata extraction is delayed', () => {
      const mediatorMetadataExtractSlow: any = { mediate(action: any) {
        return new Promise((resolve, reject) => {
          setImmediate(() => {
            mediatorMetadataExtract.mediate(action).then(resolve).catch(reject);
          });
        });
      } };
      const currentActor = new ActorRdfDereferencePagedNext({
        bus,
        cacheSize,
        httpInvalidator,
        mediatorMetadata,
        mediatorMetadataExtract: mediatorMetadataExtractSlow,
        mediatorRdfDereference,
        name: 'actor',
      });
      return currentActor.run({ url: 'http://example.org/' })
        .then(async output => {
          expect(output.firstPageUrl).toEqual('0');
          expect(output.triples).toEqual(true);
          expect(await output.firstPageMetadata()).toEqual({ next: 'http://example.org/1' });
          expect(await arrayifyStream(output.data)).toEqual([
            '0a', '0b', '0c',
            '1a', '1b', '1c',
            '2a', '2b', '2c',
          ]);
        });
    });

    it('should run and delegate errors originating from streams', () => {
      const error = new Error('some error');
      stream1._read = () => stream1.emit('error', error);
      return actor.run({ url: 'http://example.org/' })
        .then(output => expect(arrayifyStream(output.data)).rejects.toEqual(error));
    });

    it('should not run on errors originating from a metadata mediator on page 0', () => {
      const error = new Error('some error');
      const currentMediatorMetadata: any = {
        mediate: () => Promise.reject(error),
      };
      const currentActor = new ActorRdfDereferencePagedNext({
        bus,
        cacheSize,
        httpInvalidator,
        mediatorMetadata: currentMediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference,
        name: 'actor',
      });
      return expect(currentActor.run({ url: 'http://example.org/' })).rejects.toEqual(error);
    });

    it('should run on errors originating from a metadata extract mediator on page 0 but should delegate errors ' +
      'to the metadata promise *and* stream', () => {
      const error = new Error('an error on page 0');
      const currentMediatorMetadataExtract: any = {
        mediate: () => Promise.reject(error),
      };
      const currentActor = new ActorRdfDereferencePagedNext({
        bus,
        cacheSize,
        httpInvalidator,
        mediatorMetadata,
        mediatorMetadataExtract: currentMediatorMetadataExtract,
        mediatorRdfDereference,
        name: 'actor',
      });
      return currentActor.run({ url: 'http://example.org/' })
        .then(async output => {
          await expect(output.firstPageMetadata()).rejects.toEqual(error);
          await expect(arrayifyStream(output.data)).rejects.toEqual(error);
        });
    });

    it('should not run on errors originating from a dereference mediator on page 0', () => {
      const error = new Error('some error on page 0');
      const currentMediatorRdfDereference: any = {
        mediate: () => Promise.reject(error),
      };
      const currentActor = new ActorRdfDereferencePagedNext({
        bus,
        cacheSize,
        httpInvalidator,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference: currentMediatorRdfDereference,
        name: 'actor',
      });
      return expect(currentActor.run({ url: 'http://example.org/' })).rejects.toEqual(error);
    });

    it('should run and delegate errors originating from a metadata mediator after page 0', () => {
      const error = new Error('some error after page 0');
      const mediatorMetadataTemp: any = { mediate(action: any) {
        const ret = mediatorMetadata.mediate(action);
        mediatorMetadataTemp.mediate = () => Promise.reject(error);
        return ret;
      } };
      const currentActor = new ActorRdfDereferencePagedNext({
        bus,
        cacheSize,
        httpInvalidator,
        mediatorMetadata: mediatorMetadataTemp,
        mediatorMetadataExtract,
        mediatorRdfDereference,
        name: 'actor',
      });
      return currentActor.run({ url: 'http://example.org/' })
        .then(output => expect(arrayifyStream(output.data)).rejects.toEqual(error));
    });

    it('should run and delegate errors originating from an extract mediator after page 0', () => {
      const error = new Error('some error');
      const mediatorMetadataExtractTemp: any = { mediate(action: any) {
        const ret = mediatorMetadataExtract.mediate(action);
        mediatorMetadataExtractTemp.mediate = () => Promise.reject(error);
        return ret;
      } };
      actor = new ActorRdfDereferencePagedNext({
        bus,
        cacheSize,
        httpInvalidator,
        mediatorMetadata,
        mediatorMetadataExtract: mediatorMetadataExtractTemp,
        mediatorRdfDereference,
        name: 'actor',
      });
      return actor.run({ url: 'http://example.org/' })
        .then(output => expect(arrayifyStream(output.data)).rejects.toEqual(error));
    });

    it('should run and delegate errors originating from a dereference mediator after page 0', () => {
      const error = new Error('some error');
      const mediatorRdfDereferenceTemp: any = { mediate(action: any) {
        const ret = mediatorRdfDereference.mediate(action);
        mediatorRdfDereferenceTemp.mediate = () => Promise.reject(error);
        return ret;
      } };
      actor = new ActorRdfDereferencePagedNext({
        bus,
        cacheSize,
        httpInvalidator,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference: mediatorRdfDereferenceTemp,
        name: 'actor',
      });
      return actor.run({ url: 'http://example.org/' })
        .then(output => expect(arrayifyStream(output.data)).rejects.toEqual(error));
    });

    it('should run with an enabled cache', () => {
      return actorCached.run({ url: 'http://example.org/' })
        .then(async output => {
          expect(output.firstPageUrl).toEqual('0');
          expect(output.triples).toEqual(true);
          expect(await output.firstPageMetadata()).toEqual({ next: 'http://example.org/1' });
          expect(output.data).toBeInstanceOf(ClonedIterator);
          expect(await arrayifyStream(output.data)).toEqual([
            '0a', '0b', '0c',
            '1a', '1b', '1c',
            '2a', '2b', '2c',
          ]);
        });
    });

    it('should run with an enabled cache and clone the output from the first call for the same URL', () => {
      return Promise.all([
        actorCached.run({ url: 'http://example.org/' }),
        actorCached.run({ url: 'http://example.org/' }),
      ]).then(async outputs => {
        for (const output of outputs) {
          expect(output.firstPageUrl).toEqual('0');
          expect(output.triples).toEqual(true);
          expect(await output.firstPageMetadata()).toEqual({ next: 'http://example.org/1' });
          expect(output.data).toBeInstanceOf(ClonedIterator);
          expect(await arrayifyStream(output.data)).toEqual([
            '0a', '0b', '0c',
            '1a', '1b', '1c',
            '2a', '2b', '2c',
          ]);
        }
        expect((<any> actorCached).cache.length).toEqual(1);
      });
    });

    it('should invalidate by URL', async() => {
      await actorCached.run({ url: 'http://example.org/1' });
      await actorCached.run({ url: 'http://example.org/2' });
      expect((<any> actorCached).cache.has('http://example.org/1')).toBeTruthy();
      expect((<any> actorCached).cache.has('http://example.org/2')).toBeTruthy();
      await httpInvalidator.run({ url: 'http://example.org/1' });
      expect((<any> actorCached).cache.has('http://example.org/1')).toBeFalsy();
      expect((<any> actorCached).cache.has('http://example.org/2')).toBeTruthy();
    });

    it('should invalidate by all URLs', async() => {
      await actorCached.run({ url: 'http://example.org/1' });
      await actorCached.run({ url: 'http://example.org/2' });
      expect((<any> actorCached).cache.has('http://example.org/1')).toBeTruthy();
      expect((<any> actorCached).cache.has('http://example.org/2')).toBeTruthy();
      await httpInvalidator.run({});
      expect((<any> actorCached).cache.has('http://example.org/1')).toBeFalsy();
      expect((<any> actorCached).cache.has('http://example.org/2')).toBeFalsy();
    });
  });
});
