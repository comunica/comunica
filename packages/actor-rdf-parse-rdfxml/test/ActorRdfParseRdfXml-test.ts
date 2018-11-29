import {ActorRdfParseN3} from "@comunica/actor-rdf-parse-n3";
import {ActorRdfParseFixedMediaTypes} from "@comunica/bus-rdf-parse";
import {Bus} from "@comunica/core";
import "jest-rdf";
import {Readable} from "stream";
import {ActorRdfParseRdfXml} from "..";
const stringToStream = require('streamify-string');
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');

describe('ActorRdfParseRdfXml', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfParseRdfXml module', () => {
    it('should be a function', () => {
      expect(ActorRdfParseRdfXml).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParseRdfXml constructor', () => {
      expect(new (<any> ActorRdfParseRdfXml)({ name: 'actor', bus, mediaTypes: {} }))
          .toBeInstanceOf(ActorRdfParseFixedMediaTypes);
      expect(new (<any> ActorRdfParseRdfXml)({ name: 'actor', bus, mediaTypes: {} }))
          .toBeInstanceOf(ActorRdfParseFixedMediaTypes);
    });

    it('should not be able to create new ActorRdfParseRdfXml objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfParseRdfXml)(); }).toThrow();
    });

    it('should not throw an error when constructed with required arguments', () => {
      expect(() => { new ActorRdfParseRdfXml({ name: 'actor', bus, mediaTypes: {} }); }).toBeTruthy();
    });

    it('when constructed with optional mediaTypes should set the mediaTypes', () => {
      expect(new ActorRdfParseRdfXml({ name: 'actor', bus, mediaTypes: {} }).mediaTypes).toEqual({});
    });

    it('should not throw an error when constructed with optional priorityScale', () => {
      expect(() => { new ActorRdfParseN3({ name: 'actor', bus, mediaTypes: {}, priorityScale: 0.5 }); }).toBeTruthy();
    });

    it('when constructed with optional priorityScale should set the priorityScale', () => {
      expect(new ActorRdfParseRdfXml({ name: 'actor', bus, mediaTypes: {}, priorityScale: 0.5 }).priorityScale)
            .toEqual(0.5);
    });

    it('when constructed with optional priorityScale should scale the priorities', () => {
      expect(new ActorRdfParseRdfXml({ name: 'actor', bus, mediaTypes: { A: 2, B: 1, C: 0 }, priorityScale: 0.5 })
          .mediaTypes).toEqual({
            A: 1,
            B: 0.5,
            C: 0,
          });
    });

    it('should not throw an error when constructed with optional arguments', () => {
      expect(() => { new ActorRdfParseRdfXml({ name: 'actor', bus, mediaTypes: {}, priorityScale: 0.5 }); })
          .toBeTruthy();
    });
  });

  describe('An ActorRdfParseRdfXml instance', () => {
    let actor: ActorRdfParseRdfXml;
    let input: Readable;
    let inputError: Readable;

    beforeEach(() => {
      actor = new ActorRdfParseRdfXml({ bus, mediaTypes: {
        'application/rdf+xml': 1.0,
      }, name: 'actor' });
    });

    describe('for parsing', () => {
      beforeEach(() => {
        input = stringToStream(`
          <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/"
          xmlns:ex="http://example.org/stuff/1.0/">
            <rdf:Description rdf:about="http://www.w3.org/TR/rdf-syntax-grammar" dc:title="RDF1.1 XML Syntax">
                <ex:editor>
                  <rdf:Description ex:fullName="Dave Beckett">
                    <ex:homePage rdf:resource="http://purl.org/net/dajobe/" />
                  </rdf:Description>
                </ex:editor>
            </rdf:Description>
          </rdf:RDF>
      `);
        inputError = new Readable();
        inputError._read = () => inputError.emit('error', new Error());
      });

      it('should run on application/rdf+xml', () => {
        return actor.run({ handle: { input, baseIRI: '' }, handleMediaType: 'application/rdf+xml' })
                    .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toHaveLength(4));
      });

      it('should parse application/rdf+xml correctly', () => {
        // noinspection TsLint
        return actor.run({ handle: { input, baseIRI: '' }, handleMediaType: 'application/rdf+xml' })
            .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
              quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title',
                  '"RDF1.1 XML Syntax"'),
              quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://example.org/stuff/1.0/editor', "_:b4"),
              quad('_:b4', 'http://example.org/stuff/1.0/fullName', '"Dave Beckett"'),
              quad('_:b4', 'http://example.org/stuff/1.0/homePage', "http://purl.org/net/dajobe/")]));
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
          'application/rdf+xml': 1.0,
        }});
      });

      it('should run with scaled priorities 0.5', () => {
        actor = new ActorRdfParseRdfXml({ name: 'actor', bus, mediaTypes: { A: 2, B: 1, C: 0 }, priorityScale: 0.5 });
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          A: 1,
          B: 0.5,
          C: 0,
        }});
      });

      it('should run with scaled priorities 0', () => {
        actor = new ActorRdfParseRdfXml({ name: 'actor', bus, mediaTypes: { A: 2, B: 1, C: 0 }, priorityScale: 0 });
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          A: 0,
          B: 0,
          C: 0,
        }});
      });
    });
  });
});
