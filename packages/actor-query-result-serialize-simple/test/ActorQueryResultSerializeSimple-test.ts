import { Readable } from 'stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import { ActionContext, Bus } from '@comunica/core';
import type { BindingsStream, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryResultSerializeSimple } from '../lib/ActorQueryResultSerializeSimple';

const DF = new DataFactory();
const BF = new BindingsFactory();

const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorQueryResultSerializeSimple', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorQueryResultSerializeSimple module', () => {
    it('should be a function', () => {
      expect(ActorQueryResultSerializeSimple).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryResultSerializeSimple constructor', () => {
      expect(new (<any> ActorQueryResultSerializeSimple)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryResultSerializeSimple);
    });

    it('should not be able to create new ActorQueryResultSerializeSimple objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryResultSerializeSimple)(); }).toThrow();
    });
  });

  describe('An ActorQueryResultSerializeSimple instance', () => {
    let actor: ActorQueryResultSerializeSimple;
    let bindingsStream: BindingsStream;
    let quadStream: RDF.Stream;
    let streamError: Readable;

    beforeEach(() => {
      actor = new ActorQueryResultSerializeSimple({ bus,
        mediaTypePriorities: {
          simple: 1,
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
      streamError._read = () => streamError.emit('error', new Error('SparqlSimple'));
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true, context })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          simple: 1,
        }});
      });
    });

    describe('for serializing', () => {
      it('should test on simple quads', () => {
        return expect(actor.test({
          handle: <any> { type: 'quads', quadStream, context },
          handleMediaType: 'simple',
          context,
        }))
          .resolves.toBeTruthy();
      });

      it('should test on simple bindings', () => {
        return expect(actor.test({
          handle: <any> { type: 'bindings', bindingsStream, context },
          handleMediaType: 'simple',
          context,
        }))
          .resolves.toBeTruthy();
      });

      it('should test on simple booleans', () => {
        return expect(actor.test({ handle: <any> { type: 'boolean', execute: () => Promise.resolve(true), context },
          handleMediaType: 'simple',
          context }))
          .resolves.toBeTruthy();
      });

      it('should test on simple update', () => {
        return expect(actor.test({ handle: <any> { type: 'void', execute: () => Promise.resolve(true), context },
          handleMediaType: 'simple',
          context }))
          .resolves.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test({
          handle: <any> { type: 'quads', quadStream, context },
          handleMediaType: 'application/n-triples',
          context,
        }))
          .rejects.toBeTruthy();
      });

      it('should not test on unknown types', () => {
        return expect(actor.test(
          { handle: <any> { type: 'unknown', context }, handleMediaType: 'simple', context },
        ))
          .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'bindings', bindingsStream, context }, handleMediaType: 'simple', context },
        ))).handle.data)).toEqual(
          `?k1: v1

?k2: v2

`,
        );
      });

      it('should run on a quad stream', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'quads', quadStream, context }, handleMediaType: 'simple', context },
        ))).handle.data)).toEqual(
          `subject: http://example.org/a
predicate: http://example.org/b
object: http://example.org/c
graph: 

subject: http://example.org/a
predicate: http://example.org/d
object: http://example.org/e
graph: 

`,
        );
      });

      it('should run on a boolean result that resolves to true', async() => {
        expect(await stringifyStream((<any> (await actor.run({
          handle: <any> { type: 'boolean', execute: () => Promise.resolve(true), context },
          handleMediaType: 'simple',
          context,
        })))
          .handle.data)).toEqual(
          `true
`,
        );
      });

      it('should run on a boolean result that resolves to false', async() => {
        expect(await stringifyStream((<any> (await actor.run({
          handle: <any> { type: 'boolean', execute: () => Promise.resolve(false), context },
          handleMediaType: 'simple',
          context,
        })))
          .handle.data)).toEqual(
          `false
`,
        );
      });

      it('should run on an update result that resolves to false', async() => {
        expect(await stringifyStream((<any> (await actor.run({
          handle: <any> { type: 'void', execute: () => Promise.resolve(), context },
          handleMediaType: 'simple',
          context,
        })))
          .handle.data)).toEqual(
          `ok
`,
        );
      });

      it('should emit an error when a bindings stream emits an error', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'bindings', bindingsStream: streamError, context },
            handleMediaType: 'application/json',
            context },
        ))).handle.data)).rejects.toBeTruthy();
      });

      it('should emit an error when a quad stream emits an error', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'quads', quadStream: streamError, context },
            handleMediaType: 'application/json',
            context },
        ))).handle.data)).rejects.toBeTruthy();
      });

      it('should emit an error when the boolean is rejected', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'boolean', execute: () => Promise.reject(new Error('SparqlSimple')), context },
            handleMediaType: 'application/json',
            context },
        ))).handle.data)).rejects.toBeTruthy();
      });

      it('should emit an error when the update is rejected', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'void', execute: () => Promise.reject(new Error('SparqlSimple')), context },
            handleMediaType: 'application/json',
            context },
        ))).handle.data)).rejects.toBeTruthy();
      });
    });
  });
});
