import {ActorRdfDereference} from "@comunica/bus-rdf-dereference";
import {Bus} from "@comunica/core";
import * as fs from 'fs';
import * as path from 'path';
import {ActorRdfDereferenceFile} from "../lib/ActorRdfDereferenceFile";

const arrayifyStream = require('arrayify-stream');

describe('ActorRdfDereferenceFile', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfDereferenceFile module', () => {
    it('should be a function', () => {
      expect(ActorRdfDereferenceFile).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfDereferenceFile constructor', () => {
      expect(new (<any> ActorRdfDereferenceFile)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfDereferenceFile);
      expect(new (<any> ActorRdfDereferenceFile)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfDereference);
    });

    it('should not be able to create new ActorRdfDereferenceFile objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfDereferenceFile)(); }).toThrow();
    });
  });

  describe('An ActorRdfDereferenceFile instance', () => {
    let actor: ActorRdfDereferenceFile;
    let mediatorRdfParse;

    beforeEach(() => {
      mediatorRdfParse = {
        mediate: async (input) => {
          const data = await arrayifyStream(input.handle.input);
          return { handle: {
            quads: { data: data[0], mediaType: input.handleMediaType },
            triples: false,
          }};
        },
      };
      actor = new ActorRdfDereferenceFile({ name: 'actor', bus, mediatorRdfParse });
    });

    it('should convert file extensions', () => {
      expect(ActorRdfDereferenceFile.extensionToMediaType('.ttl')).toBe('text/turtle');
      expect(ActorRdfDereferenceFile.extensionToMediaType('.turtle')).toBe('text/turtle');
      expect(ActorRdfDereferenceFile.extensionToMediaType('.nt')).toBe('text/turtle');
      expect(ActorRdfDereferenceFile.extensionToMediaType('.nq')).toBe('text/turtle');
      expect(ActorRdfDereferenceFile.extensionToMediaType('.ntriples')).toBe('text/turtle');
      expect(ActorRdfDereferenceFile.extensionToMediaType('.nquads')).toBe('text/turtle');
      expect(ActorRdfDereferenceFile.extensionToMediaType('.n3')).toBe('text/turtle');
      expect(ActorRdfDereferenceFile.extensionToMediaType('.trig')).toBe('text/turtle');

      expect(ActorRdfDereferenceFile.extensionToMediaType('.json')).toBe('application/ld+json');
      expect(ActorRdfDereferenceFile.extensionToMediaType('.jsonld')).toBe('application/ld+json');

      expect(ActorRdfDereferenceFile.extensionToMediaType('.dummy')).toBeFalsy();
    });

    it('should test', () => {
      return expect(actor.test({ url: 'file:///test'})).resolves.toEqual(true);
    });

    it('should test non-file URIs', () => {
      return expect(actor.test({ url: path.join(__dirname, 'dummy.ttl')})).resolves.toBeTruthy();
    });

    it('should not test for non-existing files', () => {
      return expect(actor.test({ url: 'fake.ttl'})).rejects.toBeTruthy();
    });

    it('should run', () => {
      const p = path.join(__dirname, 'dummy.ttl');
      const data = fs.readFileSync(p);
      return expect(actor.run({ url: p })).resolves.toMatchObject(
        {
          pageUrl: p,
          quads: {
            data,
            mediaType: 'text/turtle',
          },
          triples: false,
        });
    });

    it('should run if a mediatype is provided', () => {
      const p = path.join(__dirname, 'dummy.ttl');
      const data = fs.readFileSync(p);
      return expect(actor.run({ url: p, mediaType: 'text/turtle' })).resolves.toMatchObject(
        {
          pageUrl: p,
          quads: {
            data,
            mediaType: 'text/turtle',
          },
          triples: false,
        });
    });

    it('should run for file:/// paths', () => {
      let p = path.join(__dirname, 'dummy.ttl');
      const data = fs.readFileSync(p);
      p = 'file:///' + p;
      return expect(actor.run({ url: p, mediaType: 'text/turtle' })).resolves.toMatchObject(
        {
          pageUrl: p,
          quads: {
            data,
            mediaType: 'text/turtle',
          },
          triples: false,
        });
    });

    it('should not find a mediatype if there is no file extension', () => {
      const p = path.join(__dirname, 'dummy');
      const data = fs.readFileSync(p);
      return expect(actor.run({ url: p })).resolves.toMatchObject(
        {
          pageUrl: p,
          quads: {
            data,
          },
          triples: false,
        });
    });
  });
});
