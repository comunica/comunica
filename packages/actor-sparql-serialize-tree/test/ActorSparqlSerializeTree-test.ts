import {Bindings, BindingsStream} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {ActionContext} from "@comunica/core";
import {namedNode} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {Readable} from "stream";
import {ActorSparqlSerializeTree} from "../lib/ActorSparqlSerializeTree";

const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorSparqlSerializeTree', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorSparqlSerializeTree module', () => {
    it('should be a function', () => {
      expect(ActorSparqlSerializeTree).toBeInstanceOf(Function);
    });

    it('should be a ActorSparqlSerializeTree constructor', () => {
      expect(new (<any> ActorSparqlSerializeTree)({ name: 'actor', bus, mediaTypes: { tree: 1.0 } }))
        .toBeInstanceOf(ActorSparqlSerializeTree);
    });

    it('should not be able to create new ActorSparqlSerializeTree objects without \'new\'', () => {
      expect(() => { (<any> ActorSparqlSerializeTree)(); }).toThrow();
    });
  });

  describe('An ActorSparqlSerializeTree instance', () => {
    let actor: ActorSparqlSerializeTree;
    let bindingsStream: BindingsStream;
    let quadStream;
    let streamError;
    let variables;

    beforeEach(() => {
      actor = new ActorSparqlSerializeTree({ bus, name: 'actor', mediaTypes: { tree: 1.0 } });
      bindingsStream = new ArrayIterator([
        Bindings({ '?k1': namedNode('v1'), '?k2': null }),
        Bindings({ '?k1': null, '?k2': namedNode('v2') }),
      ]);
      quadStream = new ArrayIterator([
        quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
        quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
      ]);
      streamError = new Readable();
      streamError._read = () => streamError.emit('error', new Error('actor sparql serialize tree test error'));
      variables = [ 'k1', 'k2' ];
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: { tree: 1.0 }});
      });
    });

    describe('for serializing', () => {
      it('should test on tree', () => {
        return expect(actor.test({ handle: <any> { type: 'bindings', bindingsStream },
          handleMediaType: 'tree' })).resolves.toBeTruthy();
      });

      it('should not test on tree with a quad stream', () => {
        return expect(actor.test({ handle: <any> { type: 'quads', quadStream },
          handleMediaType: 'tree' }))
          .rejects.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test({ handle: <any> { type: 'bindings', bindingsStream },
          handleMediaType: 'application/n-triples' }))
          .rejects.toBeTruthy();
      });

      it('should not test on unknown types', () => {
        return expect(actor.test(
          { handle: <any> { type: 'unknown' }, handleMediaType: 'tree' }))
          .rejects.toBeTruthy();
      });

      // tslint:disable:no-trailing-whitespace
      it('should run on a bindings stream', async () => {
        return expect((await stringifyStream((await actor.run(
          {handle: <any> { type: 'bindings', bindingsStream, variables },
            handleMediaType: 'tree'})).handle.data))).toEqual(
          `[
  {
    "k2": [
      "v2"
    ],
    "k1": [
      "v1"
    ]
  }
]`);
      });

      it('should run on a bindings stream with a context', async () => {
        const context = ActionContext({
          "@comunica/actor-init-sparql:singularizeVariables": { k1: true, k2: false },
        });
        return expect((await stringifyStream((await actor.run(
          {handle: <any> { type: 'bindings', bindingsStream, variables, context },
            handleMediaType: 'tree'})).handle.data))).toEqual(
          `[
  {
    "k2": [
      "v2"
    ],
    "k1": "v1"
  }
]`);
      });

      it('should emit an error when a bindings stream emits an error', async () => {
        return expect(stringifyStream((await actor.run(
          {handle: <any> { type: 'bindings', bindingsStream: streamError, variables },
            handleMediaType: 'tree'})).handle.data)).rejects
          .toThrow(new Error('actor sparql serialize tree test error'));
      });
    });
  });
});
