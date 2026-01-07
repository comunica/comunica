import { Readable } from 'node:stream';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { stringify as stringifyStream } from '@jeswr/stream-to-string';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import type { AsyncIterator } from 'asynciterator';
import { streamifyArray } from 'streamify-array';
import { ActorRdfSerializeN3 } from '../lib/ActorRdfSerializeN3';
import '@comunica/utils-jest';

const quad = require('rdf-quad');

describe('ActorRdfSerializeN3', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorRdfSerializeN3 module', () => {
    it('should be a function', () => {
      expect(ActorRdfSerializeN3).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfSerializeN3 constructor', () => {
      expect(new (<any> ActorRdfSerializeN3)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfSerializeN3);
    });

    it('should not be able to create new ActorRdfSerializeN3 objects without \'new\'', () => {
      expect(() => {
        (<any> ActorRdfSerializeN3)();
      }).toThrow(`Class constructor ActorRdfSerializeN3 cannot be invoked without 'new'`);
    });
  });

  describe('An ActorRdfSerializeN3 instance', () => {
    let actor: ActorRdfSerializeN3;
    let quadStream: () => RDF.Stream & AsyncIterator<RDF.Quad>;
    let quadStreamQuoted: () => RDF.Stream & AsyncIterator<RDF.Quad>;
    let quadStreamPipeable: any;
    let quadsError: any;

    beforeEach(() => {
      actor = new ActorRdfSerializeN3({ bus, mediaTypePriorities: {
        'application/trig': 1,
        'text/turtle': 1,
      }, mediaTypeFormats: {}, name: 'actor' });
    });

    describe('for serializing', () => {
      beforeEach(() => {
        quadStream = () => new ArrayIterator([
          quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
          quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
        ]);
        quadStreamPipeable = streamifyArray([
          quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
          quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
        ]);
        quadStreamQuoted = () => new ArrayIterator([
          quad('<<ex:s1 ex:p1 ex:o1>>', 'http://example.org/b', 'http://example.org/c'),
          quad('<<ex:s1 ex:p1 ex:o1>>', 'http://example.org/d', 'http://example.org/e'),
        ]);
        quadsError = new Readable();
        quadsError._read = () => quadsError.emit('error', new Error('SerializeN3'));
      });

      describe('quad stream tests', () => {
        let stream: RDF.Stream & AsyncIterator<RDF.Quad>;
        beforeEach(() => {
          stream = quadStream();
        });
        afterEach(() => {
          stream.destroy();
        });

        it('should test on application/trig', async() => {
          await expect(actor.test({
            handle: { quadStream: stream, context },
            handleMediaType: 'application/trig',
            context,
          }))
            .resolves.toPassTest({ handle: true });
        });

        it('should test on text/turtle', async() => {
          await expect(actor.test({
            handle: { quadStream: stream, context },
            handleMediaType: 'text/turtle',
            context,
          }))
            .resolves.toPassTest({ handle: true });
        });

        it('should not test on application/json', async() => {
          await expect(actor.test({
            handle: { quadStream: stream, context },
            handleMediaType: 'application/json',
            context,
          }))
            .resolves.toFailTest(`Unrecognized media type: application/json`);
        });
      });

      it('should run', async() => {
        const output: any = await actor
          .run({ handle: { quadStream: quadStream(), context }, handleMediaType: 'text/turtle', context });
        await expect(stringifyStream(output.handle.data)).resolves.toBe(
          `<http://example.org/a> <http://example.org/b> <http://example.org/c>;
    <http://example.org/d> <http://example.org/e>.
`,
        );
      });

      it('should run on a pipeable stream', async() => {
        const output: any = await actor
          .run({ handle: { quadStream: quadStreamPipeable, context }, handleMediaType: 'text/turtle', context });
        await expect(stringifyStream(output.handle.data)).resolves.toBe(
          `<http://example.org/a> <http://example.org/b> <http://example.org/c>;
    <http://example.org/d> <http://example.org/e>.
`,
        );
      });

      it('should run on triple terms', async() => {
        const output: any = await actor
          .run({ handle: { quadStream: quadStreamQuoted(), context }, handleMediaType: 'text/turtle', context });
        await expect(stringifyStream(output.handle.data)).resolves.toBe(
          `<<(<ex:s1> <ex:p1> <ex:o1>)>> <http://example.org/b> <http://example.org/c>;
    <http://example.org/d> <http://example.org/e>.
`,
        );
      });

      it('should run and output triples for text/turtle', async() => {
        expect((<any> (await actor.run({
          handle: { quadStream: quadStream(), context },
          handleMediaType: 'text/turtle',
          context,
        })))
          .handle.triples).toBeTruthy();
      });

      it('should run and output triples for application/n-triples', async() => {
        expect((<any> (await actor
          .run({ handle: { quadStream: quadStream(), context }, handleMediaType: 'application/n-triples', context })))
          .handle.triples).toBeTruthy();
      });

      it('should run and output triples for text/n3', async() => {
        expect((<any> (await actor
          .run({ handle: { quadStream: quadStream(), context }, handleMediaType: 'text/n3', context })))
          .handle.triples).toBeTruthy();
      });

      it('should run and output non-triples for application/trig', async() => {
        expect((<any> (await actor
          .run({ handle: { quadStream: quadStream(), context }, handleMediaType: 'application/trig', context })))
          .handle.triples).toBeFalsy();
      });

      it('should forward stream errors', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: { quadStream: quadsError, context }, handleMediaType: 'application/trig', context },
        )))
          .handle.data)).rejects.toBeTruthy();
      });
    });

    describe('for getting media types', () => {
      it('should test', async() => {
        await expect(actor.test({ mediaTypes: true, context })).resolves.toPassTest({ mediaTypes: true });
      });

      it('should run', async() => {
        await expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          'application/trig': 1,
          'text/turtle': 1,
        }});
      });
    });
  });
});
