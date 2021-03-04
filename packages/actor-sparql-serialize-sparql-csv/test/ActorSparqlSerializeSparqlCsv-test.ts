import { PassThrough } from 'stream';
import { Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import type { BindingsStream } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorSparqlSerializeSparqlCsv } from '..';

const DF = new DataFactory();
const stringifyStream = require('stream-to-string');

describe('ActorSparqlSerializeSparqlCsv', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorSparqlSerializeSparqlCsv module', () => {
    it('should be a function', () => {
      expect(ActorSparqlSerializeSparqlCsv).toBeInstanceOf(Function);
    });

    it('should be a ActorSparqlSerializeSparqlCsv constructor', () => {
      expect(new (<any> ActorSparqlSerializeSparqlCsv)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorSparqlSerializeSparqlCsv);
    });

    it('should not be able to create new ActorSparqlSerializeSparqlCsv objects without \'new\'', () => {
      expect(() => { (<any> ActorSparqlSerializeSparqlCsv)(); }).toThrow();
    });
  });

  describe('#bindingToCsvBindings', () => {
    it('should convert named nodes', () => {
      return expect(ActorSparqlSerializeSparqlCsv.bindingToCsvBindings(DF.namedNode('http://ex.org')))
        .toEqual('<http://ex.org>');
    });

    it('should convert default graphs', () => {
      return expect(ActorSparqlSerializeSparqlCsv.bindingToCsvBindings(DF.defaultGraph()))
        .toEqual('<>');
    });

    it('should convert blank nodes', () => {
      return expect(ActorSparqlSerializeSparqlCsv.bindingToCsvBindings(DF.blankNode('b1')))
        .toEqual('_:b1');
    });

    it('should convert plain literals', () => {
      return expect(ActorSparqlSerializeSparqlCsv.bindingToCsvBindings(DF.literal('abc')))
        .toEqual('abc');
    });

    it('should convert literals with a language', () => {
      return expect(ActorSparqlSerializeSparqlCsv.bindingToCsvBindings(DF.literal('abc', 'en-us')))
        .toEqual('abc');
    });

    it('should convert literals with a datatype', () => {
      return expect(ActorSparqlSerializeSparqlCsv.bindingToCsvBindings(DF.literal('abc', DF.namedNode('http://ex'))))
        .toEqual('abc');
    });

    it('should convert literals with "', () => {
      return expect(ActorSparqlSerializeSparqlCsv.bindingToCsvBindings(DF.literal('ab"c')))
        .toEqual('"ab""c"');
    });

    it('should convert literals with \n', () => {
      return expect(ActorSparqlSerializeSparqlCsv.bindingToCsvBindings(DF.literal('ab\nc')))
        .toEqual('"ab\nc"');
    });

    it('should convert literals with \r', () => {
      return expect(ActorSparqlSerializeSparqlCsv.bindingToCsvBindings(DF.literal('ab\rc')))
        .toEqual('"ab\rc"');
    });

    it('should convert literals with ,', () => {
      return expect(ActorSparqlSerializeSparqlCsv.bindingToCsvBindings(DF.literal('ab,c')))
        .toEqual('"ab,c"');
    });

    it('should convert literals with multiple escapable characters', () => {
      return expect(ActorSparqlSerializeSparqlCsv.bindingToCsvBindings(DF.literal('a"b,\n\rc')))
        .toEqual('"a""b,\n\rc"');
    });
  });

  describe('An ActorSparqlSerializeSparqlCsv instance', () => {
    let actor: ActorSparqlSerializeSparqlCsv;
    let bindingsStream: BindingsStream;
    let bindingsStreamPartial: BindingsStream;
    let bindingsStreamMixed: BindingsStream;
    let bindingsStreamEmpty: BindingsStream;
    let bindingsStreamError: BindingsStream;
    let variables: string[];

    beforeEach(() => {
      actor = new ActorSparqlSerializeSparqlCsv({ bus,
        mediaTypes: {
          'text/csv': 1,
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
      bindingsStreamMixed = new ArrayIterator([
        Bindings({ '?k1': DF.literal('v"'), '?k2': DF.defaultGraph() }),
        Bindings({ '?k2': DF.namedNode('v\n\r,') }),
        Bindings({}),
      ]);
      bindingsStreamEmpty = <any> new PassThrough();
      (<any> bindingsStreamEmpty)._read = <any> (() => { bindingsStreamEmpty.emit('end'); });
      bindingsStreamError = <any> new PassThrough();
      (<any> bindingsStreamError)._read = <any> (() => { bindingsStreamError.emit('error', new Error('SpCsv')); });
      variables = [ '?k1', '?k2' ];
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'text/csv': 1,
        }});
      });
    });

    describe('for serializing', () => {
      it('should not test on quad streams', () => {
        return expect(actor.test({ handle: <any> { type: 'quads' },
          handleMediaType: 'text/csv' }))
          .rejects.toBeTruthy();
      });

      it('should test on text/csv bindings', () => {
        return expect(actor.test({ handle: <any> { bindingsStream, type: 'bindings' },
          handleMediaType: 'text/csv' }))
          .resolves.toBeTruthy();
      });

      it('should not test on sparql-results+csv booleans', () => {
        return expect(actor.test({ handle: <any> { booleanResult: Promise.resolve(true), type: 'boolean' },
          handleMediaType: 'text/csv' }))
          .rejects.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test({ handle: <any> { bindingsStream, type: 'bindings' },
          handleMediaType: 'application/n-triples' }))
          .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { handle: <any> { bindingsStream, type: 'bindings', variables },
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
          { handle: <any> { bindingsStream, type: 'bindings', variables: []},
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
          { handle: <any> { bindingsStream: bindingsStreamPartial, type: 'bindings', variables: [ '?k3' ]},
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
        { handle: <any> { bindingsStream: bindingsStreamMixed, type: 'bindings', variables },
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
        { handle: <any> { bindingsStream: bindingsStreamEmpty, type: 'bindings', variables },
          handleMediaType: 'text/csv' },
      ))).handle.data)).toEqual(
        `k1,k2\r
`,
      );
    });

    it('should emit an error on an errorring bindings stream', async() => {
      await expect(stringifyStream((<any> (await actor.run(
        { handle: <any> { bindingsStream: bindingsStreamError, type: 'bindings', variables },
          handleMediaType: 'text/csv' },
      ))).handle.data)).rejects.toBeTruthy();
    });
  });
});
