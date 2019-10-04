import {ActorRdfDereference, KEY_CONTEXT_LENIENT} from "@comunica/bus-rdf-dereference";
import {ActionContext, Bus} from "@comunica/core";
import * as fs from 'fs';
import * as path from 'path';
import {Readable} from "stream";
import {ActorRdfDereferenceFile} from "../lib/ActorRdfDereferenceFile";

const arrayifyStream = require('arrayify-stream');

function fileUrl(str: string): string {
  let pathName = path.resolve(str).replace(/\\/g, '/');

  // Windows drive letter must be prefixed with a slash
  if (pathName[0] !== '/') {
    pathName = '/' + pathName;
  }

  return encodeURI('file://' + pathName);
}

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
    let mediaMappings;

    beforeEach(() => {
      mediatorRdfParse = {
        mediate: async (action) => {
          const quads = new Readable();
          if (action.context && action.context.has('emitParseError')) {
            quads._read = () => {
              quads.emit('error', new Error('Parse error'));
            };
            return { handle: { quads, triples: true } };
          } else if (action.context && action.context.has('parseReject')) {
            return Promise.reject(new Error('Parse reject error'));
          } else {
            const data = await arrayifyStream(action.handle.input);
            return {
              handle: {
                quads: {data: data[0], mediaType: action.handleMediaType},
                triples: false,
              },
            };
          }
        },
      };
      mediaMappings = { ttl: 'text/turtle' };
      actor = new ActorRdfDereferenceFile({ name: 'actor', bus, mediaMappings, mediatorRdfParse });
    });

    it('should test', () => {
      return expect(actor.test({ url: fileUrl(path.join(__dirname, 'dummy.ttl'))})).resolves.toEqual(true);
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
          headers: {},
          quads: {
            data,
            mediaType: 'text/turtle',
          },
          triples: false,
          url: p,
        });
    });

    it('should run if a mediatype is provided', () => {
      const p = path.join(__dirname, 'dummy.ttl');
      const data = fs.readFileSync(p);
      return expect(actor.run({ url: p, mediaType: 'text/turtle' })).resolves.toMatchObject(
        {
          headers: {},
          quads: {
            data,
            mediaType: 'text/turtle',
          },
          triples: false,
          url: p,
        });
    });

    it('should run for file:/// paths', () => {
      let p = path.join(__dirname, 'dummy.ttl');
      const data = fs.readFileSync(p);
      p = 'file:///' + p;
      return expect(actor.run({ url: p, mediaType: 'text/turtle' })).resolves.toMatchObject(
        {
          headers: {},
          quads: {
            data,
            mediaType: 'text/turtle',
          },
          triples: false,
          url: p,
        });
    });

    it('should not find a mediatype if an unknown extension is provided', () => {
      const p = path.join(__dirname, 'dummy.unknown');
      const data = fs.readFileSync(p);
      return expect(actor.run({ url: p })).resolves.toMatchObject(
        {
          headers: {},
          quads: {
            data,
          },
          triples: false,
          url: p,
        });
    });

    it('should not find a mediatype if there is no file extension', () => {
      const p = path.join(__dirname, 'dummy');
      const data = fs.readFileSync(p);
      return expect(actor.run({ url: p })).resolves.toMatchObject(
        {
          headers: {},
          quads: {
            data,
          },
          triples: false,
          url: p,
        });
    });

    it('should run and receive parse errors', async () => {
      const p = path.join(__dirname, 'dummy.ttl');
      const context = ActionContext({ emitParseError: true });
      const output = await actor.run({ url: p, context });
      expect(output.url).toEqual(p);
      await expect(arrayifyStream(output.quads)).rejects.toThrow(new Error('Parse error'));
    });

    it('should run and ignore parse errors in lenient mode', async () => {
      const p = path.join(__dirname, 'dummy.ttl');
      const context = ActionContext({ emitParseError: true, [KEY_CONTEXT_LENIENT]: true });
      const spy = jest.spyOn(actor, <any> 'logError');
      const output = await actor.run({ url: p, context });
      expect(output.url).toEqual(p);
      expect(await arrayifyStream(output.quads)).toEqual([]);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not run on parse rejects', () => {
      const p = path.join(__dirname, 'dummy.ttl');
      const context = ActionContext({ parseReject: true });
      return expect(actor.run({ url: p, context }))
        .rejects.toThrow(new Error('Parse reject error'));
    });

    it('should run and ignore parse rejects in lenient mode', async () => {
      const p = path.join(__dirname, 'dummy.ttl');
      const context = ActionContext({ parseReject: true, [KEY_CONTEXT_LENIENT]: true });
      const spy = jest.spyOn(actor, <any> 'logError');
      const output = await actor.run({ url: p, context });
      expect(output.url).toEqual(p);
      expect(await arrayifyStream(output.quads)).toEqual([]);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
