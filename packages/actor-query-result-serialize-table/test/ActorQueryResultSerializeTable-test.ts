import { Readable } from 'stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import { ActionContext, Bus } from '@comunica/core';
import type { BindingsStream, IActionContext, MetadataBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryResultSerializeTable } from '../lib/ActorQueryResultSerializeTable';

const DF = new DataFactory();
const BF = new BindingsFactory();
const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorQueryResultSerializeTable', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
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
      expect(() => { (<any> ActorQueryResultSerializeTable)(); }).toThrow();
    });
  });

  describe('An ActorQueryResultSerializeTable instance', () => {
    let actor: ActorQueryResultSerializeTable;
    let bindingsStream: BindingsStream;
    let quadStream: RDF.Stream;
    let streamError: Readable;
    let metadata: MetadataBindings;

    beforeEach(() => {
      actor = new ActorQueryResultSerializeTable({ bus,
        columnWidth: 10,
        mediaTypePriorities: {
          table: 1,
        },
        mediaTypeFormats: {},
        name: 'actor' });
      bindingsStream = new ArrayIterator([
        BF.bindings([
          [ DF.variable('k1'), DF.namedNode('v1') ],
        ]),
        BF.bindings([
          [ DF.variable('k2'), DF.namedNode('v2') ],
        ]),
      ]);
      quadStream = new ArrayIterator([
        quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
        quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
      ]);
      streamError = new Readable();
      streamError._read = () => streamError.emit('error', new Error('ActorQueryResultSerializeTable-test'));
      metadata = <any> { variables: [ DF.variable('k1'), DF.variable('k2') ]};
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true, context })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          table: 1,
        }});
      });
    });

    describe('for serializing', () => {
      it('should test on table', () => {
        return expect(actor.test({ handle: <any> { type: 'quads', quadStream },
          handleMediaType: 'table',
          context })).resolves.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test({ handle: <any> { type: 'quads', quadStream },
          handleMediaType: 'application/n-triples',
          context }))
          .rejects.toBeTruthy();
      });

      it('should not test on unknown types', () => {
        return expect(actor.test(
          { handle: <any> { type: 'unknown' }, handleMediaType: 'table', context },
        ))
          .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'bindings', bindingsStream, metadata: async() => metadata },
            handleMediaType: 'table',
            context },
        ))).handle.data)).toEqual(
          `k1         k2        
---------------------
v1                   
           v2        
`,
        );
      });

      it('should run on a quad stream', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'quads', quadStream },
            handleMediaType: 'table',
            context },
        ))).handle.data)).toEqual(
          `subject    predicate  object     graph     
-------------------------------------------
http://ex… http://ex… http://ex…           
http://ex… http://ex… http://ex…           
`,
        );
      });

      it('should emit an error when a bindings stream emits an error', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'bindings', bindingsStream: streamError, metadata: async() => metadata },
            handleMediaType: 'application/json',
            context },
        ))).handle.data)).rejects.toBeTruthy();
      });

      it('should emit an error when a quad stream emits an error', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'quads', quadStream: streamError, metadata: async() => metadata },
            handleMediaType: 'application/json',
            context },
        ))).handle.data)).rejects.toBeTruthy();
      });
    });
  });
});
