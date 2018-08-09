import {Bindings, BindingsStream} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {blankNode, namedNode} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {Readable} from "stream";
import {ActorSparqlSerializeJson} from "../lib/ActorSparqlSerializeJson";

const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorSparqlSerializeJson', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorSparqlSerializeJson module', () => {
    it('should be a function', () => {
      expect(ActorSparqlSerializeJson).toBeInstanceOf(Function);
    });

    it('should be a ActorSparqlSerializeJson constructor', () => {
      expect(new (<any> ActorSparqlSerializeJson)({ name: 'actor', bus })).toBeInstanceOf(ActorSparqlSerializeJson);
    });

    it('should not be able to create new ActorSparqlSerializeJson objects without \'new\'', () => {
      expect(() => { (<any> ActorSparqlSerializeJson)(); }).toThrow();
    });
  });

  describe('An ActorSparqlSerializeJson instance', () => {
    let actor: ActorSparqlSerializeJson;
    let bindingsStream: BindingsStream;
    let quadStream;
    let bindingsStreamEmpty;
    let streamError;

    beforeEach(() => {
      actor = new ActorSparqlSerializeJson({ bus, mediaTypes: {
        'application/json': 1.0,
      }, name: 'actor' });
      bindingsStream = new ArrayIterator([
        Bindings({ k1: namedNode('v1') }),
        Bindings({ k2: blankNode('v2') }),
      ]);
      quadStream = new ArrayIterator([
        quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
        quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
      ]);
      bindingsStreamEmpty = new ArrayIterator([]);
      streamError = new Readable();
      streamError._read = () => streamError.emit('error', new Error());
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'application/json': 1.0,
        }});
      });
    });

    describe('for serializing', () => {
      it('should test on application/json quads', () => {
        return expect(actor.test({ handle: <any> { type: 'quads', quadStream }, handleMediaType: 'application/json' }))
          .resolves.toBeTruthy();
      });

      it('should test on application/json bindings', () => {
        return expect(actor.test({ handle: <any> { type: 'bindings', bindingsStream },
          handleMediaType: 'application/json' }))
          .resolves.toBeTruthy();
      });

      it('should test on application/json booleans', () => {
        return expect(actor.test({ handle: <any> { type: 'boolean', booleanResult: Promise.resolve(true) },
          handleMediaType: 'application/json' }))
          .resolves.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test(
          { handle: <any> { type: 'quads', quadStream }, handleMediaType: 'application/n-triples' }))
          .rejects.toBeTruthy();
      });

      it('should not test on unknown types', () => {
        return expect(actor.test(
          { handle: <any> { type: 'unknown' }, handleMediaType: 'application/json' }))
          .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async () => {
        return expect((await stringifyStream((await actor.run(
          {handle: <any> { type: 'bindings', bindingsStream }, handleMediaType: 'application/json'})).handle.data)))
          .toEqual(
`[
{"k1":"v1"},
{"k2":"_:v2"}
]
`);
      });

      // tslint:disable:max-line-length
      it('should run on a quad stream', async () => {
        return expect((await stringifyStream((await actor.run(
          { handle: <any> { type: 'quads', quadStream }, handleMediaType: 'application/json' })).handle.data))).toEqual(
`[
{"subject":"http://example.org/a","predicate":"http://example.org/b","object":"http://example.org/c","graph":""},
{"subject":"http://example.org/a","predicate":"http://example.org/d","object":"http://example.org/e","graph":""}
]
`);
      });

      it('should run on an empty bindings stream', async () => {
        return expect((await stringifyStream((await actor.run(
          { handle: <any> { type: 'bindings', bindingsStream: bindingsStreamEmpty },
            handleMediaType: 'application/json'})).handle.data)))
          .toEqual(`[]
`);
      });

      it('should run on an empty quad stream', async () => {
        return expect((await stringifyStream((await actor.run(
          { handle: <any> { type: 'quads', quadStream: bindingsStreamEmpty },
            handleMediaType: 'application/json'})).handle.data)))
          .toEqual(`[]
`);
      });

      it('should run on a boolean result resolving to true', async () => {
        return expect((await stringifyStream((await actor.run(
          {handle: <any> { type: 'boolean', booleanResult: Promise.resolve(true) },
            handleMediaType: 'application/json'})).handle.data)))
          .toEqual(`true
`);
      });

      it('should run on a boolean result resolving to false', async () => {
        return expect((await stringifyStream((await actor.run(
          {handle: <any> { type: 'boolean', booleanResult: Promise.resolve(false) },
            handleMediaType: 'application/json'})).handle.data)))
          .toEqual(`false
`);
      });

      it('should emit an error when a bindings stream emits an error', async () => {
        return expect(stringifyStream((await actor.run(
          {handle: <any> { type: 'bindings', bindingsStream: streamError },
            handleMediaType: 'application/json'})).handle.data)).rejects.toBeTruthy();
      });

      it('should emit an error when a quad stream emits an error', async () => {
        return expect(stringifyStream((await actor.run(
          {handle: <any> { type: 'quads', quadStream: streamError },
            handleMediaType: 'application/json'})).handle.data)).rejects.toBeTruthy();
      });

      it('should emit an error when the boolean is rejected', async () => {
        return expect(stringifyStream((await actor.run(
          {handle: <any> { type: 'boolean', booleanResult: Promise.reject(new Error()) },
            handleMediaType: 'application/json'})).handle.data)).rejects.toBeTruthy();
      });
    });
  });
});
