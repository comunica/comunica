import {ActorRdfMetadata} from "@comunica/bus-rdf-metadata";
import {Bus} from "@comunica/core";
import * as RDF from "rdf-js";
import {Readable} from "stream";
import {ActorRdfMetadataAll} from "../lib/ActorRdfMetadataAll";
const stream = require('streamify-array');
const quad = require('rdf-quad');
const arrayifyStream = require('arrayify-stream');

describe('ActorRdfMetadataAll', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfMetadataAll module', () => {
    it('should be a function', () => {
      expect(ActorRdfMetadataAll).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfMetadataAll constructor', () => {
      expect(new (<any> ActorRdfMetadataAll)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfMetadataAll);
      expect(new (<any> ActorRdfMetadataAll)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfMetadata);
    });

    it('should not be able to create new ActorRdfMetadataAll objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfMetadataAll)(); }).toThrow();
    });
  });

  describe('An ActorRdfMetadataAll instance', () => {
    let actor: ActorRdfMetadataAll;
    let input: Readable;
    let inputDifferent: Readable;

    beforeEach(() => {
      actor = new ActorRdfMetadataAll({ name: 'actor', bus });
      input = stream([
        quad('s1', 'p1', 'o1', ''),
        quad('o1', 'http://rdfs.org/ns/void#subset', 'o1?param', 'g1'),
        quad('g1', 'http://xmlns.com/foaf/0.1/primaryTopic', 'o1', 'g1'),
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

    it('should test on a triple stream', () => {
      return expect(actor.test({ url: '', quads: input, triples: true })).resolves.toBeTruthy();
    });

    it('should test on a quad stream', () => {
      return expect(actor.test({ url: '', quads: input })).resolves.toBeTruthy();
    });

    it('should run', () => {
      return actor.run({ url: 'o1?param', quads: input })
        .then(async (output) => {
          const data: RDF.Quad[] = await arrayifyStream(output.data);
          const metadata: RDF.Quad[] = await arrayifyStream(output.metadata);
          expect(data).toEqual([
            quad('s1', 'p1', 'o1', ''),
            quad('o1', 'http://rdfs.org/ns/void#subset', 'o1?param', 'g1'),
            quad('g1', 'http://xmlns.com/foaf/0.1/primaryTopic', 'o1', 'g1'),
            quad('s2', 'p2', 'o2', 'g1'),
            quad('s3', 'p3', 'o3', ''),
          ]);
          expect(metadata).toEqual([
            quad('s1', 'p1', 'o1', ''),
            quad('o1', 'http://rdfs.org/ns/void#subset', 'o1?param', 'g1'),
            quad('g1', 'http://xmlns.com/foaf/0.1/primaryTopic', 'o1', 'g1'),
            quad('s2', 'p2', 'o2', 'g1'),
            quad('s3', 'p3', 'o3', ''),
          ]);
        });
    });

    it('should run and delegate errors', () => {
      return actor.run({ url: '', quads: input })
        .then((output) => {
          setImmediate(() => input.emit('error', new Error('RDF Meta Primary Topic error')));
          output.data.on('data', () => { return; });
          return Promise.all([new Promise((resolve, reject) => {
            output.data.on('error', resolve);
          }), new Promise((resolve, reject) => {
            output.metadata.on('error', resolve);
          })]).then((errors) => {
            return expect(errors).toHaveLength(2);
          });
        });
    });

    it('should run and not re-attach listeners after calling .read again', () => {
      return actor.run({ url: 'o1?param', quads: inputDifferent })
        .then(async (output) => {
          const data: RDF.Quad[] = await arrayifyStream(output.data);
          expect(data).toEqual([
            quad('s1', 'p1', 'o1', ''),
            quad('g1', 'http://xmlns.com/foaf/0.1/primaryTopic', 'o2', 'g1'),
            quad('o2', 'http://rdfs.org/ns/void#subset', 'o2?param', 'g1'),
            quad('s2', 'p2', 'o2', 'g1'),
            quad('s3', 'p3', 'o3', ''),
          ]);
          expect((<any> output.data)._read()).toBeFalsy();
        });
    });
  });
});
