import { Readable } from 'node:stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { BindingsStream, IActionContext } from '@comunica/types';
import { stringify as stringifyStream } from '@jeswr/stream-to-string';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryResultSerializeTree, bindingsStreamToGraphQl } from '..';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const quad = require('rdf-quad');

describe('ActorQueryResultSerializeTree', () => {
  let bus: any;
  let context: IActionContext;
  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The bindingsStreamToGraphQl function', () => {
    it('should be a function', () => {
      expect(bindingsStreamToGraphQl).toBeInstanceOf(Function);
    });
  });

  describe('The ActorQueryResultSerializeTree module', () => {
    it('should be a function', () => {
      expect(ActorQueryResultSerializeTree).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryResultSerializeTree constructor', () => {
      expect(new (<any> ActorQueryResultSerializeTree)({ name: 'actor', bus, mediaTypes: { tree: 1 }}))
        .toBeInstanceOf(ActorQueryResultSerializeTree);
    });

    it('should not be able to create new ActorQueryResultSerializeTree objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryResultSerializeTree)();
      }).toThrow(`Class constructor ActorQueryResultSerializeTree cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryResultSerializeTree instance', () => {
    let actor: ActorQueryResultSerializeTree;
    let bindingsStream: () => BindingsStream;
    let quadStream: () => RDF.Stream & AsyncIterator<RDF.Quad>;
    let streamError: Readable;
    let variables: RDF.Variable[];

    beforeEach(() => {
      actor = new ActorQueryResultSerializeTree(
        { bus, name: 'actor', mediaTypePriorities: { tree: 1 }, mediaTypeFormats: {}},
      );
      bindingsStream = () => new ArrayIterator<RDF.Bindings>([
        BF.bindings([[ DF.variable('k1'), DF.literal('v1') ]]),
        BF.bindings([[ DF.variable('k2'), DF.literal('v2') ]]),
      ]);
      quadStream = () => new ArrayIterator([
        quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
        quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
      ]);
      streamError = new Readable();
      streamError._read = () => {
        setTimeout(() => streamError.emit('error', new Error('actor sparql serialize tree test error')));
      };
      variables = [ DF.variable('k1'), DF.variable('k2') ];
    });

    describe('for getting media types', () => {
      it('should test', async() => {
        await expect(actor.test({ mediaTypes: true, context })).resolves.toBeTruthy();
      });

      it('should run', async() => {
        await expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: { tree: 1 }});
      });
    });

    describe('for serializing', () => {
      it('should test on tree', async() => {
        const stream = bindingsStream();
        await expect(actor.test({
          handle: <any> { type: 'bindings', bindingsStream: stream, context },
          handleMediaType: 'tree',
          context,
        })).resolves.toBeTruthy();

        stream.destroy();
      });

      it('should not test on tree with a quad stream', async() => {
        const stream = quadStream();
        await expect(actor.test({
          handle: <any> { type: 'quads', quadStream: stream, context },
          handleMediaType: 'tree',
          context,
        }))
          .rejects.toBeTruthy();

        stream.destroy();
      });

      it('should not test on N-Triples', async() => {
        const stream = bindingsStream();
        await expect(actor.test({
          handle: <any> { type: 'bindings', bindingsStream: stream, context },
          handleMediaType: 'application/n-triples',
          context,
        }))
          .rejects.toBeTruthy();

        stream.destroy();
      });

      it('should not test on unknown types', async() => {
        await expect(actor.test(
          { handle: <any> { type: 'unknown' }, handleMediaType: 'tree', context },
        ))
          .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          {
            handle: <any> { type: 'bindings', bindingsStream: bindingsStream(), variables, context },
            handleMediaType: 'tree',
            context,
          },
        ))).handle.data)).resolves.toBe(
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

      it('should run on a bindings stream when #_read() is called excessively in advance', async() => {
        const data = (<any> (await actor.run(
          {
            handle: <any> { type: 'bindings', bindingsStream: bindingsStream(), variables, context },
            handleMediaType: 'tree',
            context,
          },
        ))).handle.data;
        data._read();
        data._read(10);
        data._read();
        await new Promise(resolve => setTimeout(resolve, 10));
        await expect(stringifyStream(data)).resolves.toBe(
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
          [KeysInitQuery.graphqlSingularizeVariables.name]: { k1: true, k2: false },
        });
        await expect(stringifyStream((<any> (await actor.run(
          {
            handle: <any> { type: 'bindings', bindingsStream: bindingsStream(), variables, context },
            handleMediaType: 'tree',
            context,
          },
        ))).handle.data)).resolves.toBe(
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
          {
            handle: <any> { type: 'bindings', bindingsStream: streamError, variables, context },
            handleMediaType: 'tree',
            context,
          },
        ))).handle.data)).rejects
          .toThrow(new Error('actor sparql serialize tree test error'));
      });
    });
  });
});
