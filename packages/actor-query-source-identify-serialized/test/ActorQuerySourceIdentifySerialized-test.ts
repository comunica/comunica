import { QuerySourceRdfJs } from '@comunica/actor-query-source-identify-rdfjs';
import type { IActionQuerySourceIdentify, MediatorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import type { IActionRdfParseHandle, MediatorRdfParseHandle } from '@comunica/bus-rdf-parse';
import { ActionContext, Bus } from '@comunica/core';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import { ActorQuerySourceIdentifySerialized } from '../lib/ActorQuerySourceIdentifySerialized';
import '@comunica/utils-jest';

const streamifyArray = require('streamify-array');

const DF = new DataFactory();
const AF = new Factory(DF);
const BF = new BindingsFactory(DF);

describe('ActorQuerySourceIdentifySerialized', () => {
  let bus: any;
  const sourceValue = 's0 <ex:p1> <ex:o1>. s0 <ex:p2> <ex:o2>.';
  const sourceMediaType = 'text/turtle';
  const sourceBaseIri = 'http://example.org/';
  let mediatorRdfParse: MediatorRdfParseHandle;
  let mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorRdfParse = <any> {
      async mediate(_arg: IActionRdfParseHandle) {
        return {
          handle: {
            data: streamifyArray([
              DF.quad(DF.blankNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
              DF.quad(DF.blankNode(`ex:s2`), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
            ]),
          },
        };
      },
    };
    mediatorQuerySourceIdentify = <any> {
      async mediate(action: IActionQuerySourceIdentify) {
        if (action.querySourceUnidentified.type !== 'rdfjs') {
          throw new Error('Only supports rdfjs');
        }
        return {
          querySource: {
            source: new QuerySourceRdfJs(<RDF.Store> action.querySourceUnidentified.value, DF, BF),
          },
        };
      },
    };
  });

  describe('An ActorQuerySourceIdentifySerialized instance', () => {
    let actor: ActorQuerySourceIdentifySerialized;

    beforeEach(() => {
      actor = new ActorQuerySourceIdentifySerialized(
        { name: 'actor', bus, mediatorRdfParse, mediatorQuerySourceIdentify },
      );
    });

    describe('test', () => {
      it('should test', async() => {
        await expect(actor.test({
          querySourceUnidentified: {
            type: 'serialized',
            value: sourceValue,
            mediaType: sourceMediaType,
            baseIRI: sourceBaseIri,
          },
          context: new ActionContext(),
        })).resolves.toPassTestVoid();
      });

      it('should test without type and baseIRI', async() => {
        await expect(actor.test({
          querySourceUnidentified: {
            value: sourceValue,
            mediaType: sourceMediaType,
          },
          context: new ActionContext(),
        })).resolves.toPassTestVoid();
      });

      it('should not test on no media type', async() => {
        await expect(actor.test({
          querySourceUnidentified: {
            value: sourceValue,
            baseIRI: sourceBaseIri,
          },
          context: new ActionContext(),
        })).resolves.toFailTest(`actor requires a single query source with serialized type to be present in the context.`);
      });

      it('should not test on non-string', async() => {
        await expect(actor.test({
          querySourceUnidentified: {
            value: <any> {},
            mediaType: sourceMediaType,
          },
          context: new ActionContext(),
        })).resolves.toFailTest(`actor requires a single query source with serialized type to be present in the context.`);
      });

      it('should not test on the sparql type', async() => {
        await expect(actor.test({
          querySourceUnidentified: {
            type: 'sparql',
            value: sourceValue,
          },
          context: new ActionContext(),
        })).resolves.toFailTest(`actor requires a single query source with serialized type to be present in the context.`);
      });
    });

    describe('run', () => {
      it('should return a QuerySourceRdfJs', async() => {
        const contextIn = new ActionContext();
        const ret = await actor.run({
          querySourceUnidentified: {
            type: 'serialized',
            value: sourceValue,
            mediaType: sourceMediaType,
            baseIRI: sourceBaseIri,
          },
          context: contextIn,
        });
        expect(ret.querySource.source).toBeInstanceOf(QuerySourceRdfJs);
        expect(ret.querySource.context).not.toBe(contextIn);

        const data = ret.querySource.source.queryBindings(
          AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
          contextIn,
        );
        await expect(data).toEqualBindingsStream([
          BF.fromRecord({
            s: DF.blankNode('ex:s1'),
            p: DF.namedNode('ex:p1'),
            o: DF.namedNode('ex:o1'),
          }),
          BF.fromRecord({
            s: DF.blankNode('ex:s2'),
            p: DF.namedNode('ex:p2'),
            o: DF.namedNode('ex:o2'),
          }),
        ]);
      });
    });
  });
});
