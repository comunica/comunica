import { Readable } from 'stream';
import { ActorRdfParseN3 } from '@comunica/actor-rdf-parse-n3';
import { ActorRdfParseFixedMediaTypes } from '@comunica/bus-rdf-parse';
import { ActionContext, Bus } from '@comunica/core';
import 'jest-rdf';
import type { IActionContext } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { ActorRdfParseXmlRdfa } from '..';

const quad = require('rdf-quad');
const stringToStream = require('streamify-string');

describe('ActorRdfParseXmlRdfa', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorRdfParseXmlRdfa module', () => {
    it('should be a function', () => {
      expect(ActorRdfParseXmlRdfa).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParseXmlRdfa constructor', () => {
      expect(new (<any> ActorRdfParseXmlRdfa)({ name: 'actor', bus, mediaTypePriorities: {}}))
        .toBeInstanceOf(ActorRdfParseFixedMediaTypes);
      expect(new (<any> ActorRdfParseXmlRdfa)({ name: 'actor', bus, mediaTypePriorities: {}}))
        .toBeInstanceOf(ActorRdfParseFixedMediaTypes);
    });

    it('should not be able to create new ActorRdfParseXmlRdfa objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfParseXmlRdfa)(); }).toThrow();
    });

    it('should not throw an error when constructed with required arguments', () => {
      expect(() => { new ActorRdfParseXmlRdfa(
        { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}},
      ); }).toBeTruthy();
    });

    it('when constructed with optional mediaTypePriorities should set the mediaTypePriorities', () => {
      expect(new ActorRdfParseXmlRdfa(
        { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}},
      ).mediaTypePriorities).toEqual({});
    });

    it('should not throw an error when constructed with optional priorityScale', () => {
      expect(() => { new ActorRdfParseN3(
        { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}, priorityScale: 0.5 },
      ); }).toBeTruthy();
    });

    it('when constructed with optional priorityScale should set the priorityScale', () => {
      expect(new ActorRdfParseXmlRdfa(
        { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}, priorityScale: 0.5 },
      ).priorityScale)
        .toEqual(0.5);
    });

    it('when constructed with optional priorityScale should scale the priorities', () => {
      expect(new ActorRdfParseXmlRdfa(
        { name: 'actor', bus, mediaTypePriorities: { A: 2, B: 1, C: 0 }, mediaTypeFormats: {}, priorityScale: 0.5 },
      )
        .mediaTypePriorities).toEqual({
        A: 1,
        B: 0.5,
        C: 0,
      });
    });

    it('should not throw an error when constructed with optional arguments', () => {
      expect(() => { new ActorRdfParseXmlRdfa(
        { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}, priorityScale: 0.5 },
      ); })
        .toBeTruthy();
    });
  });

  describe('An ActorRdfParseXmlRdfa instance', () => {
    let actor: ActorRdfParseXmlRdfa;
    let input: Readable;
    let inputError: Readable;

    beforeEach(() => {
      actor = new ActorRdfParseXmlRdfa({ bus,
        mediaTypePriorities: {
          'application/xml': 1,
        },
        mediaTypeFormats: {},
        name: 'actor' });
    });

    describe('for parsing', () => {
      beforeEach(() => {
        input = stringToStream(`
<?xml version="1.0" encoding="UTF-8"?>
<svg width="12cm" height="4cm" viewBox="0 0 1200 400"
xmlns:dc="http://purl.org/dc/terms/"
xmlns="http://www.w3.org/2000/svg" version="1.2" baseProfile="tiny">
  <desc property="dc:description">A yellow rectangle with sharp corners.</desc>
  <!-- Show outline of canvas using 'rect' element -->
  <rect x="1" y="1" width="1198" height="398"
        fill="none" stroke="blue" stroke-width="2"/>
  <rect x="400" y="100" width="400" height="200"
        fill="yellow" stroke="navy" stroke-width="10"  />

</svg>
      `);
        inputError = new Readable();
        inputError._read = () => inputError.emit('error', new Error('ParseXmlRdfa'));
      });

      it('should run on application/xml', () => {
        return actor
          .run({
            handle: { data: input, metadata: { baseIRI: 'http://ex.org/' }, context },
            handleMediaType: 'application/xml',
            context,
          })
          .then(async(output: any) => expect(await arrayifyStream(output.handle.data)).toHaveLength(1));
      });

      it('should parse application/xml correctly', () => {
        return actor
          .run({
            handle: { data: input, metadata: { baseIRI: 'http://ex.org/' }, context },
            handleMediaType: 'application/xml',
            context,
          })
          .then(async(output: any) => expect(await arrayifyStream(output.handle.data)).toEqualRdfQuadArray([
            quad('http://ex.org/', 'http://purl.org/dc/terms/description', '"A yellow rectangle with sharp corners."'),
          ]));
      });

      it('should parse application/xml with a content language header', () => {
        const headers: any = { get: () => 'en-us' };
        return actor.run({
          handle: { data: input, metadata: { baseIRI: 'http://ex.org/' }, headers, context },
          handleMediaType: 'application/xml',
          context,
        })
          .then(async(output: any) => expect(await arrayifyStream(output.handle.data)).toEqualRdfQuadArray([
            quad('http://ex.org/',
              'http://purl.org/dc/terms/description',
              '"A yellow rectangle with sharp corners."@en-us'),
          ]));
      });

      it('should forwarinputd stream errors', async() => {
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
          'application/xml': 1,
        }});
      });

      it('should run with scaled priorities 0.5', () => {
        actor = new ActorRdfParseXmlRdfa(
          { name: 'actor', bus, mediaTypePriorities: { A: 2, B: 1, C: 0 }, mediaTypeFormats: {}, priorityScale: 0.5 },
        );
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          A: 1,
          B: 0.5,
          C: 0,
        }});
      });

      it('should run with scaled priorities 0', () => {
        actor = new ActorRdfParseXmlRdfa(
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
