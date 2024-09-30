import type { Readable } from 'node:stream';
import { ActorRdfMetadata } from '@comunica/bus-rdf-metadata';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ActorRdfMetadataPrimaryTopic } from '../lib/ActorRdfMetadataPrimaryTopic';
import '@comunica/utils-jest';

const quad = require('rdf-quad');
const stream = require('streamify-array');

describe('ActorRdfMetadataPrimaryTopic', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorRdfMetadataPrimaryTopic module', () => {
    it('should be a function', () => {
      expect(ActorRdfMetadataPrimaryTopic).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfMetadataPrimaryTopic constructor', () => {
      expect(new (<any> ActorRdfMetadataPrimaryTopic)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfMetadataPrimaryTopic);
      expect(new (<any> ActorRdfMetadataPrimaryTopic)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfMetadata);
    });

    it('should not be able to create new ActorRdfMetadataPrimaryTopic objects without \'new\'', () => {
      expect(() => {
        (<any> ActorRdfMetadataPrimaryTopic)();
      }).toThrow(`Class constructor ActorRdfMetadataPrimaryTopic cannot be invoked without 'new'`);
    });
  });

  describe('An ActorRdfMetadataPrimaryTopic instance', () => {
    let actor: ActorRdfMetadataPrimaryTopic;
    let input: Readable;
    let inputOOO: Readable;
    let inputNone: Readable;
    let inputDifferent: Readable;

    beforeEach(() => {
      actor = new ActorRdfMetadataPrimaryTopic(
        { name: 'actor', bus, metadataToData: false, dataToMetadataOnInvalidMetadataGraph: false },
      );
      input = stream([
        quad('s1', 'p1', 'o1', ''),
        quad('o1', 'http://rdfs.org/ns/void#subset', 'o1?param', 'g1'),
        quad('g1', 'http://xmlns.com/foaf/0.1/primaryTopic', 'o1', 'g1'),
        quad('s2', 'p2', 'o2', 'g1'),
        quad('s3', 'p3', 'o3', ''),
      ]);
      inputOOO = stream([
        quad('s1', 'p1', 'o1', ''),
        quad('s2', 'p2', 'o2', 'g1'),
        quad('s3', 'p3', 'o3', ''),
        quad('g1', 'http://xmlns.com/foaf/0.1/primaryTopic', 'o1', 'g1'),
        quad('o1', 'http://rdfs.org/ns/void#subset', 'o1?param', 'g1'),
      ]);
      inputNone = stream([
        quad('s1', 'p1', 'o1', ''),
        quad('s2', 'p2', 'o2', 'g1'),
        quad('s3', 'p3', 'o3', ''),
      ]);
      inputDifferent = stream([
        quad('s1', 'p1', 'o1', ''),
        quad('g1', 'http://xmlns.com/foaf/0.1/primaryTopic', 'o2', 'g1'),
        quad('o2', 'http://rdfs.org/ns/void#subset', 'o2?param', 'g1'),
        quad('s2', 'p2', 'o2', 'g1'),
        quad('s3', 'p3', 'o3', ''),
      ]);
    });

    it('should not test on a triple stream', async() => {
      await expect(actor.test({ context, url: '', quads: input, triples: true }))
        .resolves.toFailTest(`This actor only supports non-triple quad streams.`);
    });

    it('should test on a quad stream', async() => {
      await expect(actor.test({ context, url: '', quads: input })).resolves.toPassTestVoid();
    });

    it('should run', async() => {
      await actor.run({ context, url: 'o1?param', quads: input })
        .then(async(output) => {
          const data: RDF.Quad[] = await arrayifyStream(output.data);
          const metadata: RDF.Quad[] = await arrayifyStream(output.metadata);
          expect(data).toEqual([
            quad('s1', 'p1', 'o1', ''),
            quad('s3', 'p3', 'o3', ''),
          ]);
          expect(metadata).toEqual([
            quad('o1', 'http://rdfs.org/ns/void#subset', 'o1?param', 'g1'),
            quad('g1', 'http://xmlns.com/foaf/0.1/primaryTopic', 'o1', 'g1'),
            quad('s2', 'p2', 'o2', 'g1'),
          ]);
        });
    });

    it('should run with metadataToData true', async() => {
      const thisActor = new ActorRdfMetadataPrimaryTopic(
        { name: 'actor', bus, metadataToData: true, dataToMetadataOnInvalidMetadataGraph: false },
      );
      await thisActor.run({ context, url: 'o1?param', quads: input })
        .then(async(output) => {
          const data: RDF.Quad[] = await arrayifyStream(output.data);
          const metadata: RDF.Quad[] = await arrayifyStream(output.metadata);
          expect(data).toEqual([
            quad('s1', 'p1', 'o1', ''),
            quad('s3', 'p3', 'o3', ''),
            quad('o1', 'http://rdfs.org/ns/void#subset', 'o1?param', 'g1'),
            quad('g1', 'http://xmlns.com/foaf/0.1/primaryTopic', 'o1', 'g1'),
            quad('s2', 'p2', 'o2', 'g1'),
          ]);
          expect(metadata).toEqual([
            quad('o1', 'http://rdfs.org/ns/void#subset', 'o1?param', 'g1'),
            quad('g1', 'http://xmlns.com/foaf/0.1/primaryTopic', 'o1', 'g1'),
            quad('s2', 'p2', 'o2', 'g1'),
          ]);
        });
    });

    it('should run when the primaryTopic triple comes after the graph', async() => {
      await actor.run({ context, url: 'o1?param', quads: inputOOO })
        .then(async(output) => {
          const data: RDF.Quad[] = await arrayifyStream(output.data);
          const metadata: RDF.Quad[] = await arrayifyStream(output.metadata);
          expect(data).toEqual([
            quad('s1', 'p1', 'o1', ''),
            quad('s3', 'p3', 'o3', ''),
          ]);
          expect(metadata).toEqual([
            quad('s2', 'p2', 'o2', 'g1'),
            quad('g1', 'http://xmlns.com/foaf/0.1/primaryTopic', 'o1', 'g1'),
            quad('o1', 'http://rdfs.org/ns/void#subset', 'o1?param', 'g1'),
          ]);
        });
    });

    it('should run and make everything data without primaryTopic triple', async() => {
      await actor.run({ context, url: 'o1?param', quads: inputNone })
        .then(async(output) => {
          const data: RDF.Quad[] = await arrayifyStream(output.data);
          const metadata: RDF.Quad[] = await arrayifyStream(output.metadata);
          expect(data).toEqual([
            quad('s1', 'p1', 'o1', ''),
            quad('s3', 'p3', 'o3', ''),
            quad('s2', 'p2', 'o2', 'g1'),
          ]);
          expect(metadata).toEqual([]);
        });
    });

    it('should run and make everything data with a primaryTopic triple that does not match the url', async() => {
      await actor.run({ context, url: 'o1?param', quads: inputDifferent })
        .then(async(output) => {
          const data: RDF.Quad[] = await arrayifyStream(output.data);
          const metadata: RDF.Quad[] = await arrayifyStream(output.metadata);
          expect(data).toEqual([
            quad('s1', 'p1', 'o1', ''),
            quad('s3', 'p3', 'o3', ''),
            quad('g1', 'http://xmlns.com/foaf/0.1/primaryTopic', 'o2', 'g1'),
            quad('o2', 'http://rdfs.org/ns/void#subset', 'o2?param', 'g1'),
            quad('s2', 'p2', 'o2', 'g1'),
          ]);
          expect(metadata).toEqual([]);
        });
    });

    it('should run and make everything data and metadata with a primaryTopic triple that does not ' +
      'match the url with dataToMetadataOnInvalidMetadataGraph true', async() => {
      const thisActor = new ActorRdfMetadataPrimaryTopic(
        { name: 'actor', bus, metadataToData: false, dataToMetadataOnInvalidMetadataGraph: true },
      );
      await thisActor.run({ context, url: 'o1?param', quads: inputDifferent })
        .then(async(output) => {
          const data: RDF.Quad[] = await arrayifyStream(output.data);
          const metadata: RDF.Quad[] = await arrayifyStream(output.metadata);
          expect(data).toEqual([
            quad('s1', 'p1', 'o1', ''),
            quad('s3', 'p3', 'o3', ''),
            quad('g1', 'http://xmlns.com/foaf/0.1/primaryTopic', 'o2', 'g1'),
            quad('o2', 'http://rdfs.org/ns/void#subset', 'o2?param', 'g1'),
            quad('s2', 'p2', 'o2', 'g1'),
          ]);
          expect(metadata).toEqual([
            quad('s1', 'p1', 'o1', ''),
            quad('s3', 'p3', 'o3', ''),
            quad('g1', 'http://xmlns.com/foaf/0.1/primaryTopic', 'o2', 'g1'),
            quad('o2', 'http://rdfs.org/ns/void#subset', 'o2?param', 'g1'),
            quad('s2', 'p2', 'o2', 'g1'),
          ]);
        });
    });

    it('should run and delegate errors', async() => {
      await actor.run({ context, url: '', quads: input })
        .then((output) => {
          setImmediate(() => input.emit('error', new Error('RDF Meta Primary Topic error')));
          output.data.on('data', () => {
            // Do nothing
          });
          return Promise.all([ new Promise((resolve) => {
            output.data.on('error', resolve);
          }), new Promise((resolve) => {
            output.metadata.on('error', resolve);
          }) ]).then((errors) => {
            expect(errors).toHaveLength(2);
          });
        });
    });

    it('should run and not re-attach listeners after calling .read again', async() => {
      await actor.run({ context, url: 'o1?param', quads: inputDifferent })
        .then(async(output) => {
          const data: RDF.Quad[] = await arrayifyStream(output.data);
          expect(data).toEqual([
            quad('s1', 'p1', 'o1', ''),
            quad('s3', 'p3', 'o3', ''),
            quad('g1', 'http://xmlns.com/foaf/0.1/primaryTopic', 'o2', 'g1'),
            quad('o2', 'http://rdfs.org/ns/void#subset', 'o2?param', 'g1'),
            quad('s2', 'p2', 'o2', 'g1'),
          ]);
          expect((<any> output.data)._read()).toBeFalsy();
        });
    });
  });
});
