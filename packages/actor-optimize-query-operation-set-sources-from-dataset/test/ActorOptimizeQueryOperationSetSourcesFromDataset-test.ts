import type { IActionOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { DataFactory } from 'rdf-data-factory';
import { ActorOptimizeQueryOperationSetSourcesFromDataset } from '../lib/index';
import '@comunica/utils-jest';

const DF = new DataFactory();
const AF = new AlgebraFactory();

describe('ActorOptimizeQueryOperationSetSourcesFromDataset', () => {
  let bus: any;
  let actor: ActorOptimizeQueryOperationSetSourcesFromDataset;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    actor = new ActorOptimizeQueryOperationSetSourcesFromDataset({ name: 'actor', bus });
  });

  describe('test', () => {
    it('fails if dereferenceFromNamed is false', async() => {
      const action: IActionOptimizeQueryOperation = {
        context: new ActionContext(),
        operation: AF.createNop(),
      };
      await expect(actor.test(action)).resolves.toFailTest(
        'This actor can only be used when dereferenceFromNamed is enabled.',
      );
    });
    it('passes if dereferenceFromNamed is true', async() => {
      const action: IActionOptimizeQueryOperation = {
        context: new ActionContext().set(KeysQueryOperation.dereferenceFromNamed, true),
        operation: AF.createNop(),
      };
      await expect(actor.test(action)).resolves.toPassTestVoid();
    });
  });

  describe('static helpers', () => {
    describe('extractDatasetClauses', () => {
      it('should extract default and named graphs from a "from" operation', () => {
        const operation: Algebra.From = {
          type: Algebra.Types.FROM,
          input: <Algebra.Bgp> { type: Algebra.Types.BGP, patterns: []},
          default: [ DF.namedNode('http://example.org/default.ttl') ],
          named: [ DF.namedNode('http://example.org/named.ttl') ],
        };

        const clauses = ActorOptimizeQueryOperationSetSourcesFromDataset.extractDatasetClauses(operation);
        expect(clauses).toEqual({
          defaultGraphs: [ 'http://example.org/default.ttl' ],
          namedGraphs: [ DF.namedNode('http://example.org/named.ttl') ],
        });
      });

      it('should return empty arrays if no "from" clause is present', () => {
        const operation: Algebra.Bgp = { type: Algebra.Types.BGP, patterns: []};
        const clauses = ActorOptimizeQueryOperationSetSourcesFromDataset.extractDatasetClauses(operation);
        expect(clauses).toEqual({ defaultGraphs: [], namedGraphs: []});
      });
    });

    describe('appendSources', () => {
      it('should append new sources and deduplicate existing default graph sources in context', () => {
        const context = new ActionContext({
          [KeysInitQuery.querySourcesUnidentified.name]: [ 'http://example.org/default.ttl' ],
        });

        const clauses = {
          defaultGraphs: [ 'http://example.org/default.ttl' ],
          namedGraphs: [ DF.namedNode('http://example.org/named.ttl') ],
        };

        const newContext = ActorOptimizeQueryOperationSetSourcesFromDataset.appendSources(context, clauses);
        const sources = newContext.get(KeysInitQuery.querySourcesUnidentified)!;

        expect(sources).toEqual([
          'http://example.org/default.ttl',
          {
            value: 'http://example.org/named.ttl',
            context: expect.any(ActionContext),
          },
        ]);
        const namedSourceContext = <IActionContext> (<any> sources[1]).context;
        expect(namedSourceContext.get(KeysQueryOperation.sourceAsNamedGraph))
          .toEqual(DF.namedNode('http://example.org/named.ttl'));
      });
    });

    describe('stripDatasetClauses', () => {
      it('should unwrap the "from" operation wrapper', () => {
        const innerOperation: Algebra.Bgp = { type: Algebra.Types.BGP, patterns: []};
        const operation: Algebra.From = {
          type: Algebra.Types.FROM,
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
      const operation: Algebra.Bgp = { type: Algebra.Types.BGP, patterns: []};
      const context = new ActionContext();

      const output = await actor.run({ operation, context });

      expect(output.operation).toBe(operation);
      expect(output.context).toBe(context);
    });

    it('should modify context and strip algebra operation when FROM/FROM NAMED clauses are present', async() => {
      const innerOperation: Algebra.Bgp = { type: Algebra.Types.BGP, patterns: []};
      const operation: Algebra.From = {
        type: Algebra.Types.FROM,
        input: innerOperation,
        default: [ DF.namedNode('http://example.org/default.ttl') ],
        named: [ DF.namedNode('http://example.org/named.ttl') ],
      };
      const context = new ActionContext();

      const output = await actor.run({ operation, context });

      expect(output.operation).toEqual(innerOperation);
      expect(output.context.get(KeysInitQuery.querySourcesUnidentified)).toEqual([
        'http://example.org/default.ttl',
        {
          value: 'http://example.org/named.ttl',
          context: expect.any(ActionContext),
        },
      ]);
    });
  });
});
