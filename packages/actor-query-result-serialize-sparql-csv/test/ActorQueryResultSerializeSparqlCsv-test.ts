import { PassThrough } from 'node:stream';
import { ActionContext, Bus } from '@comunica/core';
import type { BindingsStream, IActionContext, MetadataBindings } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { stringify as stringifyStream } from '@jeswr/stream-to-string';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryResultSerializeSparqlCsv } from '..';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

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
      expect(() => {
        (<any> ActorQueryResultSerializeSparqlCsv)();
      }).toThrow(`Class constructor ActorQueryResultSerializeSparqlCsv cannot be invoked without 'new'`);
    });
  });

  describe('#bindingToCsvBindings', () => {
    it('should convert named nodes', () => {
      expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.namedNode('http://ex.org')))
        .toBe('<http://ex.org>');
    });

    it('should convert default graphs', () => {
      expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.defaultGraph()))
        .toBe('<>');
    });

    it('should convert blank nodes', () => {
      expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.blankNode('b1')))
        .toBe('_:b1');
    });

    it('should convert plain literals', () => {
      expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.literal('abc')))
        .toBe('abc');
    });

    it('should convert literals with a language', () => {
      expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.literal('abc', 'en-us')))
        .toBe('abc');
    });

    it('should convert literals with a datatype', () => {
      expect(ActorQueryResultSerializeSparqlCsv
        .bindingToCsvBindings(DF.literal('abc', DF.namedNode('http://ex'))))
        .toBe('abc');
    });

    it('should convert literals with "', () => {
      expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.literal('ab"c')))
        .toBe('"ab""c"');
    });

    it('should convert literals with \n', () => {
      expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.literal('ab\nc')))
        .toBe('"ab\nc"');
    });

    it('should convert literals with \r', () => {
      expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.literal('ab\rc')))
        .toBe('"ab\rc"');
    });

    it('should convert literals with ,', () => {
      expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.literal('ab,c')))
        .toBe('"ab,c"');
    });

    it('should convert literals with multiple escapable characters', () => {
      expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.literal('a"b,\n\rc')))
        .toBe('"a""b,\n\rc"');
    });

    it('should convert quoted triples', () => {
      expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.quad(
        DF.namedNode('ex:s'),
        DF.namedNode('ex:p'),
        DF.namedNode('ex:o'),
      )))
        .toBe('<< <ex:s> <ex:p> <ex:o> >>');
    });

    it('should convert quoted triples with a character that needs escaping', () => {
      expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.quad(
        DF.namedNode('ex:s'),
        DF.namedNode('ex:p,'),
        DF.namedNode('ex:o'),
      )))
        .toBe('"<< <ex:s> ""<ex:p,>"" <ex:o> >>"');
    });

    it('should convert quoted triples with literals', () => {
      expect(ActorQueryResultSerializeSparqlCsv.bindingToCsvBindings(DF.quad(
        DF.namedNode('ex:s'),
        DF.namedNode('ex:p'),
        DF.literal('abc'),
      )))
        .toBe('"<< <ex:s> <ex:p> ""abc"" >>"');
    });
  });

  describe('An ActorQueryResultSerializeSparqlCsv instance', () => {
    let actor: ActorQueryResultSerializeSparqlCsv;
    let bindingsStream: () => BindingsStream;
    let bindingsStreamPartial: () => BindingsStream;
    let bindingsStreamMixed: () => BindingsStream;
    let bindingsStreamEmpty: BindingsStream;
    let bindingsStreamError: BindingsStream;
    let bindingsStreamQuoted: () => BindingsStream;
    let metadata: MetadataBindings;

    beforeEach(() => {
      actor = new ActorQueryResultSerializeSparqlCsv({ bus, mediaTypePriorities: {
        'text/csv': 1,
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
        bindingsStreamError.emit('error', new Error('SpCsv'));
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
        await expect(actor.test({ context, mediaTypes: true })).resolves.toPassTest({ mediaTypes: true });
      });

      it('should run', async() => {
        await expect(actor.run({ context, mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'text/csv': 1,
        }});
      });
    });

    describe('for serializing', () => {
      it('should not test on quad streams', async() => {
        await expect(actor.test({ context, handle: <any> { type: 'quads' }, handleMediaType: 'text/csv' }))
          .resolves.toFailTest(`This actor can only handle bindings streams.`);
      });

      it('should test on text/csv bindings', async() => {
        const stream = bindingsStream();
        await expect(actor.test({
          context,
          handle: <any> { bindingsStream: stream, type: 'bindings' },
          handleMediaType: 'text/csv',
        }))
          .resolves.toBeTruthy();
        stream.destroy();
      });

      it('should not test on sparql-results+csv booleans', async() => {
        await expect(actor.test({
          context,
          handle: <any> { booleanResult: Promise.resolve(true), type: 'boolean' },
          handleMediaType: 'text/csv',
        }))
          .resolves.toFailTest(`This actor can only handle bindings streams.`);
      });

      it('should not test on N-Triples', async() => {
        const stream = bindingsStream();
        await expect(actor.test({
          context,
          handle: <any> { bindingsStream: stream, type: 'bindings' },
          handleMediaType: 'application/n-triples',
        }))
          .resolves.toFailTest(`Unrecognized media type: application/n-triples`);
        stream.destroy();
      });

      it('should run on a bindings stream', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          {
            context,
            handle: <any> { bindingsStream: bindingsStream(), type: 'bindings', metadata: async() => metadata },
            handleMediaType: 'text/csv',
          },
        ))).handle.data)).resolves.toBe(
          `k1,k2\r
<v1>,\r
,<v2>\r
`,
        );
      });

      it('should run on a bindings stream without variables', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { context, handle: <any> {
            bindingsStream: bindingsStream(),
            type: 'bindings',
            metadata: async() => ({ variables: []}),
          }, handleMediaType: 'text/csv' },
        ))).handle.data)).resolves.toBe(
          `\r
\r
\r
`,
        );
      });

      it('should run on a bindings stream with unbound variables', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { context, handle: <any> {
            bindingsStream: bindingsStreamPartial(),
            type: 'bindings',
            metadata: async() => ({ variables: [
              { variable: DF.variable('k3'), canBeUndef: true },
            ]}),
          }, handleMediaType: 'text/csv' },
        ))).handle.data)).resolves.toBe(
          `k3\r
\r
\r
\r
`,
        );
      });
    });

    it('should run on a bindings stream containing values with special characters', async() => {
      await expect(stringifyStream((<any> (await actor.run(
        {
          context,
          handle: <any> { bindingsStream: bindingsStreamMixed(), type: 'bindings', metadata: async() => metadata },
          handleMediaType: 'text/csv',
        },
      ))).handle.data)).resolves.toBe(
        `k1,k2\r
"v""",<>\r
,"<v\n\r,>"\r
,\r
`,
      );
    });

    it('should run on an empty bindings stream', async() => {
      await expect(stringifyStream((<any> (await actor.run(
        {
          context,
          handle: <any> { bindingsStream: bindingsStreamEmpty, type: 'bindings', metadata: async() => metadata },
          handleMediaType: 'text/csv',
        },
      ))).handle.data)).resolves.toBe(
        `k1,k2\r
`,
      );
    });

    it('should emit an error on an errorring bindings stream', async() => {
      await expect(stringifyStream((<any> (await actor.run(
        {
          context,
          handle: <any> { bindingsStream: bindingsStreamError, type: 'bindings', metadata: async() => metadata },
          handleMediaType: 'text/csv',
        },
      ))).handle.data)).rejects.toBeTruthy();
    });

    it('should run on a bindings stream with quoted triples', async() => {
      await expect(stringifyStream((<any> (await actor.run(
        {
          context,
          handle: <any> { bindingsStream: bindingsStreamQuoted(), type: 'bindings', metadata: async() => metadata },
          handleMediaType: 'text/csv',
        },
      ))).handle.data)).resolves.toBe(
        `k1,k2\r
<< <s1> <p1> <o1> >>,\r
,<< <s2> <p2> <o2> >>\r
`,
      );
    });
  });
});
