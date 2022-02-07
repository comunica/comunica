import { PassThrough } from 'stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import { ActionContext, Bus } from '@comunica/core';
import type { BindingsStream, IActionContext, MetadataBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryResultSerializeSparqlTsv } from '..';

const DF = new DataFactory();
const BF = new BindingsFactory();
const stringifyStream = require('stream-to-string');

describe('ActorQueryResultSerializeSparqlTsv', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorQueryResultSerializeSparqlTsv module', () => {
    it('should be a function', () => {
      expect(ActorQueryResultSerializeSparqlTsv).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryResultSerializeSparqlTsv constructor', () => {
      expect(new (<any> ActorQueryResultSerializeSparqlTsv)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryResultSerializeSparqlTsv);
    });

    it('should not be able to create new ActorQueryResultSerializeSparqlTsv objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryResultSerializeSparqlTsv)(); }).toThrow();
    });
  });

  describe('#bindingToTsvBindings', () => {
    it('should convert named nodes', () => {
      return expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.namedNode('http://ex.org')))
        .toEqual('<http://ex.org>');
    });

    it('should convert default graphs', () => {
      return expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.defaultGraph()))
        .toEqual('');
    });

    it('should convert blank nodes', () => {
      return expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.blankNode('b1')))
        .toEqual('_:b1');
    });

    it('should convert plain literals', () => {
      return expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.literal('abc')))
        .toEqual('"abc"');
    });

    it('should convert literals with a language', () => {
      return expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.literal('abc', 'en-us')))
        .toEqual('"abc"@en-us');
    });

    it('should convert literals with a datatype', () => {
      return expect(ActorQueryResultSerializeSparqlTsv
        .bindingToTsvBindings(DF.literal('abc', DF.namedNode('http://ex'))))
        .toEqual('"abc"^^<http://ex>');
    });

    it('should convert literals with "', () => {
      return expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.literal('ab"c')))
        .toEqual('"ab\\"c"');
    });

    it('should convert literals with \n', () => {
      return expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.literal('ab\nc')))
        .toEqual('"ab\\nc"');
    });

    it('should convert literals with \r', () => {
      return expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.literal('ab\rc')))
        .toEqual('"ab\\rc"');
    });

    it('should convert literals with \t', () => {
      return expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.literal('ab\tc')))
        .toEqual('"ab\\tc"');
    });

    it('should convert literals with ,', () => {
      return expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.literal('ab,c')))
        .toEqual('"ab,c"');
    });

    it('should convert literals with multiple escapable characters', () => {
      return expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.literal('a"b,\n\rc')))
        .toEqual('"a\\"b,\\n\\rc"');
    });
  });

  describe('An ActorQueryResultSerializeSparqlTsv instance', () => {
    let actor: ActorQueryResultSerializeSparqlTsv;
    let bindingsStream: BindingsStream;
    let bindingsStreamPartial: BindingsStream;
    let bindingsStreamMixed: BindingsStream;
    let bindingsStreamEmpty: BindingsStream;
    let bindingsStreamError: BindingsStream;
    let metadata: MetadataBindings;

    beforeEach(() => {
      actor = new ActorQueryResultSerializeSparqlTsv({ bus,
        mediaTypePriorities: {
          'text/tab-separated-values': 1,
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
      (<any> bindingsStreamError)._read = <any> (() => { bindingsStreamError.emit('error', new Error('SparqlTsv')); });
      metadata = <any> { variables: [ DF.variable('k1'), DF.variable('k2') ]};
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true, context })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          'text/tab-separated-values': 1,
        }});
      });
    });

    describe('for serializing', () => {
      it('should not test on quad streams', () => {
        return expect(actor.test({ handle: <any> { type: 'quads', context },
          handleMediaType: 'text/tab-separated-values',
          context }))
          .rejects.toBeTruthy();
      });

      it('should test on text/tab-separated-values bindings', () => {
        return expect(actor.test({ handle: <any> { bindingsStream, type: 'bindings', context },
          handleMediaType: 'text/tab-separated-values',
          context }))
          .resolves.toBeTruthy();
      });

      it('should not test on sparql-results+tsv booleans', () => {
        return expect(actor.test({ handle: <any> { booleanResult: Promise.resolve(true), type: 'boolean', context },
          handleMediaType: 'text/tab-separated-values',
          context }))
          .rejects.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test({ handle: <any> { bindingsStream, type: 'bindings', context },
          handleMediaType: 'application/n-triples',
          context }))
          .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { handle: <any> { bindingsStream, type: 'bindings', metadata: async() => metadata, context },
            handleMediaType: 'text/tab-separated-values',
            context },
        ))).handle.data)).toEqual(
          `k1\tk2
<v1>\t
\t<v2>
`,
        );
      });

      it('should run on a bindings stream without variables', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { handle: <any> { bindingsStream, type: 'bindings', metadata: async() => ({ variables: []}), context },
            handleMediaType: 'text/tab-separated-values',
            context },
        ))).handle.data)).toEqual(
          `


`,
        );
      });

      it('should run on a bindings stream with unbound variables', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { handle: <any> {
            bindingsStream: bindingsStreamPartial,
            type: 'bindings',
            metadata: async() => ({ variables: [ DF.variable('k3') ]}),
            context,
          },
          handleMediaType: 'text/tab-separated-values',
          context },
        ))).handle.data)).toEqual(
          `k3



`,
        );
      });
    });

    it('should run on a bindings stream containing values with special characters', async() => {
      expect(await stringifyStream((<any> (await actor.run({
        handle: <any> { bindingsStream: bindingsStreamMixed, type: 'bindings', metadata: async() => metadata, context },
        handleMediaType: 'text/tab-separated-values',
        context,
      }))).handle.data)).toEqual(
        `k1\tk2
"v\\""\t
\t<v\\n\\r,>
\t
`,
      );
    });

    it('should run on an empty bindings stream', async() => {
      expect(await stringifyStream((<any> (await actor.run({
        handle: <any> { bindingsStream: bindingsStreamEmpty, type: 'bindings', metadata: async() => metadata, context },
        handleMediaType: 'text/tab-separated-values',
        context,
      }))).handle.data)).toEqual(
        `k1\tk2
`,
      );
    });

    it('should emit an error on an errorring bindings stream', async() => {
      await expect(stringifyStream((<any> (await actor.run({
        handle: <any> { bindingsStream: bindingsStreamError, type: 'bindings', metadata: async() => metadata, context },
        handleMediaType: 'text/tab-separated-values',
        context,
      }))).handle.data)).rejects.toBeTruthy();
    });
  });
});
