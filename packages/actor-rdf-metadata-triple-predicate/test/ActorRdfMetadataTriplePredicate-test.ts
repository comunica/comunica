import {ActorRdfMetadata} from "@comunica/bus-rdf-metadata";
import {Bus} from "@comunica/core";
import * as RDF from "rdf-js";
import {Readable} from "stream";
import {ActorRdfMetadataTriplePredicate} from "../lib/ActorRdfMetadataTriplePredicate";
const stream = require('streamify-array');
const quad = require('rdf-quad');
const arrayifyStream = require('arrayify-stream');

describe('ActorRdfMetadataTriplePredicate', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfMetadataTriplePredicate module', () => {
    it('should be a function', () => {
      expect(ActorRdfMetadataTriplePredicate).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfMetadataTriplePredicate constructor', () => {
      expect(new (<any> ActorRdfMetadataTriplePredicate)({ name: 'actor', bus, predicateRegexes: [] }))
        .toBeInstanceOf(ActorRdfMetadataTriplePredicate);
      expect(new (<any> ActorRdfMetadataTriplePredicate)({ name: 'actor', bus, predicateRegexes: [] }))
        .toBeInstanceOf(ActorRdfMetadata);
    });

    it('should not be able to create new ActorRdfMetadataTriplePredicate objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfMetadataTriplePredicate)(); }).toThrow();
    });
  });

  describe('An ActorRdfMetadataTriplePredicate instance', () => {
    let actor: ActorRdfMetadataTriplePredicate;
    let input: Readable;

    beforeEach(() => {
      actor = new ActorRdfMetadataTriplePredicate({ bus, name: 'actor', predicateRegexes: [
        '^px.*',
        '.*py$',
      ] });
      input = stream([
        quad('s1', 'p1', 'o1', ''),
        quad('g1', '-py', 'o1', ''),
        quad('s2', 'px--', 'o2', ''),
        quad('s3', 'p3', 'o3', ''),
      ]);
    });

    it('should not test on a triple stream', () => {
      return expect(actor.test({ url: '', quads: input, triples: true })).resolves.toBeTruthy();
    });

    it('should test on a quad stream', () => {
      return expect(actor.test({ url: '', quads: input })).resolves.toBeTruthy();
    });

    it('should run', () => {
      return actor.run({ url: 's3', quads: input })
        .then(async (output) => {
          expect(await arrayifyStream(output.data)).toEqual([
            quad('s1', 'p1', 'o1', ''),
          ]);
          expect(await arrayifyStream(output.metadata)).toEqual([
            quad('g1', '-py', 'o1', ''),
            quad('s2', 'px--', 'o2', ''),
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
  });
});
