import { PassThrough } from 'stream';
import { Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import type { BindingsStream } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorSparqlSerializeSparqlTsv } from '..';

const DF = new DataFactory();
const stringifyStream = require('stream-to-string');

describe('ActorSparqlSerializeSparqlTsv', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorSparqlSerializeSparqlTsv module', () => {
    it('should be a function', () => {
      expect(ActorSparqlSerializeSparqlTsv).toBeInstanceOf(Function);
    });

    it('should be a ActorSparqlSerializeSparqlTsv constructor', () => {
      expect(new (<any> ActorSparqlSerializeSparqlTsv)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorSparqlSerializeSparqlTsv);
    });

    it('should not be able to create new ActorSparqlSerializeSparqlTsv objects without \'new\'', () => {
      expect(() => { (<any> ActorSparqlSerializeSparqlTsv)(); }).toThrow();
    });
  });

  describe('#bindingToTsvBindings', () => {
    it('should convert named nodes', () => {
      return expect(ActorSparqlSerializeSparqlTsv.bindingToTsvBindings(DF.namedNode('http://ex.org')))
        .toEqual('<http://ex.org>');
    });

    it('should convert default graphs', () => {
      return expect(ActorSparqlSerializeSparqlTsv.bindingToTsvBindings(DF.defaultGraph()))
        .toEqual('');
    });

    it('should convert blank nodes', () => {
      return expect(ActorSparqlSerializeSparqlTsv.bindingToTsvBindings(DF.blankNode('b1')))
        .toEqual('_:b1');
    });

    it('should convert plain literals', () => {
      return expect(ActorSparqlSerializeSparqlTsv.bindingToTsvBindings(DF.literal('abc')))
        .toEqual('"abc"');
    });

    it('should convert literals with a language', () => {
      return expect(ActorSparqlSerializeSparqlTsv.bindingToTsvBindings(DF.literal('abc', 'en-us')))
        .toEqual('"abc"@en-us');
    });

    it('should convert literals with a datatype', () => {
      return expect(ActorSparqlSerializeSparqlTsv.bindingToTsvBindings(DF.literal('abc', DF.namedNode('http://ex'))))
        .toEqual('"abc"^^<http://ex>');
    });

    it('should convert literals with "', () => {
      return expect(ActorSparqlSerializeSparqlTsv.bindingToTsvBindings(DF.literal('ab"c')))
        .toEqual('"ab\\"c"');
    });

    it('should convert literals with \n', () => {
      return expect(ActorSparqlSerializeSparqlTsv.bindingToTsvBindings(DF.literal('ab\nc')))
        .toEqual('"ab\\nc"');
    });

    it('should convert literals with \r', () => {
      return expect(ActorSparqlSerializeSparqlTsv.bindingToTsvBindings(DF.literal('ab\rc')))
        .toEqual('"ab\\rc"');
    });

    it('should convert literals with \t', () => {
      return expect(ActorSparqlSerializeSparqlTsv.bindingToTsvBindings(DF.literal('ab\tc')))
        .toEqual('"ab\\tc"');
    });

    it('should convert literals with ,', () => {
      return expect(ActorSparqlSerializeSparqlTsv.bindingToTsvBindings(DF.literal('ab,c')))
        .toEqual('"ab,c"');
    });

    it('should convert literals with multiple escapable characters', () => {
      return expect(ActorSparqlSerializeSparqlTsv.bindingToTsvBindings(DF.literal('a"b,\n\rc')))
        .toEqual('"a\\"b,\\n\\rc"');
    });
  });

  describe('An ActorSparqlSerializeSparqlTsv instance', () => {
    let actor: ActorSparqlSerializeSparqlTsv;
    let bindingsStream: BindingsStream;
    let bindingsStreamPartial: BindingsStream;
    let bindingsStreamMixed: BindingsStream;
    let bindingsStreamEmpty: BindingsStream;
    let bindingsStreamError: BindingsStream;
    let variables: string[];

    beforeEach(() => {
      actor = new ActorSparqlSerializeSparqlTsv({ bus,
        mediaTypes: {
          'text/tab-separated-values': 1,
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
      (<any> bindingsStreamError)._read = <any> (() => { bindingsStreamError.emit('error', new Error('SparqlTsv')); });
      variables = [ '?k1', '?k2' ];
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'text/tab-separated-values': 1,
        }});
      });
    });

    describe('for serializing', () => {
      it('should not test on quad streams', () => {
        return expect(actor.test({ handle: <any> { type: 'quads' },
          handleMediaType: 'text/tab-separated-values' }))
          .rejects.toBeTruthy();
      });

      it('should test on text/tab-separated-values bindings', () => {
        return expect(actor.test({ handle: <any> { bindingsStream, type: 'bindings' },
          handleMediaType: 'text/tab-separated-values' }))
          .resolves.toBeTruthy();
      });

      it('should not test on sparql-results+tsv booleans', () => {
        return expect(actor.test({ handle: <any> { booleanResult: Promise.resolve(true), type: 'boolean' },
          handleMediaType: 'text/tab-separated-values' }))
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
            handleMediaType: 'text/tab-separated-values' },
        ))).handle.data)).toEqual(
          `k1\tk2
<v1>\t
\t<v2>
`,
        );
      });

      it('should run on a bindings stream without variables', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { handle: <any> { bindingsStream, type: 'bindings', variables: []},
            handleMediaType: 'text/tab-separated-values' },
        ))).handle.data)).toEqual(
          `


`,
        );
      });

      it('should run on a bindings stream with unbound variables', async() => {
        expect(await stringifyStream((<any> (await actor.run(
          { handle: <any> { bindingsStream: bindingsStreamPartial, type: 'bindings', variables: [ '?k3' ]},
            handleMediaType: 'text/tab-separated-values' },
        ))).handle.data)).toEqual(
          `k3



`,
        );
      });
    });

    it('should run on a bindings stream containing values with special characters', async() => {
      expect(await stringifyStream((<any> (await actor.run(
        { handle: <any> { bindingsStream: bindingsStreamMixed, type: 'bindings', variables },
          handleMediaType: 'text/tab-separated-values' },
      ))).handle.data)).toEqual(
        `k1\tk2
"v\\""\t
\t<v\\n\\r,>
\t
`,
      );
    });

    it('should run on an empty bindings stream', async() => {
      expect(await stringifyStream((<any> (await actor.run(
        { handle: <any> { bindingsStream: bindingsStreamEmpty, type: 'bindings', variables },
          handleMediaType: 'text/tab-separated-values' },
      ))).handle.data)).toEqual(
        `k1\tk2
`,
      );
    });

    it('should emit an error on an errorring bindings stream', async() => {
      await expect(stringifyStream((<any> (await actor.run(
        { handle: <any> { bindingsStream: bindingsStreamError, type: 'bindings', variables },
          handleMediaType: 'text/tab-separated-values' },
      ))).handle.data)).rejects.toBeTruthy();
    });
  });
});
