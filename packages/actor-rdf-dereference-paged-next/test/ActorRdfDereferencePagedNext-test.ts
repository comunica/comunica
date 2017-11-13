import {ActorRdfDereferencePaged} from "@comunica/bus-rdf-dereference-paged";
import {Bus} from "@comunica/core";
import {Readable} from "stream";
import {ActorRdfDereferencePagedNext} from "../lib/ActorRdfDereferencePagedNext";

describe('ActorRdfDereferencePagedNext', () => {
  let bus;
  let mediator;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediator = {};
  });

  describe('The ActorRdfDereferencePagedNext module', () => {
    it('should be a function', () => {
      expect(ActorRdfDereferencePagedNext).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfDereferencePagedNext constructor', () => {
      expect(new (<any> ActorRdfDereferencePagedNext)({
        bus,
        mediatorMetadata: mediator,
        mediatorMetadataExtract: mediator,
        mediatorRdfDereference: mediator,
        name: 'actor',
      })).toBeInstanceOf(ActorRdfDereferencePagedNext);
      expect(new (<any> ActorRdfDereferencePagedNext)({
        bus,
        mediatorMetadata: mediator,
        mediatorMetadataExtract: mediator,
        mediatorRdfDereference: mediator,
        name: 'actor',
      })).toBeInstanceOf(ActorRdfDereferencePaged);
    });

    it('should not be able to create new ActorRdfDereferencePagedNext objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfDereferencePagedNext)(); }).toThrow();
    });

    it('should throw an error when constructed without a mediatorMetadata', () => {
      expect(() => { new (<any> ActorRdfDereferencePagedNext)({
        bus,
        mediatorMetadataExtract: mediator,
        mediatorRdfDereference: mediator,
        name: 'actor',
      }); }).toThrow();
    });

    it('should throw an error when constructed without a mediatorMetadataExtract', () => {
      expect(() => { new (<any> ActorRdfDereferencePagedNext)({
        bus,
        mediatorMetadata: mediator,
        mediatorRdfDereference: mediator,
        name: 'actor',
      }); }).toThrow();
    });

    it('should throw an error when constructed without a mediatorRdfDereference', () => {
      expect(() => { new (<any> ActorRdfDereferencePagedNext)({
        bus,
        mediatorMetadata: mediator,
        mediatorMetadataExtract: mediator,
        name: 'actor',
      }); }).toThrow();
    });

    it('should throw an error when constructed without arguments', () => {
      expect(() => { new (<any> ActorRdfDereferencePagedNext)(); }).toThrow();
    });
  });

  describe('An ActorRdfDereferencePagedNext instance', () => {
    let actor: ActorRdfDereferencePagedNext;
    let mediatorMetadata;
    let mediatorMetadataExtract;
    let mediatorRdfDereference;
    let stream0;
    let stream1;
    let stream2;

    beforeEach(() => {
      stream0 = stream([ '0a', '0b', '0c' ]);
      stream1 = stream([ '1a', '1b', '1c' ]);
      stream2 = stream([ '2a', '2b', '2c' ]);

      mediatorMetadata = { mediate: (action) => Promise.resolve(
        { data: action.quads.data, metadata: action.quads.metadata }) };
      mediatorMetadataExtract = { mediate: (action) => Promise.resolve({ metadata: action.metadata }) };
      mediatorRdfDereference = {
        mediate: (action) => {
          switch (action.url) {
          case 'http://example.org/':
            return Promise.resolve(
              { pageUrl: '0', quads: { data: stream0,
                metadata: { next: 'http://example.org/1' }}, triples: true});
          case 'http://example.org/1':
            return Promise.resolve(
              { pageUrl: '1', quads: { data: stream1,
                metadata: { next: 'http://example.org/2' }}, triples: true});
          case 'http://example.org/2':
            return Promise.resolve(
              { pageUrl: '2', quads: { data: stream2,
                metadata: { next: null }}, triples: true});
          default:
            return Promise.reject(true);
          }
        },
        mediateActor: (action) => {
          return action.url === 'http://example.org/' ? Promise.resolve(true) : Promise.reject(true);
        },
      };
      actor = new ActorRdfDereferencePagedNext({
        bus,
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
        .then((output) => {
          return new Promise((resolve, reject) => {
            expect(output.firstPageUrl).toEqual('0');
            expect(output.triples).toEqual(true);
            expect(output.firstPageMetadata).toEqual({ next: 'http://example.org/1' });

            const data: any = [];
            output.data.on('data', (d) => data.push(d));
            output.data.on('end', () => {
              expect(data).toEqual([
                '0a', '0b', '0c',
                '1a', '1b', '1c',
                '2a', '2b', '2c',
              ]);
              resolve();
            });
          });
        });
    });

    it('should run when metadata extraction is delayed', () => {
      const mediatorMetadataExtractSlow: any = { mediate: (action) => {
        return new Promise((resolve, reject) => {
          setImmediate(() => {
            mediatorMetadataExtract.mediate(action).then(resolve).catch(reject);
          });
        });
      }};
      actor = new ActorRdfDereferencePagedNext({
        bus,
        mediatorMetadata,
        mediatorMetadataExtract: mediatorMetadataExtractSlow,
        mediatorRdfDereference,
        name: 'actor',
      });
      return actor.run({ url: 'http://example.org/' })
        .then((output) => {
          return new Promise((resolve, reject) => {
            expect(output.firstPageUrl).toEqual('0');
            expect(output.triples).toEqual(true);
            expect(output.firstPageMetadata).toEqual({ next: 'http://example.org/1' });

            const data: any = [];
            output.data.on('data', (d) => data.push(d));
            output.data.on('end', () => {
              expect(data).toEqual([
                '0a', '0b', '0c',
                '1a', '1b', '1c',
                '2a', '2b', '2c',
              ]);
              resolve();
            });
          });
        });
    });

    it('should run and delegate errors originating from streams', () => {
      const error = new Error('some error');
      stream1._read = () => stream1.emit('error', error);
      return actor.run({ url: 'http://example.org/' })
        .then((output) => {
          return new Promise((resolve, reject) => {
            output.data.on('data', () => { return; });
            output.data.on('error', (e) => {
              expect(e).toEqual(error);
              resolve();
            });
            output.data.on('end', reject);
          });
        });
    });

    it('should not run on errors originating from a metadata mediator on page 0', () => {
      const error = new Error('some error');
      mediatorMetadata.mediate = () => Promise.reject(error);
      actor = new ActorRdfDereferencePagedNext({
        bus,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference,
        name: 'actor',
      });
      return expect(actor.run({ url: 'http://example.org/' })).rejects.toEqual(error);
    });

    it('should not run on errors originating from an extract mediator on page 0', () => {
      const error = new Error('some error');
      mediatorMetadataExtract.mediate = () => Promise.reject(error);
      actor = new ActorRdfDereferencePagedNext({
        bus,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference,
        name: 'actor',
      });
      return expect(actor.run({ url: 'http://example.org/' })).rejects.toEqual(error);
    });

    it('should not run on errors originating from a dereference mediator on page 0', () => {
      const error = new Error('some error');
      mediatorRdfDereference.mediate = () => Promise.reject(error);
      actor = new ActorRdfDereferencePagedNext({
        bus,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference,
        name: 'actor',
      });
      return expect(actor.run({ url: 'http://example.org/' })).rejects.toEqual(error);
    });

    it('should run and delegate errors originating from a metadata mediator after page 0', () => {
      const error = new Error('some error');
      const mediatorMetadataTemp: any = { mediate: (action) => {
        const ret = mediatorMetadata.mediate(action);
        mediatorMetadataTemp.mediate = () => Promise.reject(error);
        return ret;
      }};
      actor = new ActorRdfDereferencePagedNext({
        bus,
        mediatorMetadata: mediatorMetadataTemp,
        mediatorMetadataExtract,
        mediatorRdfDereference,
        name: 'actor',
      });
      return actor.run({ url: 'http://example.org/' })
        .then((output) => {
          return new Promise((resolve, reject) => {
            output.data.on('data', () => { return; });
            output.data.on('error', (e) => {
              expect(e).toEqual(error);
              resolve();
            });
            output.data.on('end', reject);
          });
        });
    });

    it('should run and delegate errors originating from an extract mediator after page 0', () => {
      const error = new Error('some error');
      const mediatorMetadataExtractTemp: any = { mediate: (action) => {
        const ret = mediatorMetadataExtract.mediate(action);
        mediatorMetadataExtractTemp.mediate = () => Promise.reject(error);
        return ret;
      }};
      actor = new ActorRdfDereferencePagedNext({
        bus,
        mediatorMetadata,
        mediatorMetadataExtract: mediatorMetadataExtractTemp,
        mediatorRdfDereference,
        name: 'actor',
      });
      return actor.run({ url: 'http://example.org/' })
        .then((output) => {
          return new Promise((resolve, reject) => {
            output.data.on('data', () => { return; });
            output.data.on('error', (e) => {
              expect(e).toEqual(error);
              resolve();
            });
            output.data.on('end', reject);
          });
        });
    });

    it('should run and delegate errors originating from a dereference mediator after page 0', () => {
      const error = new Error('some error');
      const mediatorRdfDereferenceTemp: any = { mediate: (action) => {
        const ret = mediatorRdfDereference.mediate(action);
        mediatorRdfDereferenceTemp.mediate = () => Promise.reject(error);
        return ret;
      }};
      actor = new ActorRdfDereferencePagedNext({
        bus,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference: mediatorRdfDereferenceTemp,
        name: 'actor',
      });
      return actor.run({ url: 'http://example.org/' })
        .then((output) => {
          return new Promise((resolve, reject) => {
            output.data.on('data', () => { return; });
            output.data.on('error', (e) => {
              expect(e).toEqual(error);
              resolve();
            });
            output.data.on('end', reject);
          });
        });
    });

  });
});

function stream(elements) {
  const readable = new Readable({ objectMode: true });
  readable._read = () => {
    readable.push(elements.shift());
    if (elements.length === 0) {
      readable.push(null);
    }
  };
  return readable;
}
