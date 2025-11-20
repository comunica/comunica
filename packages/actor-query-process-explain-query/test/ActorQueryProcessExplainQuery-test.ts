import { ActorQuerySerializeSparql } from '@comunica/actor-query-serialize-sparql';
import type { IQueryProcessSequential } from '@comunica/bus-query-process';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import '@comunica/utils-jest';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { assignOperationSource } from '@comunica/utils-query-operation';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import { ActorQueryProcessExplainQuery } from '../lib/ActorQueryProcessExplainQuery';

const AF = new AlgebraFactory();
const DF = new DataFactory();

describe('ActorQueryProcessExplainQuery', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorQueryProcessExplainQuery instance', () => {
    let actor: ActorQueryProcessExplainQuery;
    let queryProcessor: IQueryProcessSequential;

    beforeEach(() => {
      queryProcessor = <any>{
        async parse(query: string) {
          if (query === 'union') {
            return {
              operation: AF.createUnion([]),
            };
          }
          return { operation: AF.createJoin([
            assignOperationSource(
              AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
              { source: <any> { referenceValue: query === 'rdfjs' ? RdfStore.createDefault() : 'SRC1' }},
            ),
          ]) };
        },
        async optimize(query: Algebra.Operation) {
          if (query.type === 'union') {
            return {
              operation: query,
              context: new ActionContext().set(KeysInitQuery.dataFactory, DF),
            };
          }
          return {
            operation: AF.createProject(query, [ DF.variable('s') ]),
            context: new ActionContext().set(KeysInitQuery.dataFactory, DF),
          };
        },
      };
      const mediatorQuerySerialize: any = {
        mediate: jest.fn((action: any) => new ActorQuerySerializeSparql(<any> {
          bus: { subscribe: jest.fn() },
        }).run(action)),
      };
      actor = new ActorQueryProcessExplainQuery({ name: 'actor', bus, queryProcessor, mediatorQuerySerialize });
    });

    describe('test', () => {
      it('rejects on no explain in context', async() => {
        await expect(actor.test({ query: 'q', context: new ActionContext() }))
          .resolves.toFailTest(`actor can only explain in 'query' mode.`);
      });

      it('rejects on wrong explain in context', async() => {
        await expect(actor.test({ query: 'q', context: new ActionContext().set(KeysInitQuery.explain, 'parsed') }))
          .resolves.toFailTest(`actor can only explain in 'query' mode.`);
      });

      it('handles query explain in context', async() => {
        await expect(actor.test({
          query: 'q',
          context: new ActionContext().set(KeysInitQuery.explain, 'query'),
        })).resolves
          .toPassTestVoid();
      });

      it('handles query explain in raw context', async() => {
        await expect(actor.test({ query: 'q', context: new ActionContext().setRaw('explain', 'query') })).resolves
          .toPassTestVoid();
      });
    });

    describe('run', () => {
      it('handles query explain in context', async() => {
        await expect(actor.run({
          query: 'q',
          context: new ActionContext()
            .set(KeysInitQuery.explain, 'query'),
        })).resolves
          .toEqual({
            result: {
              explain: true,
              type: 'query',
              data: `SELECT ?s WHERE {
  SERVICE <SRC1> {
    <s> <p> <o> .
  }
}`,
            },
          });
      });

      it('handles query explain in context for an rdfjs source', async() => {
        await expect(actor.run({
          query: 'rdfjs',
          context: new ActionContext()
            .set(KeysInitQuery.explain, 'query'),
        })).resolves
          .toEqual({
            result: {
              explain: true,
              type: 'query',
              data: `SELECT ?s WHERE {
  SERVICE <comunica:RdfStore> {
    <s> <p> <o> .
  }
}`,
            },
          });
      });

      it('handles query explain in context for dummy union query', async() => {
        await expect(actor.run({
          query: 'union',
          context: new ActionContext()
            .set(KeysInitQuery.explain, 'query'),
        })).resolves
          .toEqual({
            result: {
              explain: true,
              type: 'query',
              data: `SELECT * WHERE { FILTER(false) }`,
            },
          });
      });
    });
  });
});
