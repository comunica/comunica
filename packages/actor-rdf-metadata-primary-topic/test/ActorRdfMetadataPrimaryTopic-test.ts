import {ActorRdfMetadata} from "@comunica/bus-rdf-metadata";
import {Bus} from "@comunica/core";
import * as RDF from "rdf-js";
import {Readable} from "stream";
import {ActorRdfMetadataPrimaryTopic} from "../lib/ActorRdfMetadataPrimaryTopic";
const stream = require('streamify-array');
const quad = require('rdf-quad');
const arrayifyStream = require('arrayify-stream');

describe('ActorRdfMetadataPrimaryTopic', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
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
      expect(() => { (<any> ActorRdfMetadataPrimaryTopic)(); }).toThrow();
    });
  });

  describe('An ActorRdfMetadataPrimaryTopic instance', () => {
    let actor: ActorRdfMetadataPrimaryTopic;
    let input: Readable;

    beforeEach(() => {
      actor = new ActorRdfMetadataPrimaryTopic({ name: 'actor', bus });
      input = stream([
        quad('s1', 'p1', 'o1', ''),
        quad('g1', 'http://xmlns.com/foaf/0.1/primaryTopic', 'o1', 'g1'),
        quad('s2', 'p2', 'o2', 'g1'),
        quad('s3', 'p3', 'o3', ''),
      ]);
    });

    it('should not test on a triple stream', () => {
      return expect(actor.test({ pageUrl: '', quads: input, triples: true })).rejects.toBeTruthy();
    });

    it('should test on a quad stream', () => {
      return expect(actor.test({ pageUrl: '', quads: input })).resolves.toBeTruthy();
    });

    it('should run', () => {
      return actor.run({ pageUrl: '', quads: input })
        .then(async (output) => {
          const data: RDF.Quad[] = await arrayifyStream(output.data);
          const metadata: RDF.Quad[] = await arrayifyStream(output.metadata);
          expect(data).toEqual([
            quad('s1', 'p1', 'o1', ''),
            quad('s3', 'p3', 'o3', ''),
          ]);
          expect(metadata).toEqual([
            quad('g1', 'http://xmlns.com/foaf/0.1/primaryTopic', 'o1', 'g1'),
            quad('s2', 'p2', 'o2', 'g1'),
          ]);
        });
    });
  });
});
