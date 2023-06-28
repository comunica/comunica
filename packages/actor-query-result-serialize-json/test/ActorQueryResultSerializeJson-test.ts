import { Readable } from 'stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import { ActionContext, Bus } from '@comunica/core';
import type { BindingsStream, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryResultSerializeJson } from '..';

const DF = new DataFactory();
const BF = new BindingsFactory();
const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorQueryResultSerializeJson', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorQueryResultSerializeJson module', () => {
    it('should be a function', () => {
      expect(ActorQueryResultSerializeJson).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryResultSerializeJson constructor', () => {
      expect(new (<any> ActorQueryResultSerializeJson)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryResultSerializeJson);
    });

    it('should not be able to create new ActorQueryResultSerializeJson objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryResultSerializeJson)(); }).toThrow();
    });
  });

  describe('An ActorQueryResultSerializeJson instance', () => {
    let actor: ActorQueryResultSerializeJson;
    let bindingsStream: () => BindingsStream;
    let bindingsStreamQuoted: () => BindingsStream;
    let quadStream: () => RDF.Stream & AsyncIterator<RDF.Quad>;
    let quadStreamQuoted: () => RDF.Stream & AsyncIterator<RDF.Quad>;
    let bindingsStreamEmpty: () => BindingsStream;
    let streamError: Readable;

    beforeEach(() => {
      actor = new ActorQueryResultSerializeJson({ bus,
        mediaTypePriorities: {
          'application/json': 1,
        },
        mediaTypeFormats: {},
        name: 'actor' });
      bindingsStream = () => new ArrayIterator([
        BF.bindings([
          [ DF.variable('k1'), DF.namedNode('v1') ],
        ]),
        BF.bindings([
          [ DF.variable('k2'), DF.blankNode('v2') ],
        ]),
      ], { autoStart: false });
      bindingsStreamQuoted = () => new ArrayIterator([
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
      ], { autoStart: false });
      quadStreamQuoted = () => new ArrayIterator([
        quad('<<ex:s1 ex:p1 ex:o1>>', 'http://example.org/b', 'http://example.org/c'),
        quad('<<ex:s2 ex:p2 ex:o2>>', 'http://example.org/d', 'http://example.org/e'),
      ], { autoStart: false });
      bindingsStreamEmpty = () => new ArrayIterator([], { autoStart: false });
      streamError = new Readable();
      streamError._read = () => streamError.emit('error', new Error('SparqlJson'));
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true, context })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          'application/json': 1,
        }});
      });
    });

    describe('for serializing', () => {
      it('should test on application/json quads', async() => {
        const stream = quadStream();
        await expect(actor
          .test({
            handle: <any> { type: 'quads', quadStream: stream, context },
            handleMediaType: 'application/json',
            context,
          }))
          .resolves.toBeTruthy();

        stream.destroy();
      });

      it('should test on application/json bindings', async() => {
        const stream = bindingsStream();
        await expect(actor.test({ handle: <any> { type: 'bindings', bindingsStream: stream, context },
          handleMediaType: 'application/json',
          context }))
          .resolves.toBeTruthy();
        stream.destroy();
      });

      it('should test on application/json booleans', () => {
        return expect(actor.test({ handle: <any> { type: 'boolean', execute: () => Promise.resolve(true), context },
          handleMediaType: 'application/json',
          context }))
          .resolves.toBeTruthy();
      });

      it('should not test on N-Triples', async() => {
        const stream = quadStream();
        await expect(actor.test(
          {
            handle: <any> { type: 'quads', quadStream: stream, context },
            handleMediaType: 'application/n-triples',
            context,
          },
        ))
          .rejects.toBeTruthy();

        stream.destroy();
      });

      it('should not test on unknown types', () => {
        return expect(actor.test(
          { handle: <any> { type: 'unknown', context }, handleMediaType: 'application/json', context },
        ))
          .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          {
            handle: <any> { type: 'bindings', bindingsStream: bindingsStream(), context },
            handleMediaType: 'application/json',
            context,
          },
        ))).handle.data))
          .toEqual(
            `[
{"k1":"v1"},
{"k2":"_:v2"}
]
`,
          );
      });

      it('should run on a bindings stream with quoted triples', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          {
            handle: <any> { type: 'bindings', bindingsStream: bindingsStreamQuoted(), context },
            handleMediaType: 'application/json',
            context,
          },
        ))).handle.data))
          .toEqual(
            `[
{"k1":"<<s1 p1 o1>>"},
{"k2":"<<s2 p2 o2>>"}
]
`,
          );
      });

      it('should run on a quad stream', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          {
            handle: <any> { type: 'quads', quadStream: quadStream(), context },
            handleMediaType: 'application/json',
            context,
          },
        ))).handle.data)).toEqual(
          `[
{"subject":"http://example.org/a","predicate":"http://example.org/b","object":"http://example.org/c","graph":""},
{"subject":"http://example.org/a","predicate":"http://example.org/d","object":"http://example.org/e","graph":""}
]
`,
        );
      });

      it('should run on a quad stream with quoted triples', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          {
            handle: <any> { type: 'quads', quadStream: quadStreamQuoted(), context },
            handleMediaType: 'application/json',
            context,
          },
        ))).handle.data)).toEqual(
          `[
{"subject":"<<ex:s1 ex:p1 ex:o1>>","predicate":"http://example.org/b","object":"http://example.org/c","graph":""},
{"subject":"<<ex:s2 ex:p2 ex:o2>>","predicate":"http://example.org/d","object":"http://example.org/e","graph":""}
]
`,
        );
      });

      it('should run on an empty bindings stream', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'bindings', bindingsStream: bindingsStreamEmpty(), context },
            handleMediaType: 'application/json',
            context },
        ))).handle.data))
          .toEqual(`[]
`);
      });

      it('should run on an empty quad stream', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'quads', quadStream: bindingsStreamEmpty(), context },
            handleMediaType: 'application/json',
            context },
        ))).handle.data))
          .toEqual(`[]
`);
      });

      it('should run on a boolean result resolving to true', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'boolean', execute: () => Promise.resolve(true), context },
            handleMediaType: 'application/json',
            context },
        ))).handle.data))
          .toEqual(`true
`);
      });

      it('should run on a boolean result resolving to false', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'boolean', execute: () => Promise.resolve(false), context },
            handleMediaType: 'application/json',
            context },
        ))).handle.data))
          .toEqual(`false
`);
      });

      it('should emit an error when a bindings stream emits an error', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'bindings', bindingsStream: streamError, context },
            handleMediaType: 'application/json',
            context },
        ))).handle.data)).rejects.toBeTruthy();
      });

      it('should emit an error when a quad stream emits an error', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'quads', quadStream: streamError, context },
            handleMediaType: 'application/json',
            context },
        ))).handle.data)).rejects.toBeTruthy();
      });

      it('should emit an error when the boolean is rejected', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'boolean', execute: () => Promise.reject(new Error('SparqlJson')), context },
            handleMediaType: 'application/json',
            context },
        ))).handle.data)).rejects.toBeTruthy();
      });
    });
  });
});
