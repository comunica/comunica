import { PassThrough } from 'stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import { ActionContext, Bus } from '@comunica/core';
import type { BindingsStream, IActionContext, MetadataBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryResultSerializeSparqlCsv } from '..';

const DF = new DataFactory();
const BF = new BindingsFactory();
const stringifyStream = require('stream-to-string');

describe('ActorQueryResultSerializeSparqlCsv', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorQueryResultSerializeSparqlCsv module', () => {
    it('should be a function', () => {
      expect(ActorQueryResultSerializeSparqlCsv).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryResultSerializeSparqlCsv constructor', () => {
      expect(new (<any> ActorQueryResultSerializeSparqlCsv)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryResultSerializeSparqlCsv);
    });

    it('should not be able to create new ActorQueryResultSerializeSparqlCsv objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryResultSerializeSparqlCsv)(); }).toThrow();
    });
  });

  describe('#bindingToCsvBindings', () => {
    it('should convert named nodes', () => {
      return expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.namedNode('http://ex.org')))
        .toEqual('<http://ex.org>');
    });

    it('should convert default graphs', () => {
      return expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.defaultGraph()))
        .toEqual('<>');
    });

    it('should convert blank nodes', () => {
      return expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.blankNode('b1')))
        .toEqual('_:b1');
    });

    it('should convert plain literals', () => {
      return expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.literal('abc')))
        .toEqual('abc');
    });

    it('should convert literals with a language', () => {
      return expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.literal('abc', 'en-us')))
        .toEqual('abc');
    });

    it('should convert literals with a datatype', () => {
      return expect(ActorQueryResultSerializeSparqlCsv
        .bindingToCsvBindings(DF.literal('abc', DF.namedNode('http://ex'))))
        .toEqual('abc');
    });

    it('should convert literals with "', () => {
      return expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.literal('ab"c')))
        .toEqual('"ab""c"');
    });

    it('should convert literals with \n', () => {
      return expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.literal('ab\nc')))
        .toEqual('"ab\nc"');
    });

    it('should convert literals with \r', () => {
      return expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.literal('ab\rc')))
        .toEqual('"ab\rc"');
    });

    it('should convert literals with ,', () => {
      return expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.literal('ab,c')))
        .toEqual('"ab,c"');
    });

    it('should convert literals with multiple escapable characters', () => {
      return expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.literal('a"b,\n\rc')))
        .toEqual('"a""b,\n\rc"');
    });
  });

  describe('An ActorQueryResultSerializeSparqlCsv instance', () => {
    let actor: ActorQueryResultSerializeSparqlCsv;
    let bindingsStream: BindingsStream;
    let bindingsStreamPartial: BindingsStream;
    let bindingsStreamMixed: BindingsStream;
    let bindingsStreamEmpty: BindingsStream;
    let bindingsStreamError: BindingsStream;
    let metadata: MetadataBindings;

    beforeEach(() => {
      actor = new ActorQueryResultSerializeSparqlCsv({ bus,
        mediaTypePriorities: {
          'text/csv': 1,
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
      bindingsStreamPartial = new ArrayIterator([
        BF.bindings([
          [ DF.variable('k1'), DF.namedNode('v1') ],
        ]),
        BF.bindings([
          [ DF.variable('k2'), DF.namedNode('v2') ],
        ]),
        BF.bindings(),
      ]);
      bindingsStreamMixed = new ArrayIterator([
        BF.bindings([
          [ DF.variable('k1'), DF.literal('v"') ],
          [ DF.variable('k2'), DF.defaultGraph() ],
        ]),
        BF.bindings([
          [ DF.variable('k2'), DF.namedNode('v\n\r,') ],
        ]),
        BF.bindings(),
      ]);
      bindingsStreamEmpty = <any> new PassThrough();
      (<any> bindingsStreamEmpty)._read = <any> (() => { bindingsStreamEmpty.emit('end'); });
      bindingsStreamError = <any> new PassThrough();
      (<any> bindingsStreamError)._read = <any> (() => { bindingsStreamError.emit('error', new Error('SpCsv')); });
      metadata = <any> { variables: [ DF.variable('k1'), DF.variable('k2') ]};
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ context, mediaTypes: true })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ context, mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'text/csv': 1,
        }});
      });
    });

    describe('for serializing', () => {
      it('should not test on quad streams', () => {
        return expect(actor.test({ context,
          handle: <any> { type: 'quads' },
          handleMediaType: 'text/csv' }))
          .rejects.toBeTruthy();
      });

      it('should test on text/csv bindings', () => {
        return expect(actor.test({ context,
          handle: <any> { bindingsStream, type: 'bindings' },
          handleMediaType: 'text/csv' }))
          .resolves.toBeTruthy();
      });

      it('should not test on sparql-results+csv booleans', () => {
        return expect(actor.test({ context,
          handle: <any> { booleanResult: Promise.resolve(true), type: 'boolean' },
          handleMediaType: 'text/csv' }))
          .rejects.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test({ context,
          handle: <any> { bindingsStream, type: 'bindings' },
          handleMediaType: 'application/n-triples' }))
          .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { context,
            handle: <any> { bindingsStream, type: 'bindings', metadata: async() => metadata },
            handleMediaType: 'text/csv' },
        ))).handle.data)).toEqual(
          `k1,k2\r
<v1>,\r
,<v2>\r
`,
        );
      });

      it('should run on a bindings stream without variables', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { context,
            handle: <any> { bindingsStream, type: 'bindings', metadata: async() => ({ variables: []}) },
            handleMediaType: 'text/csv' },
        ))).handle.data)).toEqual(
          `\r
\r
\r
`,
        );
      });

      it('should run on a bindings stream with unbound variables', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { context,
            handle: <any> {
              bindingsStream: bindingsStreamPartial,
              type: 'bindings',
              metadata: async() => ({ variables: [ DF.variable('k3') ]}),
            },
            handleMediaType: 'text/csv' },
        ))).handle.data)).toEqual(
          `k3\r
\r
\r
\r
`,
        );
      });
    });

    it('should run on a bindings stream containing values with special characters', async() => {
      expect(await stringifyStream((<any> (await actor.run(
        { context,
          handle: <any> { bindingsStream: bindingsStreamMixed, type: 'bindings', metadata: async() => metadata },
          handleMediaType: 'text/csv' },
      ))).handle.data)).toEqual(
        `k1,k2\r
"v""",<>\r
,"<v\n\r,>"\r
,\r
`,
      );
    });

    it('should run on an empty bindings stream', async() => {
      expect(await stringifyStream((<any> (await actor.run(
        { context,
          handle: <any> { bindingsStream: bindingsStreamEmpty, type: 'bindings', metadata: async() => metadata },
          handleMediaType: 'text/csv' },
      ))).handle.data)).toEqual(
        `k1,k2\r
`,
      );
    });

    it('should emit an error on an errorring bindings stream', async() => {
      await expect(stringifyStream((<any> (await actor.run(
        { context,
          handle: <any> { bindingsStream: bindingsStreamError, type: 'bindings', metadata: async() => metadata },
          handleMediaType: 'text/csv' },
      ))).handle.data)).rejects.toBeTruthy();
    });
  });
});
