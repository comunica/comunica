import { Readable } from 'node:stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { BindingsStream, IActionContext, MetadataBindings } from '@comunica/types';
import { stringify as stringifyStream } from '@jeswr/stream-to-string';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryResultSerializeTable } from '../lib/ActorQueryResultSerializeTable';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const quad = require('rdf-quad');

describe('ActorQueryResultSerializeTable', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
  });

  describe('The ActorQueryResultSerializeTable module', () => {
    it('should be a function', () => {
      expect(ActorQueryResultSerializeTable).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryResultSerializeTable constructor', () => {
      expect(new (<any> ActorQueryResultSerializeTable)({ name: 'actor', bus, columnWidth: 10 }))
        .toBeInstanceOf(ActorQueryResultSerializeTable);
    });

    it('should not be able to create new ActorQueryResultSerializeTable objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryResultSerializeTable)();
      }).toThrow(`Class constructor ActorQueryResultSerializeTable cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryResultSerializeTable instance', () => {
    let actor: ActorQueryResultSerializeTable;
    let bindingsStream: () => BindingsStream;
    let bindingsStreamQuoted: () => BindingsStream;
    let quadStream: () => RDF.Stream & AsyncIterator<RDF.Quad>;
    let quadStreamQuoted: () => RDF.Stream & AsyncIterator<RDF.Quad>;
    let streamError: Readable;
    let metadata: MetadataBindings;

    beforeEach(() => {
      actor = new ActorQueryResultSerializeTable({ bus, columnWidth: 10, mediaTypePriorities: {
        table: 1,
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
      streamError._read = () => streamError.emit('error', new Error('ActorQueryResultSerializeTable-test'));
      metadata = <any> { variables: [ DF.variable('k1'), DF.variable('k2') ]};
    });

    describe('for getting media types', () => {
      it('should test', async() => {
        await expect(actor.test({ mediaTypes: true, context })).resolves.toBeTruthy();
      });

      it('should run', async() => {
        await expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          table: 1,
        }});
      });
    });

    describe('for serializing', () => {
      it('should test on table', async() => {
        const stream = quadStream();
        await expect(actor.test({
          handle: <any> { type: 'quads', quadStream: stream },
          handleMediaType: 'table',
          context,
        })).resolves.toBeTruthy();

        stream.destroy();
      });

      it('should not test on N-Triples', async() => {
        const stream = quadStream();
        await expect(actor.test({
          handle: <any> { type: 'quads', quadStream: stream },
          handleMediaType: 'application/n-triples',
          context,
        }))
          .rejects.toBeTruthy();

        stream.destroy();
      });

      it('should not test on unknown types', async() => {
        await expect(actor.test(
          { handle: <any> { type: 'unknown' }, handleMediaType: 'table', context },
        ))
          .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          {
            handle: <any> { type: 'bindings', bindingsStream: bindingsStream(), metadata: async() => metadata },
            handleMediaType: 'table',
            context,
          },
        ))).handle.data)).resolves.toBe(
          `k1         k2        
---------------------
v1                   
           v2        
`,
        );
      });

      it('should run on a bindings stream with quoted triples', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          {
            handle: <any> { type: 'bindings', bindingsStream: bindingsStreamQuoted(), metadata: async() => metadata },
            handleMediaType: 'table',
            context,
          },
        ))).handle.data)).resolves.toBe(
          `k1         k2        
---------------------
<<s1 p1 o…           
           <<s2 p2 o…
`,
        );
      });

      it('should run on a quad stream', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'quads', quadStream: quadStream(), context }, handleMediaType: 'table', context },
        ))).handle.data)).resolves.toBe(
          `subject    predicate  object     graph     
-------------------------------------------
http://ex… http://ex… http://ex…           
http://ex… http://ex… http://ex…           
`,
        );
      });

      it('should run on a quad stream with quoted triples', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          {
            handle: <any> { type: 'quads', quadStream: quadStreamQuoted(), context },
            handleMediaType: 'table',
            context,
          },
        ))).handle.data)).resolves.toBe(
          `subject    predicate  object     graph     
-------------------------------------------
<<ex:s1 e… http://ex… http://ex…           
<<ex:s2 e… http://ex… http://ex…           
`,
        );
      });

      it('should emit an error when a bindings stream emits an error', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          {
            handle: <any> { type: 'bindings', bindingsStream: streamError, metadata: async() => metadata },
            handleMediaType: 'application/json',
            context,
          },
        ))).handle.data)).rejects.toBeTruthy();
      });

      it('should emit an error when a quad stream emits an error', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          {
            handle: <any> { type: 'quads', quadStream: streamError, metadata: async() => metadata, context },
            handleMediaType: 'application/json',
            context,
          },
        ))).handle.data)).rejects.toBeTruthy();
      });
    });
  });
});
