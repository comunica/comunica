import { Readable } from 'stream';
import { ActorRdfParseN3 } from '@comunica/actor-rdf-parse-n3';
import { ActorRdfParseFixedMediaTypes } from '@comunica/bus-rdf-parse';
import { ActionContext, Bus } from '@comunica/core';
import 'jest-rdf';
import type { IActionContext } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { ActorRdfParseRdfXml } from '..';

const quad = require('rdf-quad');
const stringToStream = require('streamify-string');

describe('ActorRdfParseRdfXml', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorRdfParseRdfXml module', () => {
    it('should be a function', () => {
      expect(ActorRdfParseRdfXml).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParseRdfXml constructor', () => {
      expect(new (<any> ActorRdfParseRdfXml)({ name: 'actor', bus, mediaTypePriorities: {}}))
        .toBeInstanceOf(ActorRdfParseFixedMediaTypes);
      expect(new (<any> ActorRdfParseRdfXml)({ name: 'actor', bus, mediaTypePriorities: {}}))
        .toBeInstanceOf(ActorRdfParseFixedMediaTypes);
    });

    it('should not be able to create new ActorRdfParseRdfXml objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfParseRdfXml)(); }).toThrow();
    });

    it('should not throw an error when constructed with required arguments', () => {
      expect(() => { new ActorRdfParseRdfXml(
        { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}},
      ); }).toBeTruthy();
    });

    it('when constructed with optional mediaTypePriorities should set the mediaTypePriorities', () => {
      expect(new ActorRdfParseRdfXml(
        { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}},
      ).mediaTypePriorities).toEqual({});
    });

    it('should not throw an error when constructed with optional priorityScale', () => {
      expect(() => { new ActorRdfParseN3(
        { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}, priorityScale: 0.5 },
      ); }).toBeTruthy();
    });

    it('when constructed with optional priorityScale should set the priorityScale', () => {
      expect(new ActorRdfParseRdfXml(
        { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}, priorityScale: 0.5 },
      ).priorityScale)
        .toEqual(0.5);
    });

    it('when constructed with optional priorityScale should scale the priorities', () => {
      expect(new ActorRdfParseRdfXml(
        { name: 'actor', bus, mediaTypePriorities: { A: 2, B: 1, C: 0 }, mediaTypeFormats: {}, priorityScale: 0.5 },
      )
        .mediaTypePriorities).toEqual({
        A: 1,
        B: 0.5,
        C: 0,
      });
    });

    it('should not throw an error when constructed with optional arguments', () => {
      expect(() => { new ActorRdfParseRdfXml(
        { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}, priorityScale: 0.5 },
      ); })
        .toBeTruthy();
    });
  });

  describe('An ActorRdfParseRdfXml instance', () => {
    let actor: ActorRdfParseRdfXml;
    let input: Readable;
    let inputError: Readable;

    beforeEach(() => {
      actor = new ActorRdfParseRdfXml({ bus,
        mediaTypePriorities: {
          'application/rdf+xml': 1,
        },
        mediaTypeFormats: {},
        name: 'actor' });
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
        inputError._read = () => inputError.emit('error', new Error('ParseRdfXml'));
      });

      it('should run on application/rdf+xml', () => {
        return actor.run({
          handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'application/rdf+xml',
          context,
        })
          .then(async(output: any) => expect(await arrayifyStream(output.handle.data)).toHaveLength(4));
      });

      it('should parse application/rdf+xml correctly', () => {
        return actor.run({
          handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'application/rdf+xml',
          context,
        })
          .then(async(output: any) => expect(await arrayifyStream(output.handle.data)).toEqualRdfQuadArray([
            quad('http://www.w3.org/TR/rdf-syntax-grammar',
              'http://purl.org/dc/elements/1.1/title',
              '"RDF1.1 XML Syntax"'),
            quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://example.org/stuff/1.0/editor', '_:b4'),
            quad('_:b4', 'http://example.org/stuff/1.0/fullName', '"Dave Beckett"'),
            quad('_:b4', 'http://example.org/stuff/1.0/homePage', 'http://purl.org/net/dajobe/') ]));
      });

      it('should forward stream errors', async() => {
        await expect(arrayifyStream((<any> (await actor.run({
          handle: { data: inputError, metadata: { baseIRI: '' }, context },
          handleMediaType: 'application/trig',
          context,
        })))
          .handle.data)).rejects.toBeTruthy();
      });
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true, context })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          'application/rdf+xml': 1,
        }});
      });

      it('should run with scaled priorities 0.5', () => {
        actor = new ActorRdfParseRdfXml(
          { name: 'actor', bus, mediaTypePriorities: { A: 2, B: 1, C: 0 }, mediaTypeFormats: {}, priorityScale: 0.5 },
        );
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          A: 1,
          B: 0.5,
          C: 0,
        }});
      });

      it('should run with scaled priorities 0', () => {
        actor = new ActorRdfParseRdfXml(
          { name: 'actor', bus, mediaTypePriorities: { A: 2, B: 1, C: 0 }, mediaTypeFormats: {}, priorityScale: 0 },
        );
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          A: 0,
          B: 0,
          C: 0,
        }});
      });
    });
  });
});
