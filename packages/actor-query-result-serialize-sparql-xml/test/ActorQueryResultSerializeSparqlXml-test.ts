import { PassThrough } from 'node:stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import { ActionContext, Bus } from '@comunica/core';
import type { BindingsStream, IActionContext, MetadataBindings } from '@comunica/types';
import { stringify as stringifyStream } from '@jeswr/stream-to-string';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryResultSerializeSparqlXml } from '../lib/ActorQueryResultSerializeSparqlXml';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

const quad = require('rdf-quad');

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
      expect(() => {
        (<any> ActorQueryResultSerializeSparqlXml)();
      }).toThrow(`Class constructor ActorQueryResultSerializeSparqlXml cannot be invoked without 'new'`);
    });
  });

  describe('#bindingToXmlBindings', () => {
    it('should convert named nodes', () => {
      expect(ActorQueryResultSerializeSparqlXml
        .bindingToXmlBindings(DF.namedNode('http://ex.org'), DF.variable('k')))
        .toEqual({
          name: 'binding',
          attributes: { name: 'k' },
          children: [{ name: 'uri', children: 'http://ex.org' }],
        });
    });

    it('should convert default graphs', () => {
      expect(ActorQueryResultSerializeSparqlXml.bindingToXmlBindings(DF.defaultGraph(), DF.variable('k')))
        .toEqual({
          name: 'binding',
          attributes: { name: 'k' },
          children: [{ name: 'uri', children: '' }],
        });
    });

    it('should convert blank nodes', () => {
      expect(ActorQueryResultSerializeSparqlXml.bindingToXmlBindings(DF.blankNode('b1'), DF.variable('k')))
        .toEqual({
          name: 'binding',
          attributes: { name: 'k' },
          children: [{ name: 'bnode', children: 'b1' }],
        });
    });

    it('should convert plain literals', () => {
      expect(ActorQueryResultSerializeSparqlXml.bindingToXmlBindings(DF.literal('abc'), DF.variable('k')))
        .toEqual({
          name: 'binding',
          attributes: { name: 'k' },
          children: [{ name: 'literal', attributes: {}, children: 'abc' }],
        });
    });

    it('should convert literals with a language', () => {
      expect(ActorQueryResultSerializeSparqlXml
        .bindingToXmlBindings(DF.literal('abc', 'en-us'), DF.variable('k')))
        .toEqual({
          name: 'binding',
          attributes: { name: 'k' },
          children: [{ name: 'literal', attributes: { 'xml:lang': 'en-us' }, children: 'abc' }],
        });
    });

    it('should convert literals with a datatype', () => {
      expect(ActorQueryResultSerializeSparqlXml
        .bindingToXmlBindings(DF.literal('abc', DF.namedNode('http://ex')), DF.variable('k')))
        .toEqual({
          name: 'binding',
          attributes: { name: 'k' },
          children: [{ name: 'literal', attributes: { datatype: 'http://ex' }, children: 'abc' }],
        });
    });

    it('should convert quoted triples', () => {
      expect(ActorQueryResultSerializeSparqlXml.bindingToXmlBindings(DF.quad(
        DF.namedNode('ex:s'),
        DF.namedNode('ex:p'),
        DF.namedNode('ex:o'),
      ), DF.variable('k')))
        .toEqual({
          attributes: { name: 'k' },
          children: [
            {
              children: [
                {
                  children: [
                    { children: 'ex:s', name: 'uri' },
                  ],
                  name: 'subject',
                },
                {
                  children: [
                    { children: 'ex:p', name: 'uri' },
                  ],
                  name: 'predicate',
                },
                {
                  children: [
                    { children: 'ex:o', name: 'uri' },
                  ],
                  name: 'object',
                },
              ],
              name: 'triple',
            },
          ],
          name: 'binding',
        });
    });
  });

  describe('An ActorQueryResultSerializeSparqlXml instance', () => {
    let actor: ActorQueryResultSerializeSparqlXml;
    let bindingsStream: () => BindingsStream;
    let bindingsStreamPartial: () => BindingsStream;
    let bindingsStreamError: BindingsStream;
    let bindingsStreamQuoted: () => BindingsStream;
    let quadStream: () => RDF.Stream & AsyncIterator<RDF.Quad>;
    let metadata: MetadataBindings;

    beforeEach(() => {
      actor = new ActorQueryResultSerializeSparqlXml({ bus, mediaTypePriorities: {
        'sparql-results+xml': 1,
      }, mediaTypeFormats: {}, name: 'actor' });
      bindingsStream = () => new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('k1'), DF.namedNode('v1') ],
        ]),
        BF.bindings([
          [ DF.variable('k2'), DF.namedNode('v2') ],
        ]),
      ], { autoStart: false });
      bindingsStreamPartial = () => new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('k1'), DF.namedNode('v1') ],
        ]),
        BF.bindings([
          [ DF.variable('k2'), DF.namedNode('v2') ],
        ]),
        BF.bindings(),
      ], { autoStart: false });
      bindingsStreamError = <any> new PassThrough();
      (<any> bindingsStreamError)._read = <any> (() => {
        bindingsStreamError.emit('error', new Error('SpXml'));
      });
      bindingsStreamQuoted = () => new ArrayIterator<RDF.Bindings>([
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
      it('should test', async() => {
        await expect(actor.test({ context, mediaTypes: true })).resolves.toBeTruthy();
      });

      it('should run', async() => {
        await expect(actor.run({ context, mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'sparql-results+xml': 1,
        }});
      });
    });

    describe('for serializing', () => {
      it('should not test on quad streams', async() => {
        const stream = quadStream();
        await expect(actor.test(
          { context, handle: <any> { type: 'quads', quadStream: stream }, handleMediaType: 'sparql-results+xml' },
        ))
          .rejects.toBeTruthy();

        stream.destroy();
      });

      it('should test on sparql-results+xml bindings', async() => {
        const stream = bindingsStream();
        await expect(actor.test(
          {
            context,
            handle: <any> { type: 'bindings', bindingsStream: stream },
            handleMediaType: 'sparql-results+xml',
          },
        ))
          .resolves.toBeTruthy();

        stream.destroy();
      });

      it('should test on sparql-results+xml booleans', async() => {
        await expect(actor.test(
          {
            context,
            handle: <any> { type: 'boolean', execute: () => Promise.resolve(true) },
            handleMediaType: 'sparql-results+xml',
          },
        ))
          .resolves.toBeTruthy();
      });

      it('should not test on N-Triples', async() => {
        const stream = bindingsStream();
        await expect(actor.test(
          {
            context,
            handle: <any> { type: 'bindings', bindingsStream: stream },
            handleMediaType: 'application/n-triples',
          },
        ))
          .rejects.toBeTruthy();

        stream.destroy();
      });

      it('should run on a bindings stream', async() => {
        await expect(stringifyStream((<any> (await actor.run({
          context,
          handle: <any> { type: 'bindings', bindingsStream: bindingsStream(), metadata: async() => metadata },
          handleMediaType: 'xml',
        })))
          .handle.data)).resolves.toBe(
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
        await expect(stringifyStream((<any> (await actor.run({
          context,
          handle: <any> { type: 'bindings', bindingsStream: bindingsStream(), metadata: async() => ({ variables: []}) },
          handleMediaType: 'xml',
        })))
          .handle.data)).resolves.toBe(
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
        await expect(stringifyStream((<any> (await actor.run({
          context,
          handle: <any> {
            type: 'bindings',
            bindingsStream: bindingsStreamPartial(),
            metadata: async() => ({ variables: []}),
          },
          handleMediaType: 'xml',
        })))
          .handle.data)).resolves.toBe(
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
          {
            context,
            handle: <any> { bindingsStream: bindingsStreamError, type: 'bindings', metadata: async() => metadata },
            handleMediaType: 'json',
          },
        ))).handle.data)).rejects.toBeTruthy();
      });

      it('should run on a bindings stream with quoted triples', async() => {
        await expect(stringifyStream((<any> (await actor.run({
          context,
          handle: <any> { type: 'bindings', bindingsStream: bindingsStreamQuoted(), metadata: async() => metadata },
          handleMediaType: 'xml',
        })))
          .handle.data)).resolves.toBe(
          `<?xml version="1.0" encoding="UTF-8"?>
<sparql xmlns="http://www.w3.org/2005/sparql-results#">
  <head>
    <variable name="k1"/>
    <variable name="k2"/>
  </head>
  <results>
    <result>
      <binding name="k1">
        <triple>
          <subject>
            <uri>s1</uri>
          </subject>
          <predicate>
            <uri>p1</uri>
          </predicate>
          <object>
            <uri>o1</uri>
          </object>
        </triple>
      </binding>
    </result>
    <result>
      <binding name="k2">
        <triple>
          <subject>
            <uri>s2</uri>
          </subject>
          <predicate>
            <uri>p2</uri>
          </predicate>
          <object>
            <uri>o2</uri>
          </object>
        </triple>
      </binding>
    </result>
  </results>
</sparql>
`,
        );
      });

      it('should run on a boolean result that resolves to true', async() => {
        await expect(stringifyStream((<any> (await actor.run({
          context,
          handle: <any> {
            type: 'boolean',
            execute: () => Promise.resolve(true),
            metadata: async() => ({ variables: []}),
          },
          handleMediaType: 'simple',
        }))).handle.data)).resolves.toBe(
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
        await expect(stringifyStream((<any> (await actor.run({
          context,
          handle: <any> {
            type: 'boolean',
            execute: () => Promise.resolve(false),
            metadata: async() => ({ variables: []}),
          },
          handleMediaType: 'simple',
        }))).handle.data)).resolves.toBe(
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
