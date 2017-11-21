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
        quad('g1', '_py', 'o1', ''),
        quad('s2', 'px__', 'o2', ''),
        quad('s3', 'p3', 'o3', ''),
      ]);
    });

    it('should not test on a triple stream', () => {
      return expect(actor.test({ pageUrl: '', quads: input, triples: true })).resolves.toBeTruthy();
    });

    it('should test on a quad stream', () => {
      return expect(actor.test({ pageUrl: '', quads: input })).resolves.toBeTruthy();
    });

    it('should run', () => {
      return actor.run({ pageUrl: 's3', quads: input })
        .then(async (output) => {
          expect(await arrayifyStream(output.data)).toEqual([
            quad('s1', 'p1', 'o1', ''),
          ]);
          expect(await arrayifyStream(output.metadata)).toEqual([
            quad('g1', '_py', 'o1', ''),
            quad('s2', 'px__', 'o2', ''),
            quad('s3', 'p3', 'o3', ''),
          ]);
        });
    });
  });
});
