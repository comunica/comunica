import type { IActionOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import { ActorOptimizeQueryOperationSetSourcesFromDataset } from '../lib/index';
import '@comunica/utils-jest';

const DF = new DataFactory();

describe('ActorOptimizeQueryOperationSetSourcesFromDataset', () => {
  let bus: any;
  let actor: ActorOptimizeQueryOperationSetSourcesFromDataset;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    actor = new ActorOptimizeQueryOperationSetSourcesFromDataset({ name: 'actor', bus });
  });

  describe('test', () => {
    it('fails if fromNamedAsSources is false', async() => {
      const action: IActionOptimizeQueryOperation = {
        context: new ActionContext(),
        operation: <any> {},
      };
      await expect(actor.test(action)).resolves.toFailTest(
        'This actor can only be used when fromNamedAsSources is enabled.',
      );
    });
    it('passes if fromNamedAsSources is true', async() => {
      const action: IActionOptimizeQueryOperation = {
        context: new ActionContext().set(KeysQueryOperation.fromNamedAsSources, true),
        operation: <any> {},
      };
      await expect(actor.test(action)).resolves.toPassTestVoid();
    });
  });

  describe('static helpers', () => {
    describe('extractDatasetClauses', () => {
      it('should extract default and named graphs from a "from" operation', () => {
        const operation: any = {
          type: 'from',
          input: { type: 'bgp', patterns: []},
          default: [ DF.namedNode('http://example.org/default.ttl') ],
          named: [ DF.namedNode('http://example.org/named.ttl') ],
        };

        const clauses = ActorOptimizeQueryOperationSetSourcesFromDataset.extractDatasetClauses(operation);
        expect(clauses).toEqual({
          defaultGraphs: [ 'http://example.org/default.ttl' ],
          namedGraphs: [ 'http://example.org/named.ttl' ],
        });
      });

      it('should return empty arrays if no "from" clause is present', () => {
        const operation: any = { type: 'bgp', patterns: []};
        const clauses = ActorOptimizeQueryOperationSetSourcesFromDataset.extractDatasetClauses(operation);
        expect(clauses).toEqual({ defaultGraphs: [], namedGraphs: []});
      });
    });

    describe('appendSources', () => {
      it('should append new sources and deduplicate existing ones in context', () => {
        const context = new ActionContext({
          [KeysInitQuery.querySourcesUnidentified.name]: [
            { type: 'auto', value: 'http://example.org/default.ttl' },
          ],
        });

        const clauses = {
          defaultGraphs: [ 'http://example.org/default.ttl' ],
          namedGraphs: [ 'http://example.org/named.ttl' ],
        };

        const newContext = ActorOptimizeQueryOperationSetSourcesFromDataset.appendSources(context, clauses);
        const sources = newContext.get(KeysInitQuery.querySourcesUnidentified);

        expect(sources).toEqual([
          { type: 'auto', value: 'http://example.org/default.ttl' },
          { type: 'auto', value: 'http://example.org/named.ttl' },
        ]);
      });
    });

    describe('stripDatasetClauses', () => {
      it('should unwrap the "from" operation wrapper', () => {
        const innerOperation: any = { type: 'bgp', patterns: []};
        const operation: any = {
          type: 'from',
          input: innerOperation,
          default: [ DF.namedNode('http://example.org/default.ttl') ],
          named: [],
        };

        const stripped = ActorOptimizeQueryOperationSetSourcesFromDataset.stripDatasetClauses(operation);

        expect(stripped).toEqual(innerOperation);
      });
    });
  });

  describe('run', () => {
    it('should return unchanged action output if no FROM/FROM NAMED clauses are present', async() => {
      const operation: any = { type: 'bgp', patterns: []};
      const context = new ActionContext();

      const output = await actor.run({ operation, context });

      expect(output.operation).toBe(operation);
      expect(output.context).toBe(context);
    });

    it('should modify context and strip algebra operation when FROM/FROM NAMED clauses are present', async() => {
      const innerOperation: any = { type: 'bgp', patterns: []};
      const operation: any = {
        type: 'from',
        input: innerOperation,
        default: [ DF.namedNode('http://example.org/default.ttl') ],
        named: [ DF.namedNode('http://example.org/named.ttl') ],
      };
      const context = new ActionContext();

      const output = await actor.run({ operation, context });

      expect(output.operation).toEqual(innerOperation);
      expect(output.context.get(KeysInitQuery.querySourcesUnidentified)).toEqual([
        { type: 'auto', value: 'http://example.org/default.ttl' },
        { type: 'auto', value: 'http://example.org/named.ttl' },
      ]);
    });
  });
});
