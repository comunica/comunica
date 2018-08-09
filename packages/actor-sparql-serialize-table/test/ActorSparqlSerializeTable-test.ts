import {Bindings, BindingsStream} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {namedNode} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {Readable} from "stream";
import {ActorSparqlSerializeTable} from "../lib/ActorSparqlSerializeTable";

const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorSparqlSerializeTable', () => {
  let bus;

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
    let quadStream;
    let streamError;
    let variables;

    beforeEach(() => {
      actor = new ActorSparqlSerializeTable({ bus, columnWidth: 10, mediaTypes: {
        table: 1.0,
      }, name: 'actor' });
      bindingsStream = new ArrayIterator([
        Bindings({ k1: namedNode('v1'), k2: null }),
        Bindings({ k1: null, k2: namedNode('v2') }),
      ]);
      quadStream = new ArrayIterator([
        quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
        quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
      ]);
      streamError = new Readable();
      streamError._read = () => streamError.emit('error', new Error());
      variables = [ 'k1', 'k2' ];
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          table: 1.0,
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
          { handle: <any> { type: 'unknown' }, handleMediaType: 'table' }))
          .rejects.toBeTruthy();
      });

      // tslint:disable:no-trailing-whitespace
      it('should run on a bindings stream', async () => {
        return expect((await stringifyStream((await actor.run(
          {handle: <any> { type: 'bindings', bindingsStream, variables },
            handleMediaType: 'table'})).handle.data))).toEqual(
`k1         k2        
---------------------
v1                   
           v2        
`);
      });

      it('should run on a quad stream', async () => {
        return expect((await stringifyStream((await actor.run(
          { handle: <any> { type: 'quads', quadStream },
            handleMediaType: 'table' })).handle.data))).toEqual(
`subject    predicate  object     graph     
-------------------------------------------
http://ex… http://ex… http://ex…           
http://ex… http://ex… http://ex…           
`);
      });

      it('should emit an error when a bindings stream emits an error', async () => {
        return expect(stringifyStream((await actor.run(
          {handle: <any> { type: 'bindings', bindingsStream: streamError, variables },
            handleMediaType: 'application/json'})).handle.data)).rejects.toBeTruthy();
      });

      it('should emit an error when a quad stream emits an error', async () => {
        return expect(stringifyStream((await actor.run(
          {handle: <any> { type: 'quads', quadStream: streamError, variables },
            handleMediaType: 'application/json'})).handle.data)).rejects.toBeTruthy();
      });
    });
  });
});
