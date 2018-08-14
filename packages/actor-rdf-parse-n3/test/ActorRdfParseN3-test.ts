import {ActorRdfParseFixedMediaTypes} from "@comunica/bus-rdf-parse";
import {Bus} from "@comunica/core";
import {Readable} from "stream";
import {ActorRdfParseN3} from "../lib/ActorRdfParseN3";
const stringToStream = require('streamify-string');
const arrayifyStream = require('arrayify-stream');

describe('ActorRdfParseN3', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfParseN3 module', () => {
    it('should be a function', () => {
      expect(ActorRdfParseN3).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParseN3 constructor', () => {
      expect(new (<any> ActorRdfParseN3)({ name: 'actor', bus, mediaTypes: {} }))
        .toBeInstanceOf(ActorRdfParseN3);
      expect(new (<any> ActorRdfParseN3)({ name: 'actor', bus, mediaTypes: {} }))
        .toBeInstanceOf(ActorRdfParseFixedMediaTypes);
    });

    it('should not be able to create new ActorRdfParseN3 objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfParseN3)(); }).toThrow();
    });

    it('should not throw an error when constructed with required arguments', () => {
      expect(() => { new ActorRdfParseN3({ name: 'actor', bus, mediaTypes: {} }); }).toBeTruthy();
    });

    it('when constructed with optional mediaTypes should set the mediaTypes', () => {
      expect(new ActorRdfParseN3({ name: 'actor', bus, mediaTypes: {} }).mediaTypes).toEqual({});
    });

    it('should not throw an error when constructed with optional priorityScale', () => {
      expect(() => { new ActorRdfParseN3({ name: 'actor', bus, mediaTypes: {}, priorityScale: 0.5 }); }).toBeTruthy();
    });

    it('when constructed with optional priorityScale should set the priorityScale', () => {
      expect(new ActorRdfParseN3({ name: 'actor', bus, mediaTypes: {}, priorityScale: 0.5 }).priorityScale)
        .toEqual(0.5);
    });

    it('when constructed with optional priorityScale should scale the priorities', () => {
      expect(new ActorRdfParseN3({ name: 'actor', bus, mediaTypes: { A: 2, B: 1, C: 0 }, priorityScale: 0.5 })
        .mediaTypes).toEqual({
          A: 1,
          B: 0.5,
          C: 0,
        });
    });

    it('should not throw an error when constructed with optional arguments', () => {
      expect(() => { new ActorRdfParseN3({ name: 'actor', bus, mediaTypes: {}, priorityScale: 0.5 }); }).toBeTruthy();
    });
  });

  describe('An ActorRdfParseN3 instance', () => {
    let actor: ActorRdfParseN3;
    let input: Readable;
    let inputError: Readable;

    beforeEach(() => {
      actor = new ActorRdfParseN3({ bus, mediaTypes: {
        'application/trig': 1.0,
        'application/n-quads': 0.7, // tslint:disable-line:object-literal-sort-keys // We want to sort by preference
        'text/turtle': 0.6,
        'application/n-triples': 0.3,
        'text/n3': 0.2,
      }, name: 'actor' });
    });

    describe('for parsing', () => {
      beforeEach(() => {
        input = stringToStream(`
          <a> <b> <c>.
          <d> <e> <f> <g>.
      `);
        inputError = new Readable();
        inputError._read = () => inputError.emit('error', new Error());
      });

      it('should test on TriG', () => {
        return expect(actor.test({ handle: { input, baseIRI: '' }, handleMediaType: 'application/trig' }))
          .resolves.toBeTruthy();
      });

      it('should test on N-Quads', () => {
        return expect(actor.test({ handle: { input, baseIRI: '' }, handleMediaType: 'application/n-quads'}))
          .resolves.toBeTruthy();
      });

      it('should test on Turtle', () => {
        return expect(actor.test({ handle: { input, baseIRI: '' }, handleMediaType: 'text/turtle'}))
          .resolves.toBeTruthy();
      });

      it('should test on N-Triples', () => {
        return expect(actor.test({ handle: { input, baseIRI: '' }, handleMediaType: 'application/n-triples'}))
          .resolves.toBeTruthy();
      });

      it('should not test on JSON-LD', () => {
        return expect(actor.test({ handle: { input, baseIRI: '' }, handleMediaType: 'application/ld+json'}))
          .rejects.toBeTruthy();
      });

      it('should run on text/turtle', () => {
        return actor.run({ handle: { input, baseIRI: '' }, handleMediaType: 'text/turtle' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toHaveLength(2));
      });

      it('should run on application/trig', () => {
        return actor.run({ handle: { input, baseIRI: '' }, handleMediaType: 'application/trig' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toHaveLength(2));
      });

      it('should forward stream errors', async () => {
        return expect(arrayifyStream((await actor.run(
          { handle: { input: inputError, baseIRI: '' }, handleMediaType: 'application/trig' }))
          .handle.quads)).rejects.toBeTruthy();
      });
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'application/trig': 1.0,
          'application/n-quads': 0.7, // tslint:disable-line:object-literal-sort-keys // We want to sort by preference
          'text/turtle': 0.6,
          'application/n-triples': 0.3,
          'text/n3': 0.2,
        }});
      });

      it('should run with scaled priorities 0.5', () => {
        actor = new ActorRdfParseN3({ name: 'actor', bus, mediaTypes: { A: 2, B: 1, C: 0 }, priorityScale: 0.5 });
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          A: 1,
          B: 0.5,
          C: 0,
        }});
      });

      it('should run with scaled priorities 0', () => {
        actor = new ActorRdfParseN3({ name: 'actor', bus, mediaTypes: { A: 2, B: 1, C: 0 }, priorityScale: 0 });
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          A: 0,
          B: 0,
          C: 0,
        }});
      });
    });
  });
});
