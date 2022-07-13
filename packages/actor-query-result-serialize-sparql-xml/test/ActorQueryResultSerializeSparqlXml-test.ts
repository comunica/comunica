import { PassThrough } from 'stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import { ActionContext, Bus } from '@comunica/core';
import type { BindingsStream, IActionContext, MetadataBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryResultSerializeSparqlXml } from '../lib/ActorQueryResultSerializeSparqlXml';

const DF = new DataFactory();
const BF = new BindingsFactory();

const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorQueryResultSerializeSparqlXml', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorQueryResultSerializeSparqlXml module', () => {
    it('should be a function', () => {
      expect(ActorQueryResultSerializeSparqlXml).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryResultSerializeSparqlXml constructor', () => {
      expect(new (<any> ActorQueryResultSerializeSparqlXml)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryResultSerializeSparqlXml);
    });

    it('should not be able to create new ActorQueryResultSerializeSparqlXml objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryResultSerializeSparqlXml)(); }).toThrow();
    });
  });

  describe('#bindingToXmlBindings', () => {
    it('should convert named nodes', () => {
      return expect(ActorQueryResultSerializeSparqlXml
        .bindingToXmlBindings(DF.namedNode('http://ex.org'), DF.variable('k')))
        .toEqual({
          name: 'binding',
          attributes: { name: 'k' },
          children: [{ name: 'uri', children: 'http://ex.org' }],
        });
    });

    it('should convert default graphs', () => {
      return expect(ActorQueryResultSerializeSparqlXml.bindingToXmlBindings(DF.defaultGraph(), DF.variable('k')))
        .toEqual({
          name: 'binding',
          attributes: { name: 'k' },
          children: [{ name: 'uri', children: '' }],
        });
    });

    it('should convert blank nodes', () => {
      return expect(ActorQueryResultSerializeSparqlXml.bindingToXmlBindings(DF.blankNode('b1'), DF.variable('k')))
        .toEqual({
          name: 'binding',
          attributes: { name: 'k' },
          children: [{ name: 'bnode', children: 'b1' }],
        });
    });

    it('should convert plain literals', () => {
      return expect(ActorQueryResultSerializeSparqlXml.bindingToXmlBindings(DF.literal('abc'), DF.variable('k')))
        .toEqual({
          name: 'binding',
          attributes: { name: 'k' },
          children: [{ name: 'literal', attributes: {}, children: 'abc' }],
        });
    });

    it('should convert literals with a language', () => {
      return expect(ActorQueryResultSerializeSparqlXml
        .bindingToXmlBindings(DF.literal('abc', 'en-us'), DF.variable('k')))
        .toEqual({
          name: 'binding',
          attributes: { name: 'k' },
          children: [{ name: 'literal', attributes: { 'xml:lang': 'en-us' }, children: 'abc' }],
        });
    });

    it('should convert literals with a datatype', () => {
      return expect(ActorQueryResultSerializeSparqlXml
        .bindingToXmlBindings(DF.literal('abc', DF.namedNode('http://ex')), DF.variable('k')))
        .toEqual({
          name: 'binding',
          attributes: { name: 'k' },
          children: [{ name: 'literal', attributes: { datatype: 'http://ex' }, children: 'abc' }],
        });
    });
  });

  describe('An ActorQueryResultSerializeSparqlXml instance', () => {
    let actor: ActorQueryResultSerializeSparqlXml;
    let bindingsStream: BindingsStream;
    let bindingsStreamPartial: BindingsStream;
    let bindingsStreamError: BindingsStream;
    let quadStream: RDF.Stream;
    let metadata: MetadataBindings;

    beforeEach(() => {
      actor = new ActorQueryResultSerializeSparqlXml({ bus,
        mediaTypePriorities: {
          'sparql-results+xml': 1,
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
      ], { autoStart: false });
      bindingsStreamPartial = new ArrayIterator([
        BF.bindings([
          [ DF.variable('k1'), DF.namedNode('v1') ],
        ]),
        BF.bindings([
          [ DF.variable('k2'), DF.namedNode('v2') ],
        ]),
        BF.bindings(),
      ], { autoStart: false });
      bindingsStreamError = <any> new PassThrough();
      (<any> bindingsStreamError)._read = <any> (() => { bindingsStreamError.emit('error', new Error('SpXml')); });
      quadStream = new ArrayIterator([
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
          'sparql-results+xml': 1,
        }});
      });
    });

    describe('for serializing', () => {
      it('should not test on quad streams', () => {
        return expect(actor.test(
          { context, handle: <any> { type: 'quads', quadStream }, handleMediaType: 'sparql-results+xml' },
        ))
          .rejects.toBeTruthy();
      });

      it('should test on sparql-results+xml bindings', () => {
        return expect(actor.test(
          { context, handle: <any> { type: 'bindings', bindingsStream }, handleMediaType: 'sparql-results+xml' },
        ))
          .resolves.toBeTruthy();
      });

      it('should test on sparql-results+xml booleans', () => {
        return expect(actor.test(
          { context,
            handle: <any> { type: 'boolean', execute: () => Promise.resolve(true) },
            handleMediaType: 'sparql-results+xml' },
        ))
          .resolves.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test(
          { context, handle: <any> { type: 'bindings', bindingsStream }, handleMediaType: 'application/n-triples' },
        ))
          .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async() => {
        expect(await stringifyStream((<any> (await actor.run({
          context,
          handle: <any> { type: 'bindings', bindingsStream, metadata: async() => metadata },
          handleMediaType: 'xml',
        })))
          .handle.data)).toEqual(
          `<?xml version="1.0" encoding="UTF-8"?>
<sparql xmlns="http://www.w3.org/2005/sparql-results#">
  <head>
    <variable name="k1"/>
    <variable name="k2"/>
  </head>
  <results>
    <result>
      <binding name="k1">
        <uri>v1</uri>
      </binding>
    </result>
    <result>
      <binding name="k2">
        <uri>v2</uri>
      </binding>
    </result>
  </results>
</sparql>
`,
        );
      });

      it('should run on a bindings stream without variables', async() => {
        expect(await stringifyStream((<any> (await actor.run({
          context,
          handle: <any> { type: 'bindings', bindingsStream, metadata: async() => ({ variables: []}) },
          handleMediaType: 'xml',
        })))
          .handle.data)).toEqual(
          `<?xml version="1.0" encoding="UTF-8"?>
<sparql xmlns="http://www.w3.org/2005/sparql-results#">
  <head>
  </head>
  <results>
    <result>
      <binding name="k1">
        <uri>v1</uri>
      </binding>
    </result>
    <result>
      <binding name="k2">
        <uri>v2</uri>
      </binding>
    </result>
  </results>
</sparql>
`,
        );
      });

      it('should run on a bindings stream with unbound variables', async() => {
        expect(await stringifyStream((<any> (await actor.run({
          context,
          handle: <any> {
            type: 'bindings',
            bindingsStream: bindingsStreamPartial,
            metadata: async() => ({ variables: []}),
          },
          handleMediaType: 'xml',
        })))
          .handle.data)).toEqual(
          `<?xml version="1.0" encoding="UTF-8"?>
<sparql xmlns="http://www.w3.org/2005/sparql-results#">
  <head>
  </head>
  <results>
    <result>
      <binding name="k1">
        <uri>v1</uri>
      </binding>
    </result>
    <result>
      <binding name="k2">
        <uri>v2</uri>
      </binding>
    </result>
    <result>
    </result>
  </results>
</sparql>
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

      it('should run on a boolean result that resolves to true', async() => {
        expect(await stringifyStream((<any> (await actor.run({
          context,
          handle: <any> {
            type: 'boolean',
            execute: () => Promise.resolve(true),
            metadata: async() => ({ variables: []}),
          },
          handleMediaType: 'simple',
        }))).handle.data)).toEqual(
          `<?xml version="1.0" encoding="UTF-8"?>
<sparql xmlns="http://www.w3.org/2005/sparql-results#">
  <head>
  </head>
  <boolean>true</boolean>
</sparql>
`,
        );
      });

      it('should run on a boolean result that resolves to false', async() => {
        expect(await stringifyStream((<any> (await actor.run({
          context,
          handle: <any> {
            type: 'boolean',
            execute: () => Promise.resolve(false),
            metadata: async() => ({ variables: []}),
          },
          handleMediaType: 'simple',
        }))).handle.data)).toEqual(
          `<?xml version="1.0" encoding="UTF-8"?>
<sparql xmlns="http://www.w3.org/2005/sparql-results#">
  <head>
  </head>
  <boolean>false</boolean>
</sparql>
`,
        );
      });

      it('should emit an error on a boolean result that rejects', async() => {
        await expect(stringifyStream((<any> (await actor.run({
          context,
          handle: <any> {
            type: 'boolean',
            execute: () => Promise.reject(new Error('e')),
            metadata: async() => ({ variables: []}),
          },
          handleMediaType: 'simple',
        }))).handle.data)).rejects.toBeTruthy();
      });
    });
  });
});
