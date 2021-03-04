import { PassThrough } from 'stream';
import { Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import type { BindingsStream } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type * as RDF from 'rdf-js';
import { ActorSparqlSerializeSparqlJson } from '..';

const DF = new DataFactory();
const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorSparqlSerializeSparqlJson', () => {
  let bus: any;

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
      return expect(ActorSparqlSerializeSparqlJson.bindingToJsonBindings(DF.namedNode('http://ex.org')))
        .toEqual({ value: 'http://ex.org', type: 'uri' });
    });

    it('should convert default graphs', () => {
      return expect(ActorSparqlSerializeSparqlJson.bindingToJsonBindings(DF.defaultGraph()))
        .toEqual({ value: '', type: 'uri' });
    });

    it('should convert blank nodes', () => {
      return expect(ActorSparqlSerializeSparqlJson.bindingToJsonBindings(DF.blankNode('b1')))
        .toEqual({ value: 'b1', type: 'bnode' });
    });

    it('should convert plain literals', () => {
      return expect(ActorSparqlSerializeSparqlJson.bindingToJsonBindings(DF.literal('abc')))
        .toEqual({ value: 'abc', type: 'literal' });
    });

    it('should convert literals with a language', () => {
      return expect(ActorSparqlSerializeSparqlJson.bindingToJsonBindings(DF.literal('abc', 'en-us')))
        .toEqual({ value: 'abc', type: 'literal', 'xml:lang': 'en-us' });
    });

    it('should convert literals with a datatype', () => {
      return expect(ActorSparqlSerializeSparqlJson.bindingToJsonBindings(DF.literal('abc', DF.namedNode('http://ex'))))
        .toEqual({ value: 'abc', type: 'literal', datatype: 'http://ex' });
    });
  });

  describe('An ActorSparqlSerializeSparqlJson instance', () => {
    let actor: ActorSparqlSerializeSparqlJson;
    let bindingsStream: BindingsStream;
    let bindingsStreamPartial: BindingsStream;
    let bindingsStreamEmpty: BindingsStream;
    let bindingsStreamError: BindingsStream;
    let quadStream: RDF.Stream;
    let variables: string[];

    beforeEach(() => {
      actor = new ActorSparqlSerializeSparqlJson({ bus,
        mediaTypes: {
          'sparql-results+json': 1,
        },
        name: 'actor' });
      bindingsStream = new ArrayIterator([
        Bindings({ '?k1': DF.namedNode('v1') }),
        Bindings({ '?k2': DF.namedNode('v2') }),
      ]);
      bindingsStreamPartial = new ArrayIterator([
        Bindings({ '?k1': DF.namedNode('v1') }),
        Bindings({ '?k2': DF.namedNode('v2') }),
        Bindings({}),
      ]);
      bindingsStreamEmpty = <any> new PassThrough();
      (<any> bindingsStreamEmpty)._read = <any> (() => { bindingsStreamEmpty.emit('end'); });
      bindingsStreamError = <any> new PassThrough();
      (<any> bindingsStreamError)._read = <any> (() => { bindingsStreamError.emit('error', new Error('SpJson')); });
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
          'sparql-results+json': 1,
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

      it('should run on a bindings stream', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { handle: <any> { bindingsStream, type: 'bindings', variables },
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
          { handle: <any> { bindingsStream, type: 'bindings', variables: []},
            handleMediaType: 'json' },
        ))).handle.data)).toEqual(
          `{"head": {},
"results": { "bindings": [
{"k1":{"value":"v1","type":"uri"}},
{"k2":{"value":"v2","type":"uri"}}
]}}
`,
        );
      });

      it('should run on a bindings stream with unbound variables', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { handle: <any> { bindingsStream: bindingsStreamPartial, type: 'bindings', variables: []},
            handleMediaType: 'json' },
        ))).handle.data)).toEqual(
          `{"head": {},
"results": { "bindings": [
{"k1":{"value":"v1","type":"uri"}},
{"k2":{"value":"v2","type":"uri"}},
{}
]}}
`,
        );
      });
    });

    it('should run on an empty bindings stream', async() => {
      expect(await stringifyStream((<any> (await actor.run(
        { handle: <any> { bindingsStream: bindingsStreamEmpty, type: 'bindings', variables },
          handleMediaType: 'json' },
      ))).handle.data)).toEqual(
        `{"head": {"vars":["k1","k2"]},
"results": { "bindings": [] }}
`,
      );
    });

    it('should emit an error on an errorring bindings stream', async() => {
      await expect(stringifyStream((<any> (await actor.run(
        { handle: <any> { bindingsStream: bindingsStreamError, type: 'bindings', variables },
          handleMediaType: 'json' },
      ))).handle.data)).rejects.toBeTruthy();
    });

    it('should run on a boolean result that resolves to true', async() => {
      expect(await stringifyStream((<any> (await actor.run(
        { handle: <any> { type: 'boolean', booleanResult: Promise.resolve(true), variables: []},
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
        { handle: <any> { type: 'boolean', booleanResult: Promise.resolve(false), variables: []},
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
        { handle: <any> { type: 'boolean', booleanResult: Promise.reject(new Error('e')), variables: []},
          handleMediaType: 'simple' },
      ))).handle.data)).rejects.toBeTruthy();
    });
  });
});
