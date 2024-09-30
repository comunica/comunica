import { PassThrough } from 'node:stream';
import { ActionContext, Bus } from '@comunica/core';
import type { BindingsStream, IActionContext, MetadataBindings } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { stringify as stringifyStream } from '@jeswr/stream-to-string';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryResultSerializeSparqlTsv } from '..';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

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
      expect(() => {
        (<any> ActorQueryResultSerializeSparqlTsv)();
      }).toThrow(`Class constructor ActorQueryResultSerializeSparqlTsv cannot be invoked without 'new'`);
    });
  });

  describe('#bindingToTsvBindings', () => {
    it('should convert named nodes', () => {
      expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.namedNode('http://ex.org')))
        .toBe('<http://ex.org>');
    });

    it('should convert default graphs', () => {
      expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.defaultGraph()))
        .toBe('');
    });

    it('should convert blank nodes', () => {
      expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.blankNode('b1')))
        .toBe('_:b1');
    });

    it('should convert plain literals', () => {
      expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.literal('abc')))
        .toBe('"abc"');
    });

    it('should convert literals with a language', () => {
      expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.literal('abc', 'en-us')))
        .toBe('"abc"@en-us');
    });

    it('should convert literals with a datatype', () => {
      expect(ActorQueryResultSerializeSparqlTsv
        .bindingToTsvBindings(DF.literal('abc', DF.namedNode('http://ex'))))
        .toBe('"abc"^^<http://ex>');
    });

    it('should convert literals with "', () => {
      expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.literal('ab"c')))
        .toBe('"ab\\"c"');
    });

    it('should convert literals with \n', () => {
      expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.literal('ab\nc')))
        .toBe('"ab\\nc"');
    });

    it('should convert literals with \r', () => {
      expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.literal('ab\rc')))
        .toBe('"ab\\rc"');
    });

    it('should convert literals with \t', () => {
      expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.literal('ab\tc')))
        .toBe('"ab\\tc"');
    });

    it('should convert literals with ,', () => {
      expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.literal('ab,c')))
        .toBe('"ab,c"');
    });

    it('should convert literals with multiple escapable characters', () => {
      expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.literal('a"b,\n\rc')))
        .toBe('"a\\"b,\\n\\rc"');
    });

    it('should convert quoted triples', () => {
      expect(ActorQueryResultSerializeSparqlTsv.bindingToTsvBindings(DF.quad(
        DF.namedNode('ex:s'),
        DF.namedNode('ex:p'),
        DF.namedNode('ex:o'),
      )))
        .toBe('<<<ex:s> <ex:p> <ex:o>>>');
    });
  });

  describe('An ActorQueryResultSerializeSparqlTsv instance', () => {
    let actor: ActorQueryResultSerializeSparqlTsv;
    let bindingsStream: () => BindingsStream;
    let bindingsStreamPartial: () => BindingsStream;
    let bindingsStreamMixed: () => BindingsStream;
    let bindingsStreamEmpty: BindingsStream;
    let bindingsStreamError: BindingsStream;
    let bindingsStreamQuoted: () => BindingsStream;
    let metadata: MetadataBindings;

    beforeEach(() => {
      actor = new ActorQueryResultSerializeSparqlTsv({ bus, mediaTypePriorities: {
        'text/tab-separated-values': 1,
      }, mediaTypeFormats: {}, name: 'actor' });
      bindingsStream = () => new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('k1'), DF.namedNode('v1') ],
        ]),
        BF.bindings([
          [ DF.variable('k2'), DF.namedNode('v2') ],
        ]),
      ]);
      bindingsStreamPartial = () => new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('k1'), DF.namedNode('v1') ],
        ]),
        BF.bindings([
          [ DF.variable('k2'), DF.namedNode('v2') ],
        ]),
        BF.bindings(),
      ]);
      bindingsStreamMixed = () => new ArrayIterator<RDF.Bindings>([
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
      (<any> bindingsStreamEmpty)._read = <any> (() => {
        bindingsStreamEmpty.emit('end');
      });
      bindingsStreamError = <any> new PassThrough();
      (<any> bindingsStreamError)._read = <any> (() => {
        bindingsStreamError.emit('error', new Error('SparqlTsv'));
      });
      bindingsStreamQuoted = () => new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('k1'), DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')) ],
        ]),
        BF.bindings([
          [ DF.variable('k2'), DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')) ],
        ]),
      ], { autoStart: false });
      metadata = <any> { variables: [
        { variable: DF.variable('k1'), canBeUndef: false },
        { variable: DF.variable('k2'), canBeUndef: false },
      ]};
    });

    describe('for getting media types', () => {
      it('should test', async() => {
        await expect(actor.test({ mediaTypes: true, context })).resolves.toPassTest({ mediaTypes: true });
      });

      it('should run', async() => {
        await expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          'text/tab-separated-values': 1,
        }});
      });
    });

    describe('for serializing', () => {
      it('should not test on quad streams', async() => {
        await expect(actor.test({
          handle: <any> { type: 'quads', context },
          handleMediaType: 'text/tab-separated-values',
          context,
        }))
          .resolves.toFailTest(`This actor can only handle bindings streams.`);
      });

      it('should test on text/tab-separated-values bindings', async() => {
        const stream = bindingsStream();
        await expect(actor.test({
          handle: <any> { bindingsStream: stream, type: 'bindings', context },
          handleMediaType: 'text/tab-separated-values',
          context,
        }))
          .resolves.toPassTest({ handle: true });

        stream.destroy();
      });

      it('should not test on sparql-results+tsv booleans', async() => {
        await expect(actor.test({
          handle: <any> { booleanResult: Promise.resolve(true), type: 'boolean', context },
          handleMediaType: 'text/tab-separated-values',
          context,
        }))
          .resolves.toFailTest(`This actor can only handle bindings streams.`);
      });

      it('should not test on N-Triples', async() => {
        const stream = bindingsStream();
        await expect(actor.test({
          handle: <any> { bindingsStream: stream, type: 'bindings', context },
          handleMediaType: 'application/n-triples',
          context,
        }))
          .resolves.toFailTest(`Unrecognized media type: application/n-triples`);

        stream.destroy();
      });

      it('should run on a bindings stream', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> {
            bindingsStream: bindingsStream(),
            type: 'bindings',
            metadata: async() => metadata,
            context,
          }, handleMediaType: 'text/tab-separated-values', context },
        ))).handle.data)).resolves.toBe(
          `k1\tk2
<v1>\t
\t<v2>
`,
        );
      });

      it('should run on a bindings stream without variables', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> {
            bindingsStream: bindingsStream(),
            type: 'bindings',
            metadata: async() => ({ variables: []}),
            context,
          }, handleMediaType: 'text/tab-separated-values', context },
        ))).handle.data)).resolves.toBe(
          `


`,
        );
      });

      it('should run on a bindings stream with unbound variables', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: <any> {
            bindingsStream: bindingsStreamPartial(),
            type: 'bindings',
            metadata: async() => ({ variables: [
              { variable: DF.variable('k3'), canBeUndef: true },
            ]}),
            context,
          }, handleMediaType: 'text/tab-separated-values', context },
        ))).handle.data)).resolves.toBe(
          `k3



`,
        );
      });
    });

    it('should run on a bindings stream containing values with special characters', async() => {
      await expect(stringifyStream((<any> (await actor.run({
        handle: <any> {
          bindingsStream: bindingsStreamMixed(),
          type: 'bindings',
          metadata: async() => metadata,
          context,
        },
        handleMediaType: 'text/tab-separated-values',
        context,
      }))).handle.data)).resolves.toBe(
        `k1\tk2
"v\\""\t
\t<v\\n\\r,>
\t
`,
      );
    });

    it('should run on an empty bindings stream', async() => {
      await expect(stringifyStream((<any> (await actor.run({
        handle: <any> { bindingsStream: bindingsStreamEmpty, type: 'bindings', metadata: async() => metadata, context },
        handleMediaType: 'text/tab-separated-values',
        context,
      }))).handle.data)).resolves.toBe(
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

    it('should run on a bindings stream with quoted triples', async() => {
      await expect(stringifyStream((<any> (await actor.run(
        { handle: <any> {
          bindingsStream: bindingsStreamQuoted(),
          type: 'bindings',
          metadata: async() => metadata,
          context,
        }, handleMediaType: 'text/tab-separated-values', context },
      ))).handle.data)).resolves.toBe(
        `k1\tk2
<<<s1> <p1> <o1>>>\t
\t<<<s2> <p2> <o2>>>
`,
      );
    });
  });
});
