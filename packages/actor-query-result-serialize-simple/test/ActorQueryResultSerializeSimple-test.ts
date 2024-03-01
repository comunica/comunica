import { Readable } from 'node:stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import { ActionContext, Bus } from '@comunica/core';
import type { Bindings, BindingsStream, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryResultSerializeSimple } from '../lib/ActorQueryResultSerializeSimple';

const DF = new DataFactory();
const BF = new BindingsFactory();

const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorQueryResultSerializeSimple', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorQueryResultSerializeSimple module', () => {
    it('should be a function', () => {
      expect(ActorQueryResultSerializeSimple).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryResultSerializeSimple constructor', () => {
      expect(new (<any> ActorQueryResultSerializeSimple)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryResultSerializeSimple);
    });

    it('should not be able to create new ActorQueryResultSerializeSimple objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryResultSerializeSimple)();
      }).toThrow(`Class constructor ActorQueryResultSerializeSimple cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryResultSerializeSimple instance', () => {
    let actor: ActorQueryResultSerializeSimple;
    let bindingsStream: () => BindingsStream;
    let bindingsStreamQuoted: () => BindingsStream;
    let quadStream: () => RDF.Stream & AsyncIterator<Bindings>;
    let quadStreamQuoted: () => RDF.Stream & AsyncIterator<RDF.Quad>;
    let streamError: Readable;

    beforeEach(() => {
      actor = new ActorQueryResultSerializeSimple({ bus, mediaTypePriorities: {
        simple: 1,
      }, mediaTypeFormats: {}, name: 'actor' });
      bindingsStream = () => new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('k1'), DF.namedNode('v1') ],
        ]),
        BF.bindings([
          [ DF.variable('k2'), DF.namedNode('v2') ],
        ]),
      ]);
      bindingsStreamQuoted = () => new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('k1'), DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')) ],
        ]),
        BF.bindings([
          [ DF.variable('k2'), DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')) ],
        ]),
      ], { autoStart: false });
      quadStream = () => new ArrayIterator([
        quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
        quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
      ]);
      quadStreamQuoted = () => new ArrayIterator([
        quad('<<ex:s1 ex:p1 ex:o1>>', 'http://example.org/b', 'http://example.org/c'),
        quad('<<ex:s2 ex:p2 ex:o2>>', 'http://example.org/d', 'http://example.org/e'),
      ], { autoStart: false });
      streamError = new Readable();
      streamError._read = () => streamError.emit('error', new Error('SparqlSimple'));
    });

    describe('for getting media types', () => {
      it('should test', async() => {
        await expect(actor.test({ mediaTypes: true, context })).resolves.toBeTruthy();
      });

      it('should run', async() => {
        await expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          simple: 1,
        }});
      });
    });

    describe('for serializing', () => {
      it('should test on simple quads', async() => {
        const stream = quadStream();
        await expect(actor.test({
          handle: <any> { type: 'quads', quadStream: stream, context },
          handleMediaType: 'simple',
          context,
        }))
          .resolves.toBeTruthy();
        stream.destroy();
      });

      it('should test on simple bindings', async() => {
        const stream = bindingsStream();
        await expect(actor.test({
          handle: <any> { type: 'bindings', bindingsStream: stream, context },
          handleMediaType: 'simple',
          context,
        }))
          .resolves.toBeTruthy();

        stream.destroy();
      });

      it('should test on simple booleans', async() => {
        await expect(actor.test({
          handle: <any> { type: 'boolean', execute: () => Promise.resolve(true), context },
          handleMediaType: 'simple',
          context,
        }))
          .resolves.toBeTruthy();
      });

      it('should test on simple update', async() => {
        await expect(actor.test({
          handle: <any> { type: 'void', execute: () => Promise.resolve(true), context },
          handleMediaType: 'simple',
          context,
        }))
          .resolves.toBeTruthy();
      });

      it('should not test on N-Triples', async() => {
        const stream = quadStream();
        await expect(actor.test({
          handle: <any> { type: 'quads', quadStream: stream, context },
          handleMediaType: 'application/n-triples',
          context,
        }))
          .rejects.toBeTruthy();
        stream.destroy();
      });

      it('should not test on unknown types', async() => {
        await expect(actor.test(
          { handle: <any> { type: 'unknown', context }, handleMediaType: 'simple', context },
        ))
          .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          {
            handle: <any> { type: 'bindings', bindingsStream: bindingsStream(), context },
            handleMediaType: 'simple',
            context,
          },
        ))).handle.data)).resolves.toBe(
          `?k1: v1

?k2: v2

`,
        );
      });

      it('should run on a bindings stream with quoted triples', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          {
            handle: <any> { type: 'bindings', bindingsStream: bindingsStreamQuoted(), context },
            handleMediaType: 'simple',
            context,
          },
        ))).handle.data)).resolves.toBe(
          `?k1: <<s1 p1 o1>>

?k2: <<s2 p2 o2>>

`,
        );
      });

      it('should run on a quad stream', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'quads', quadStream: quadStream(), context }, handleMediaType: 'simple', context },
        ))).handle.data)).resolves.toBe(
          `subject: http://example.org/a
predicate: http://example.org/b
object: http://example.org/c
graph: 

subject: http://example.org/a
predicate: http://example.org/d
object: http://example.org/e
graph: 

`,
        );
      });

      it('should run on a quad stream with quoted triples', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          {
            handle: <any> { type: 'quads', quadStream: quadStreamQuoted(), context },
            handleMediaType: 'simple',
            context,
          },
        ))).handle.data)).resolves.toBe(
          `subject: <<ex:s1 ex:p1 ex:o1>>
predicate: http://example.org/b
object: http://example.org/c
graph: 

subject: <<ex:s2 ex:p2 ex:o2>>
predicate: http://example.org/d
object: http://example.org/e
graph: 

`,
        );
      });

      it('should run on a boolean result that resolves to true', async() => {
        await expect(stringifyStream((<any> (await actor.run({
          handle: <any> { type: 'boolean', execute: () => Promise.resolve(true), context },
          handleMediaType: 'simple',
          context,
        })))
          .handle.data)).resolves.toBe(
          `true
`,
        );
      });

      it('should run on a boolean result that resolves to false', async() => {
        await expect(stringifyStream((<any> (await actor.run({
          handle: <any> { type: 'boolean', execute: () => Promise.resolve(false), context },
          handleMediaType: 'simple',
          context,
        })))
          .handle.data)).resolves.toBe(
          `false
`,
        );
      });

      it('should run on an update result that resolves to false', async() => {
        await expect(stringifyStream((<any> (await actor.run({
          handle: <any> { type: 'void', execute: () => Promise.resolve(), context },
          handleMediaType: 'simple',
          context,
        })))
          .handle.data)).resolves.toBe(
          `ok
`,
        );
      });

      it('should emit an error when a bindings stream emits an error', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          {
            handle: <any> { type: 'bindings', bindingsStream: streamError, context },
            handleMediaType: 'application/json',
            context,
          },
        ))).handle.data)).rejects.toBeTruthy();
      });

      it('should emit an error when a quad stream emits an error', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          {
            handle: <any> { type: 'quads', quadStream: streamError, context },
            handleMediaType: 'application/json',
            context,
          },
        ))).handle.data)).rejects.toBeTruthy();
      });

      it('should emit an error when the boolean is rejected', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          {
            handle: <any> { type: 'boolean', execute: () => Promise.reject(new Error('SparqlSimple')), context },
            handleMediaType: 'application/json',
            context,
          },
        ))).handle.data)).rejects.toBeTruthy();
      });

      it('should emit an error when the update is rejected', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          {
            handle: <any> { type: 'void', execute: () => Promise.reject(new Error('SparqlSimple')), context },
            handleMediaType: 'application/json',
            context,
          },
        ))).handle.data)).rejects.toBeTruthy();
      });
    });
  });
});
