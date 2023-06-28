import { PassThrough } from 'stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import type { ActorHttpInvalidateListenable, IInvalidateListener } from '@comunica/bus-http-invalidate';
import { ActionContext, Bus } from '@comunica/core';
import type { BindingsStream, IActionContext, MetadataBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActionObserverHttp, ActorQueryResultSerializeSparqlJson } from '..';

const DF = new DataFactory();
const BF = new BindingsFactory();
const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorQueryResultSerializeSparqlJson', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorQueryResultSerializeSparqlJson module', () => {
    it('should be a function', () => {
      expect(ActorQueryResultSerializeSparqlJson).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryResultSerializeSparqlJson constructor', () => {
      expect(new (<any> ActorQueryResultSerializeSparqlJson)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryResultSerializeSparqlJson);
    });

    it('should not be able to create new ActorQueryResultSerializeSparqlJson objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryResultSerializeSparqlJson)(); }).toThrow();
    });
  });

  describe('#bindingToJsonBindings', () => {
    it('should convert named nodes', () => {
      return expect(ActorQueryResultSerializeSparqlJson.bindingToJsonBindings(DF.namedNode('http://ex.org')))
        .toEqual({ value: 'http://ex.org', type: 'uri' });
    });

    it('should convert default graphs', () => {
      return expect(ActorQueryResultSerializeSparqlJson.bindingToJsonBindings(DF.defaultGraph()))
        .toEqual({ value: '', type: 'uri' });
    });

    it('should convert blank nodes', () => {
      return expect(ActorQueryResultSerializeSparqlJson.bindingToJsonBindings(DF.blankNode('b1')))
        .toEqual({ value: 'b1', type: 'bnode' });
    });

    it('should convert plain literals', () => {
      return expect(ActorQueryResultSerializeSparqlJson.bindingToJsonBindings(DF.literal('abc')))
        .toEqual({ value: 'abc', type: 'literal' });
    });

    it('should convert literals with a language', () => {
      return expect(ActorQueryResultSerializeSparqlJson.bindingToJsonBindings(DF.literal('abc', 'en-us')))
        .toEqual({ value: 'abc', type: 'literal', 'xml:lang': 'en-us' });
    });

    it('should convert literals with a datatype', () => {
      return expect(ActorQueryResultSerializeSparqlJson
        .bindingToJsonBindings(DF.literal('abc', DF.namedNode('http://ex'))))
        .toEqual({ value: 'abc', type: 'literal', datatype: 'http://ex' });
    });

    it('should convert quoted triples', () => {
      return expect(ActorQueryResultSerializeSparqlJson
        .bindingToJsonBindings(DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o'))))
        .toEqual({
          type: 'triple',
          value: {
            object: {
              type: 'uri',
              value: 'ex:o',
            },
            predicate: {
              type: 'uri',
              value: 'ex:p',
            },
            subject: {
              type: 'uri',
              value: 'ex:s',
            },
          },
        });
    });
  });

  describe('An ActorQueryResultSerializeSparqlJson instance', () => {
    let httpObserver: ActionObserverHttp;
    let actor: ActorQueryResultSerializeSparqlJson;
    let bindingsStream: () => BindingsStream;
    let bindingsStreamPartial: () => BindingsStream;
    let bindingsStreamEmpty: BindingsStream;
    let bindingsStreamError: BindingsStream;
    let bindingsStreamQuoted: () => BindingsStream;
    let quadStream: () => RDF.Stream & AsyncIterator<RDF.Quad>;
    let metadata: MetadataBindings;
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
      actor = new ActorQueryResultSerializeSparqlJson({
        bus,
        mediaTypePriorities: {
          'sparql-results+json': 1,
        },
        mediaTypeFormats: {},
        name: 'actor',
        emitMetadata: true,
        httpObserver,
      });
      bindingsStream = () => new ArrayIterator([
        BF.bindings([
          [ DF.variable('k1'), DF.namedNode('v1') ],
        ]),
        BF.bindings([
          [ DF.variable('k2'), DF.namedNode('v2') ],
        ]),
      ]);
      bindingsStreamPartial = () => new ArrayIterator([
        BF.bindings([
          [ DF.variable('k1'), DF.namedNode('v1') ],
        ]),
        BF.bindings([
          [ DF.variable('k2'), DF.namedNode('v2') ],
        ]),
        BF.bindings(),
      ]);
      bindingsStreamEmpty = <any> new PassThrough();
      (<any> bindingsStreamEmpty)._read = <any> (() => { bindingsStreamEmpty.emit('end'); });
      bindingsStreamError = <any> new PassThrough();
      (<any> bindingsStreamError)._read = <any> (() => { bindingsStreamError.emit('error', new Error('SpJson')); });
      bindingsStreamQuoted = () => new ArrayIterator([
        BF.bindings([
          [ DF.variable('k1'), DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')) ],
        ]),
        BF.bindings([
          [ DF.variable('k2'), DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')) ],
        ]),
      ], { autoStart: false });
      quadStream = () => new ArrayIterator([
        quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
        quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
      ]);
      metadata = <any> { variables: [ DF.variable('k1'), DF.variable('k2') ]};
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ context, mediaTypes: true })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ context, mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'sparql-results+json': 1,
        }});
      });
    });

    describe('for serializing', () => {
      it('should not test on quad streams', () => {
        return expect(actor.test({ context,
          handle: <any> { quadStream, type: 'quads' },
          handleMediaType: 'sparql-results+json' }))
          .rejects.toBeTruthy();
      });

      it('should test on sparql-results+json bindings', () => {
        return expect(actor.test({ context,
          handle: <any> { bindingsStream, type: 'bindings' },
          handleMediaType: 'sparql-results+json' }))
          .resolves.toBeTruthy();
      });

      it('should test on sparql-results+json booleans', () => {
        return expect(actor.test({ context,
          handle: <any> { execute: () => Promise.resolve(true), type: 'boolean' },
          handleMediaType: 'sparql-results+json' }))
          .resolves.toBeTruthy();
      });

      it('should not test on N-Triples', async() => {
        const stream = bindingsStream();
        await expect(actor.test({ context,
          handle: <any> { bindingsStream: stream, type: 'bindings' },
          handleMediaType: 'application/n-triples' }))
          .rejects.toBeTruthy();

        stream.destroy();
      });

      it('should run on a bindings stream', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { context,
            handle: <any> { bindingsStream: bindingsStream(), type: 'bindings', metadata: async() => metadata },
            handleMediaType: 'json' },
        ))).handle.data)).toEqual(
          `{"head": {"vars":["k1","k2"]},
"results": { "bindings": [
{"k1":{"value":"v1","type":"uri"}},
{"k2":{"value":"v2","type":"uri"}}
]},
"metadata": { "httpRequests": 0 }}
`,
        );
      });

      it('should run on a bindings stream with http requests', async() => {
        (<any> httpObserver).onRun(null, null, null);
        (<any> httpObserver).onRun(null, null, null);
        expect(await stringifyStream((<any> (await actor.run(
          { context,
            handle: <any> { bindingsStream: bindingsStream(), type: 'bindings', metadata: async() => metadata },
            handleMediaType: 'json' },
        ))).handle.data)).toEqual(
          `{"head": {"vars":["k1","k2"]},
"results": { "bindings": [
{"k1":{"value":"v1","type":"uri"}},
{"k2":{"value":"v2","type":"uri"}}
]},
"metadata": { "httpRequests": 2 }}
`,
        );
      });

      it('should run on a bindings stream with http requests and cache invalidations', async() => {
        (<any> httpObserver).onRun(null, null, null);
        (<any> httpObserver).onRun(null, null, null);
        lastListener(<any> {});
        (<any> httpObserver).onRun(null, null, null);
        (<any> httpObserver).onRun(null, null, null);
        expect(await stringifyStream((<any> (await actor.run(
          { context,
            handle: <any> { bindingsStream: bindingsStream(), type: 'bindings', metadata: async() => metadata },
            handleMediaType: 'json' },
        ))).handle.data)).toEqual(
          `{"head": {"vars":["k1","k2"]},
"results": { "bindings": [
{"k1":{"value":"v1","type":"uri"}},
{"k2":{"value":"v2","type":"uri"}}
]},
"metadata": { "httpRequests": 2 }}
`,
        );
      });

      it('should run on a bindings stream without metadata', async() => {
        actor = new ActorQueryResultSerializeSparqlJson({
          bus,
          mediaTypePriorities: {
            'sparql-results+json': 1,
          },
          mediaTypeFormats: {},
          name: 'actor',
          emitMetadata: false,
          httpObserver,
        });
        expect(await stringifyStream((<any> (await actor.run(
          { context,
            handle: <any> { bindingsStream: bindingsStream(), type: 'bindings', metadata: async() => metadata },
            handleMediaType: 'json' },
        ))).handle.data)).toEqual(
          `{"head": {"vars":["k1","k2"]},
"results": { "bindings": [
{"k1":{"value":"v1","type":"uri"}},
{"k2":{"value":"v2","type":"uri"}}
]}}
`,
        );
      });

      it('should run on a bindings stream without variables', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { context,
            handle: <any> {
              bindingsStream: bindingsStream(),
              type: 'bindings',
              metadata: async() => ({ variables: []}),
            },
            handleMediaType: 'json' },
        ))).handle.data)).toEqual(
          `{"head": {},
"results": { "bindings": [
{"k1":{"value":"v1","type":"uri"}},
{"k2":{"value":"v2","type":"uri"}}
]},
"metadata": { "httpRequests": 0 }}
`,
        );
      });

      it('should run on a bindings stream with unbound variables', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { context,
            handle: <any> {
              bindingsStream: bindingsStreamPartial(),
              type: 'bindings',
              metadata: async() => ({ variables: []}),
            },
            handleMediaType: 'json' },
        ))).handle.data)).toEqual(
          `{"head": {},
"results": { "bindings": [
{"k1":{"value":"v1","type":"uri"}},
{"k2":{"value":"v2","type":"uri"}},
{}
]},
"metadata": { "httpRequests": 0 }}
`,
        );
      });
    });

    it('should run on an empty bindings stream', async() => {
      expect(await stringifyStream((<any> (await actor.run(
        { context,
          handle: <any> { bindingsStream: bindingsStreamEmpty, type: 'bindings', metadata: async() => metadata },
          handleMediaType: 'json' },
      ))).handle.data)).toEqual(
        `{"head": {"vars":["k1","k2"]},
"results": { "bindings": [

]},
"metadata": { "httpRequests": 0 }}
`,
      );
    });

    it('should emit an error on an errorring bindings stream', async() => {
      await expect(stringifyStream((<any> (await actor.run(
        { context,
          handle: <any> { bindingsStream: bindingsStreamError, type: 'bindings', metadata: async() => metadata },
          handleMediaType: 'json' },
      ))).handle.data)).rejects.toBeTruthy();
    });

    it('should run on a bindings stream with quoted triples', async() => {
      expect(await stringifyStream((<any> (await actor.run(
        { context,
          handle: <any> { bindingsStream: bindingsStreamQuoted(), type: 'bindings', metadata: async() => metadata },
          handleMediaType: 'json' },
      ))).handle.data)).toEqual(
        `{"head": {"vars":["k1","k2"]},
"results": { "bindings": [
{"k1":{"value":{"subject":{"value":"s1","type":"uri"},"predicate":{"value":"p1","type":"uri"},"object":{"value":"o1","type":"uri"}},"type":"triple"}},
{"k2":{"value":{"subject":{"value":"s2","type":"uri"},"predicate":{"value":"p2","type":"uri"},"object":{"value":"o2","type":"uri"}},"type":"triple"}}
]},
"metadata": { "httpRequests": 0 }}
`,
      );
    });

    it('should run on a boolean result that resolves to true', async() => {
      expect(await stringifyStream((<any> (await actor.run(
        { context,
          handle: <any> {
            type: 'boolean',
            execute: () => Promise.resolve(true),
            metadata: async() => ({ variables: []}),
          },
          handleMediaType: 'simple' },
      ))).handle.data)).toEqual(
        `{"head": {},
"boolean":true
}
`,
      );
    });

    it('should run on a boolean result that resolves to false', async() => {
      expect(await stringifyStream((<any> (await actor.run(
        { context,
          handle: <any> { type: 'boolean', execute: () => Promise.resolve(false), variables: []},
          handleMediaType: 'simple' },
      ))).handle.data)).toEqual(
        `{"head": {},
"boolean":false
}
`,
      );
    });

    it('should emit an error on a boolean result that rejects', async() => {
      await expect(stringifyStream((<any> (await actor.run(
        { context,
          handle: <any> { type: 'boolean', execute: () => Promise.reject(new Error('e')), variables: []},
          handleMediaType: 'simple' },
      ))).handle.data)).rejects.toBeTruthy();
    });
  });
});
