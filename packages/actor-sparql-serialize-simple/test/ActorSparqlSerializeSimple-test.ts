import {Bindings, BindingsStream} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {namedNode} from "rdf-data-model";
import {ActorSparqlSerializeSimple} from "../lib/ActorSparqlSerializeSimple";
const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorSparqlSerializeSimple', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorSparqlSerializeSimple module', () => {
    it('should be a function', () => {
      expect(ActorSparqlSerializeSimple).toBeInstanceOf(Function);
    });

    it('should be a ActorSparqlSerializeSimple constructor', () => {
      expect(new (<any> ActorSparqlSerializeSimple)({ name: 'actor', bus })).toBeInstanceOf(ActorSparqlSerializeSimple);
    });

    it('should not be able to create new ActorSparqlSerializeSimple objects without \'new\'', () => {
      expect(() => { (<any> ActorSparqlSerializeSimple)(); }).toThrow();
    });
  });

  describe('An ActorSparqlSerializeSimple instance', () => {
    let actor: ActorSparqlSerializeSimple;
    let bindingsStream: BindingsStream;
    let quadStream;

    beforeEach(() => {
      actor = new ActorSparqlSerializeSimple({ bus, mediaTypes: {
        simple: 1.0,
      }, name: 'actor' });
      bindingsStream = new ArrayIterator([
        Bindings({ k1: namedNode('v1') }),
        Bindings({ k2: namedNode('v2') }),
      ]);
      quadStream = new ArrayIterator([
        quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
        quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
      ]);
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          simple: 1.0,
        }});
      });
    });

    describe('for serializing', () => {
      it('should test on simple', () => {
        return expect(actor.test({ handle: <any> { quadStream }, handleMediaType: 'simple' })).resolves.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test({ handle: <any> { quadStream }, handleMediaType: 'application/n-triples' }))
          .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async () => {
        return expect((await stringifyStream((await actor.run(
          {handle: <any> { bindingsStream }, handleMediaType: 'simple'})).handle.data))).toEqual(
`k1: v1

k2: v2

`);
      });

      // tslint:disable:no-trailing-whitespace
      it('should run on a quad stream', async () => {
        return expect((await stringifyStream((await actor.run(
          { handle: <any> { quadStream }, handleMediaType: 'simple' })).handle.data))).toEqual(
`subject: http://example.org/a
predicate: http://example.org/b
object: http://example.org/c
graph: 

subject: http://example.org/a
predicate: http://example.org/d
object: http://example.org/e
graph: 

`);
      });
    });
  });
});
