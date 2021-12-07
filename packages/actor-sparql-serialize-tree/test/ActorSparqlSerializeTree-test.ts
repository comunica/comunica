import { Readable } from 'stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import { ActionContext, Bus } from '@comunica/core';
import type { BindingsStream, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorSparqlSerializeTree } from '..';

const DF = new DataFactory();
const BF = new BindingsFactory();
const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorSparqlSerializeTree', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorSparqlSerializeTree module', () => {
    it('should be a function', () => {
      expect(ActorSparqlSerializeTree).toBeInstanceOf(Function);
    });

    it('should be a ActorSparqlSerializeTree constructor', () => {
      expect(new (<any> ActorSparqlSerializeTree)({ name: 'actor', bus, mediaTypes: { tree: 1 }}))
        .toBeInstanceOf(ActorSparqlSerializeTree);
    });

    it('should not be able to create new ActorSparqlSerializeTree objects without \'new\'', () => {
      expect(() => { (<any> ActorSparqlSerializeTree)(); }).toThrow();
    });
  });

  describe('An ActorSparqlSerializeTree instance', () => {
    let actor: ActorSparqlSerializeTree;
    let bindingsStream: BindingsStream;
    let quadStream: RDF.Stream;
    let streamError: Readable;
    let variables: string[];

    beforeEach(() => {
      actor = new ActorSparqlSerializeTree(
        { bus, name: 'actor', mediaTypePriorities: { tree: 1 }, mediaTypeFormats: {}},
      );
      bindingsStream = new ArrayIterator([
        BF.bindings({ '?k1': DF.namedNode('v1') }),
        BF.bindings({ '?k2': DF.namedNode('v2') }),
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
        return expect(actor.test({ mediaTypes: true, context })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: { tree: 1 }});
      });
    });

    describe('for serializing', () => {
      it('should test on tree', () => {
        return expect(actor.test({ handle: <any> { type: 'bindings', bindingsStream, context },
          handleMediaType: 'tree',
          context })).resolves.toBeTruthy();
      });

      it('should not test on tree with a quad stream', () => {
        return expect(actor.test({ handle: <any> { type: 'quads', quadStream, context },
          handleMediaType: 'tree',
          context }))
          .rejects.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test({ handle: <any> { type: 'bindings', bindingsStream, context },
          handleMediaType: 'application/n-triples',
          context }))
          .rejects.toBeTruthy();
      });

      it('should not test on unknown types', () => {
        return expect(actor.test(
          { handle: <any> { type: 'unknown' }, handleMediaType: 'tree', context },
        ))
          .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'bindings', bindingsStream, variables, context },
            handleMediaType: 'tree',
            context },
        ))).handle.data)).toEqual(
          `[
  {
    "k2": [
      "v2"
    ],
    "k1": [
      "v1"
    ]
  }
]`,
        );
      });

      it('should run on a bindings stream with a context', async() => {
        context = new ActionContext({
          '@comunica/actor-init-sparql:singularizeVariables': { k1: true, k2: false },
        });
        expect(await stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'bindings', bindingsStream, variables, context },
            handleMediaType: 'tree',
            context },
        ))).handle.data)).toEqual(
          `[
  {
    "k2": [
      "v2"
    ],
    "k1": "v1"
  }
]`,
        );
      });

      it('should emit an error when a bindings stream emits an error', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'bindings', bindingsStream: streamError, variables, context },
            handleMediaType: 'tree',
            context },
        ))).handle.data)).rejects
          .toThrow(new Error('actor sparql serialize tree test error'));
      });
    });
  });
});
