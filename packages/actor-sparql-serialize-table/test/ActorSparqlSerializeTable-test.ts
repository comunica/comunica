import { Readable } from 'stream';
import { Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import type { BindingsStream } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type * as RDF from 'rdf-js';
import { ActorSparqlSerializeTable } from '../lib/ActorSparqlSerializeTable';

const DF = new DataFactory();
const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorSparqlSerializeTable', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorSparqlSerializeTable module', () => {
    it('should be a function', () => {
      expect(ActorSparqlSerializeTable).toBeInstanceOf(Function);
    });

    it('should be a ActorSparqlSerializeTable constructor', () => {
      expect(new (<any> ActorSparqlSerializeTable)({ name: 'actor', bus, columnWidth: 10 }))
        .toBeInstanceOf(ActorSparqlSerializeTable);
    });

    it('should not be able to create new ActorSparqlSerializeTable objects without \'new\'', () => {
      expect(() => { (<any> ActorSparqlSerializeTable)(); }).toThrow();
    });
  });

  describe('An ActorSparqlSerializeTable instance', () => {
    let actor: ActorSparqlSerializeTable;
    let bindingsStream: BindingsStream;
    let quadStream: RDF.Stream;
    let streamError: Readable;
    let variables: string[];

    beforeEach(() => {
      actor = new ActorSparqlSerializeTable({ bus,
        columnWidth: 10,
        mediaTypes: {
          table: 1,
        },
        name: 'actor' });
      bindingsStream = new ArrayIterator([
        Bindings({ k1: DF.namedNode('v1') }),
        Bindings({ k2: DF.namedNode('v2') }),
      ]);
      quadStream = new ArrayIterator([
        quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
        quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
      ]);
      streamError = new Readable();
      streamError._read = () => streamError.emit('error', new Error('ActorSparqlSerializeTable-test'));
      variables = [ 'k1', 'k2' ];
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          table: 1,
        }});
      });
    });

    describe('for serializing', () => {
      it('should test on table', () => {
        return expect(actor.test({ handle: <any> { type: 'quads', quadStream },
          handleMediaType: 'table' })).resolves.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test({ handle: <any> { type: 'quads', quadStream },
          handleMediaType: 'application/n-triples' }))
          .rejects.toBeTruthy();
      });

      it('should not test on unknown types', () => {
        return expect(actor.test(
          { handle: <any> { type: 'unknown' }, handleMediaType: 'table' },
        ))
          .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'bindings', bindingsStream, variables },
            handleMediaType: 'table' },
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
            handleMediaType: 'table' },
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
          { handle: <any> { type: 'bindings', bindingsStream: streamError, variables },
            handleMediaType: 'application/json' },
        ))).handle.data)).rejects.toBeTruthy();
      });

      it('should emit an error when a quad stream emits an error', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'quads', quadStream: streamError, variables },
            handleMediaType: 'application/json' },
        ))).handle.data)).rejects.toBeTruthy();
      });
    });
  });
});
