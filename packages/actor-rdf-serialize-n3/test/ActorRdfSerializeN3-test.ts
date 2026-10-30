import { Readable } from 'node:stream';
import { KeysRdfSerialize } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { stringify as stringifyStream } from '@jeswr/stream-to-string';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import type { AsyncIterator } from 'asynciterator';
import { Parser, StreamParser } from 'n3';
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
        ], { autoStart: false });
        quadStreamPipeable = streamifyArray([
          quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
          quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
        ]);
        quadStreamQuoted = () => new ArrayIterator([
          quad('<<ex:s1 ex:p1 ex:o1>>', 'http://example.org/b', 'http://example.org/c'),
          quad('<<ex:s1 ex:p1 ex:o1>>', 'http://example.org/d', 'http://example.org/e'),
        ], { autoStart: false });
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

      it('should run with prefixes', async() => {
        const output: any = await actor
          .run({
            handle: {
              quadStream: quadStream(),
              context: context.set(KeysRdfSerialize.rdfSerializationPrefixes, { ex: 'http://example.org/' }),
            },
            handleMediaType: 'text/turtle',
            context,
          });
        await expect(stringifyStream(output.handle.data)).resolves.toBe(
          `@prefix ex: <http://example.org/>.

ex:a ex:b ex:c;
    ex:d ex:e.
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

      it('should preserve prefixes from a pipeable N3 parser stream', async() => {
        const parser = new StreamParser({ format: 'text/turtle' });
        const output: any = await actor.run({
          handle: { quadStream: parser, context },
          handleMediaType: 'text/turtle',
          context,
        });
        const serialized = stringifyStream(output.handle.data);
        parser.end('@prefix ex: <http://example.org/>.\nex:a ex:b ex:c.');

        const turtle = await serialized;
        expect(turtle).toMatch(/@prefix\s+ex:\s*<http:\/\/example\.org\/>\s*\./u);
        expect(turtle).toMatch(/ex:a\s+ex:b\s+ex:c\s*\./u);
        const parsed = new Parser({ format: 'text/turtle' }).parse(turtle);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].equals(quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'))).toBe(true);
      });

      it.each([ true, false ])('should preserve context prefixes and quad terms (pipeable: %s)', async(pipeable) => {
        const parser = new StreamParser({ format: 'text/turtle' });
        const expected = quad('http://a/s', 'http://a/p', 'http://a/o');
        const output: any = await actor.run({
          handle: {
            quadStream: pipeable ? parser : <any> { on: parser.on.bind(parser) },
            context: context.set(KeysRdfSerialize.rdfSerializationPrefixes, { ex: 'http://a/' }),
          },
          handleMediaType: 'text/turtle',
          context,
        });
        const serialized = stringifyStream(output.handle.data);
        // Rebind ex through a real parser prefix event before emitting a quad in its original namespace.
        parser.end(`@prefix ex: <http://b/>.
@prefix other: <http://c/>.
<http://a/s> <http://a/p> <http://a/o>.
ex:s ex:p ex:o.
other:s other:p other:o.`);

        const turtle = await serialized;
        expect(turtle).toContain('@prefix ex: <http://a/>.');
        expect(turtle).not.toContain('@prefix ex: <http://b/>.');
        expect(turtle).toContain('@prefix other: <http://c/>.');
        const parsed = new Parser({ format: 'text/turtle' }).parse(turtle);
        expect(parsed).toHaveLength(3);
        expect(parsed[0].subject).toMatchObject({ termType: expected.subject.termType, value: expected.subject.value });
        expect(parsed[0].predicate).toMatchObject({
          termType: expected.predicate.termType,
          value: expected.predicate.value,
        });
        expect(parsed[0].object).toMatchObject({ termType: expected.object.termType, value: expected.object.value });
        expect(parsed[0].graph).toMatchObject({ termType: expected.graph.termType, value: expected.graph.value });
        expect(parsed[1].equals(quad('http://b/s', 'http://b/p', 'http://b/o'))).toBe(true);
        expect(parsed[2].equals(quad('http://c/s', 'http://c/p', 'http://c/o'))).toBe(true);
      });

      it.each([ true, false ])('should safely ignore repeated dynamic prefixes (pipeable: %s)', async(pipeable) => {
        const parser = new StreamParser({ format: 'text/turtle' });
        const output: any = await actor.run({
          handle: {
            quadStream: pipeable ? parser : <any> { on: parser.on.bind(parser) },
            context,
          },
          handleMediaType: 'text/turtle',
          context,
        });
        const serialized = stringifyStream(output.handle.data);
        const source = `@prefix ex: <http://a/>.
ex:s ex:p ex:o.
@prefix ex: <http://a/>.
@prefix ex: <http://b/>.
<http://a/s> <http://a/p> <http://a/o>.
ex:s ex:p ex:o.
@prefix ex: <http://c/>.
ex:s ex:p ex:o.
<http://b/s> <http://b/p> <http://b/o>.`;
        parser.end(source);

        const turtle = await serialized;
        expect(turtle.match(/@prefix ex:/gu)).toHaveLength(1);
        expect(turtle).toContain('@prefix ex: <http://a/>.');
        const parsed = new Parser({ format: 'text/turtle' }).parse(turtle);
        const expected = new Parser({ format: 'text/turtle' }).parse(source);
        expect(parsed).toHaveLength(expected.length);
        for (const [ index, value ] of expected.entries()) {
          expect(parsed[index].equals(value)).toBe(true);
        }
      });

      it('should forward non-pipeable stream errors', async() => {
        const stream = quadStream();
        const output: any = await actor.run({
          handle: { quadStream: stream, context },
          handleMediaType: 'text/turtle',
          context,
        });
        const serialized = stringifyStream(output.handle.data);
        stream.emit('error', new Error('SerializeN3'));
        await expect(serialized).rejects.toThrow('SerializeN3');
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
