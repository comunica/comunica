import { Readable } from 'node:stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import type { ActorHttpInvalidateListenable, IInvalidateListener } from '@comunica/bus-http-invalidate';
import { ActionContext, Bus } from '@comunica/core';
import type { BindingsStream, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActionObserverHttp, ActorQueryResultSerializeStats } from '..';

const DF = new DataFactory();
const BF = new BindingsFactory();
const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorQueryResultSerializeStats', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorQueryResultSerializeStats module', () => {
    it('should be a function', () => {
      expect(ActorQueryResultSerializeStats).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryResultSerializeStats constructor', () => {
      expect(new (<any> ActorQueryResultSerializeStats)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryResultSerializeStats);
    });

    it('should not be able to create new ActorQueryResultSerializeStats objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryResultSerializeStats)();
      }).toThrow(`Class constructor ActorQueryResultSerializeStats cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryResultSerializeStats instance', () => {
    let httpObserver: ActionObserverHttp;
    let actor: ActorQueryResultSerializeStats;
    let bindingsStream: () => BindingsStream;
    let quadStream: () => RDF.Stream & AsyncIterator<RDF.Quad>;
    let streamError: Readable;
    let httpInvalidator: ActorHttpInvalidateListenable;
    let lastListener: IInvalidateListener;

    beforeEach(() => {
      httpInvalidator = <any> {
        addInvalidateListener: jest.fn((listener: IInvalidateListener) => {
          lastListener = listener;
        }),
      };
      httpObserver = new ActionObserverHttp({
        name: 'observer',
        bus,
        httpInvalidator,
      });
      actor = new ActorQueryResultSerializeStats({
        bus,
        mediaTypePriorities: {
          debug: 1,
        },
        mediaTypeFormats: {},
        name: 'actor',
        httpObserver,
      });

      bindingsStream = () => new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('k1'), DF.namedNode('v1') ],
        ]),
        BF.bindings([
          [ DF.variable('k2'), DF.namedNode('v2') ],
        ]),
      ]);
      quadStream = () => new ArrayIterator([
        quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
        quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
      ]);
      streamError = new Readable();
      streamError._read = () => streamError.emit('error', new Error('SparqlSerializeStats'));
    });
    describe('for getting media types', () => {
      it('should test', async() => {
        await expect(actor.test({ mediaTypes: true, context })).resolves.toBeTruthy();
      });

      it('should run', async() => {
        await expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          debug: 1,
        }});
      });
    });

    describe('for calculating delay', () => {
      it('should return number greater than 0', () => {
        expect(actor.delay(actor.now())).toBeGreaterThan(0);
      });
    });

    describe('for serializing', () => {
      beforeEach(() => {
        actor.delay = () => 3.14;
      });

      it('should test on table', async() => {
        const stream = quadStream();
        await expect(actor.test({
          handle: <any> { type: 'quads', quadStream: stream },
          handleMediaType: 'debug',
          context,
        })).resolves.toBeTruthy();
        stream.destroy();
      });

      it('should not test on N-Triples', async() => {
        const stream = quadStream();
        await expect(actor.test({
          handle: <any> { type: 'quads', quadStream: stream },
          handleMediaType: 'application/n-triples',
          context,
        }))
          .rejects.toBeTruthy();
        stream.destroy();
      });

      it('should not test on unknown types', async() => {
        await expect(actor.test(
          { handle: <any> { type: 'unknown' }, handleMediaType: 'debug', context },
        ))
          .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'bindings', bindingsStream: bindingsStream() }, handleMediaType: 'debug', context },
        )
        )).handle.data)).resolves.toBe(
          `Result,Delay (ms),HTTP requests
1,3.14,0
2,3.14,0
TOTAL,3.14,0
`,
        );
      });

      it('should run on a bindings stream with http requests', async() => {
        (<any> httpObserver).onRun(null, null, null);
        (<any> httpObserver).onRun(null, null, null);
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'bindings', bindingsStream: bindingsStream() }, handleMediaType: 'debug', context },
        )
        )).handle.data)).resolves.toBe(
          `Result,Delay (ms),HTTP requests
1,3.14,2
2,3.14,2
TOTAL,3.14,2
`,
        );
      });

      it('should run on a bindings stream with http requests and cache invalidations', async() => {
        (<any> httpObserver).onRun(null, null, null);
        (<any> httpObserver).onRun(null, null, null);
        lastListener(<any> {});
        (<any> httpObserver).onRun(null, null, null);
        (<any> httpObserver).onRun(null, null, null);
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'bindings', bindingsStream: bindingsStream() }, handleMediaType: 'debug', context },
        )
        )).handle.data)).resolves.toBe(
          `Result,Delay (ms),HTTP requests
1,3.14,2
2,3.14,2
TOTAL,3.14,2
`,
        );
      });

      it('should run on a quad stream', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'quads', quadStream: quadStream() }, handleMediaType: 'debug', context },
        ))).handle.data)).resolves.toBe(
          `Result,Delay (ms),HTTP requests
1,3.14,0
2,3.14,0
TOTAL,3.14,0
`,
        );
      });

      it('should emit an error when a bindings stream emits an error', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          {
            handle: <any> { type: 'bindings', bindingsStream: streamError },
            handleMediaType: 'application/json',
            context,
          },
        ))).handle.data)).rejects.toBeTruthy();
      });

      it('should emit an error when a quad stream emits an error', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> { type: 'quads', quadStream: streamError }, handleMediaType: 'application/json', context },
        ))).handle.data)).rejects.toBeTruthy();
      });
    });
  });
});
