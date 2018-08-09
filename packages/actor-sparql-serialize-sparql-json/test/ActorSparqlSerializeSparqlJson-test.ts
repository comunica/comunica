import {Bindings, BindingsStream} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {blankNode, defaultGraph, literal, namedNode} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {PassThrough} from "stream";
import {ActorSparqlSerializeSparqlJson} from "../lib/ActorSparqlSerializeSparqlJson";

const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorSparqlSerializeSparqlJson', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorSparqlSerializeSparqlJson module', () => {
    it('should be a function', () => {
      expect(ActorSparqlSerializeSparqlJson).toBeInstanceOf(Function);
    });

    it('should be a ActorSparqlSerializeSparqlJson constructor', () => {
      expect(new (<any> ActorSparqlSerializeSparqlJson)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorSparqlSerializeSparqlJson);
    });

    it('should not be able to create new ActorSparqlSerializeSparqlJson objects without \'new\'', () => {
      expect(() => { (<any> ActorSparqlSerializeSparqlJson)(); }).toThrow();
    });
  });

  describe('#bindingToJsonBindings', () => {
    it('should convert named nodes', () => {
      return expect(ActorSparqlSerializeSparqlJson.bindingToJsonBindings(namedNode('http://ex.org')))
        .toEqual({ value: 'http://ex.org', type: 'uri' });
    });

    it('should convert default graphs', () => {
      return expect(ActorSparqlSerializeSparqlJson.bindingToJsonBindings(defaultGraph()))
        .toEqual({ value: '', type: 'uri' });
    });

    it('should convert blank nodes', () => {
      return expect(ActorSparqlSerializeSparqlJson.bindingToJsonBindings(blankNode('b1')))
        .toEqual({ value: 'b1', type: 'bnode' });
    });

    it('should convert plain literals', () => {
      return expect(ActorSparqlSerializeSparqlJson.bindingToJsonBindings(literal('abc')))
        .toEqual({ value: 'abc', type: 'literal' });
    });

    it('should convert literals with a language', () => {
      return expect(ActorSparqlSerializeSparqlJson.bindingToJsonBindings(literal('abc', 'en-us')))
        .toEqual({ 'value': 'abc', 'type': 'literal', 'xml:lang': 'en-us' });
    });

    it('should convert literals with a datatype', () => {
      return expect(ActorSparqlSerializeSparqlJson.bindingToJsonBindings(literal('abc', namedNode('http://ex'))))
        .toEqual({ value: 'abc', type: 'literal', datatype: 'http://ex' });
    });
  });

  describe('An ActorSparqlSerializeSparqlJson instance', () => {
    let actor: ActorSparqlSerializeSparqlJson;
    let bindingsStream: BindingsStream;
    let bindingsStreamPartial: BindingsStream;
    let bindingsStreamEmpty: BindingsStream;
    let bindingsStreamError: BindingsStream;
    let quadStream;
    let variables;

    beforeEach(() => {
      actor = new ActorSparqlSerializeSparqlJson({ bus, mediaTypes: {
        'sparql-results+json': 1.0,
      }, name: 'actor' });
      bindingsStream = new ArrayIterator([
        Bindings({ '?k1': namedNode('v1') }),
        Bindings({ '?k2': namedNode('v2') }),
      ]);
      bindingsStreamPartial = new ArrayIterator([
        Bindings({ '?k1': namedNode('v1'), '?k2': null }),
        Bindings({ '?k1': null, '?k2': namedNode('v2') }),
        Bindings({}),
      ]);
      bindingsStreamEmpty = new ArrayIterator([]);
      bindingsStreamError = <any> new PassThrough();
      (<any> bindingsStreamError)._read = <any> (() => { bindingsStreamError.emit('error', new Error()); });
      quadStream = new ArrayIterator([
        quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
        quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
      ]);
      variables = [ '?k1', '?k2' ];
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'sparql-results+json': 1.0,
        }});
      });
    });

    describe('for serializing', () => {
      it('should not test on quad streams', () => {
        return expect(actor.test({ handle: <any> { quadStream, type: 'quads' },
          handleMediaType: 'sparql-results+json' }))
          .rejects.toBeTruthy();
      });

      it('should test on sparql-results+json bindings', () => {
        return expect(actor.test({ handle: <any> { bindingsStream, type: 'bindings' },
          handleMediaType: 'sparql-results+json' }))
          .resolves.toBeTruthy();
      });

      it('should test on sparql-results+json booleans', () => {
        return expect(actor.test({ handle: <any> { booleanResult: Promise.resolve(true), type: 'boolean' },
          handleMediaType: 'sparql-results+json' }))
          .resolves.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test({ handle: <any> { bindingsStream, type: 'bindings' },
          handleMediaType: 'application/n-triples' }))
          .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async () => {
        return expect((await stringifyStream((await actor.run(
          {handle: <any> {bindingsStream, type: 'bindings', variables},
            handleMediaType: 'json'})).handle.data))).toEqual(
`{"head": {"vars":["k1","k2"]},
"results": { "bindings": [
{"k1":{"value":"v1","type":"uri"}},
{"k2":{"value":"v2","type":"uri"}}
]}}
`);
      });

      it('should run on a bindings stream without variables', async () => {
        return expect((await stringifyStream((await actor.run(
          {handle: <any> { bindingsStream, type: 'bindings', variables: [] },
            handleMediaType: 'json'})).handle.data))).toEqual(
`{"head": {},
"results": { "bindings": [
{"k1":{"value":"v1","type":"uri"}},
{"k2":{"value":"v2","type":"uri"}}
]}}
`);
      });

      it('should run on a bindings stream with unbound variables', async () => {
        return expect((await stringifyStream((await actor.run(
          {handle: <any> { bindingsStream: bindingsStreamPartial, type: 'bindings', variables: [] },
            handleMediaType: 'json'})).handle.data))).toEqual(
`{"head": {},
"results": { "bindings": [
{"k1":{"value":"v1","type":"uri"}},
{"k2":{"value":"v2","type":"uri"}},
{}
]}}
`);
      });
    });

    it('should run on an empty bindings stream', async () => {
      return expect((await stringifyStream((await actor.run(
        {handle: <any> { bindingsStream: bindingsStreamEmpty, type: 'bindings', variables },
          handleMediaType: 'json'})).handle.data))).toEqual(
`{"head": {"vars":["k1","k2"]},
"results": { "bindings": [] }}
`);
    });

    it('should emit an error on an errorring bindings stream', async () => {
      return expect((stringifyStream((await actor.run(
        {handle: <any> { bindingsStream: bindingsStreamError, type: 'bindings', variables },
          handleMediaType: 'json'})).handle.data))).rejects.toBeTruthy();
    });

    it('should run on a boolean result that resolves to true', async () => {
      return expect((await stringifyStream((await actor.run(
        {handle: <any> { type: 'boolean', booleanResult: Promise.resolve(true), variables: [] },
          handleMediaType: 'simple'})).handle.data))).toEqual(
`{"head": {},
"boolean":true
}
`);
    });

    it('should run on a boolean result that resolves to false', async () => {
      return expect((await stringifyStream((await actor.run(
        {handle: <any> { type: 'boolean', booleanResult: Promise.resolve(false), variables: [] },
          handleMediaType: 'simple'})).handle.data))).toEqual(
`{"head": {},
"boolean":false
}
`);
    });

    it('should emit an error on a boolean result that rejects', async () => {
      return expect((stringifyStream((await actor.run(
        {handle: <any> { type: 'boolean', booleanResult: Promise.reject(new Error('e')), variables: [] },
          handleMediaType: 'simple'})).handle.data))).rejects.toBeTruthy();
    });
  });
});
