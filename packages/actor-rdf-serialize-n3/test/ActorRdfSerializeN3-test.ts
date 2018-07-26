import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {Readable} from "stream";
import {ActorRdfSerializeN3} from "../lib/ActorRdfSerializeN3";

const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorRdfSerializeN3', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfSerializeN3 module', () => {
    it('should be a function', () => {
      expect(ActorRdfSerializeN3).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfSerializeN3 constructor', () => {
      expect(new (<any> ActorRdfSerializeN3)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfSerializeN3);
    });

    it('should not be able to create new ActorRdfSerializeN3 objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfSerializeN3)(); }).toThrow();
    });
  });

  describe('An ActorRdfSerializeN3 instance', () => {
    let actor: ActorRdfSerializeN3;
    let quads;
    let quadsError;

    beforeEach(() => {
      actor = new ActorRdfSerializeN3({ bus, mediaTypes: {
        'application/trig': 1.0,
        'text/turtle': 1.0,
      }, name: 'actor' });
    });

    describe('for serializing', () => {
      beforeEach(() => {
        quads = new ArrayIterator([
          quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
          quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
        ]);
        quadsError = new Readable();
        quadsError._read = () => quadsError.emit('error', new Error());
      });

      it('should test on application/trig', () => {
        return expect(actor.test({ handle: { quads }, handleMediaType: 'application/trig' })).resolves.toBeTruthy();
      });

      it('should test on text/turtle', () => {
        return expect(actor.test({ handle: { quads }, handleMediaType: 'text/turtle' })).resolves.toBeTruthy();
      });

      it('should not test on application/json', () => {
        return expect(actor.test({ handle: { quads }, handleMediaType: 'application/json' })).rejects.toBeTruthy();
      });

      it('should run', () => {
        return actor.run({ handle: { quads }, handleMediaType: 'text/turtle' })
          .then(async (output) => expect(await stringifyStream(output.handle.data)).toEqual(
`<http://example.org/a> <http://example.org/b> <http://example.org/c>;
    <http://example.org/d> <http://example.org/e>.
`));
      });

      it('should run and output triples for text/turtle', async () => {
        return expect((await actor.run({ handle: { quads }, handleMediaType: 'text/turtle' }))
          .handle.triples).toBeTruthy();
      });

      it('should run and output triples for application/n-triples', async () => {
        return expect((await actor.run({ handle: { quads }, handleMediaType: 'application/n-triples' }))
          .handle.triples).toBeTruthy();
      });

      it('should run and output triples for text/n3', async () => {
        return expect((await actor.run({ handle: { quads }, handleMediaType: 'text/n3' }))
          .handle.triples).toBeTruthy();
      });

      it('should run and output non-triples for application/trig', async () => {
        return expect((await actor.run({ handle: { quads }, handleMediaType: 'application/trig' }))
          .handle.triples).toBeFalsy();
      });

      it('should forward stream errors', async () => {
        return expect(stringifyStream((await actor.run(
          { handle: { quads: quadsError }, handleMediaType: 'application/trig' }))
          .handle.data)).rejects.toBeTruthy();
      });
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'application/trig': 1.0,
          'text/turtle': 1.0,
        }});
      });
    });
  });
});
