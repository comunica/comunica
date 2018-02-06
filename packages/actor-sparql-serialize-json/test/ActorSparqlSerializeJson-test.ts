import {Bindings, BindingsStream} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {namedNode} from "rdf-data-model";
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

    beforeEach(() => {
      actor = new ActorSparqlSerializeJson({ bus, mediaTypes: {
        'application/json': 1.0,
      }, name: 'actor' });
      bindingsStream = new ArrayIterator([
        Bindings({ k1: namedNode('v1') }),
        Bindings({ k2: namedNode('v2') }),
      ]);
      quadStream = new ArrayIterator([
        quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
        quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
      ]);
      bindingsStreamEmpty = new ArrayIterator([]);
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
      it('should test on application/json', () => {
        return expect(actor.test({ handle: <any> { quadStream }, handleMediaType: 'application/json' }))
          .resolves.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test({ handle: <any> { quadStream }, handleMediaType: 'application/n-triples' }))
          .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async () => {
        return expect((await stringifyStream((await actor.run(
          {handle: <any> { bindingsStream }, handleMediaType: 'application/json'})).handle.data))).toEqual(
`[
{"k1":{"value":"v1"}},
{"k2":{"value":"v2"}}
]
`);
      });

      // tslint:disable:max-line-length
      it('should run on a quad stream', async () => {
        return expect((await stringifyStream((await actor.run(
          { handle: <any> { quadStream }, handleMediaType: 'application/json' })).handle.data))).toEqual(
`[
{"subject":{"value":"http://example.org/a"},"predicate":{"value":"http://example.org/b"},"object":{"value":"http://example.org/c"},"graph":{"value":""}},
{"subject":{"value":"http://example.org/a"},"predicate":{"value":"http://example.org/d"},"object":{"value":"http://example.org/e"},"graph":{"value":""}}
]
`);
      });

      it('should run on an empty bindings stream', async () => {
        return expect((await stringifyStream((await actor.run(
          {handle: <any> { bindingsStream: bindingsStreamEmpty }, handleMediaType: 'application/json'})).handle.data)))
          .toEqual(`[]
`);
      });
    });
  });
});
