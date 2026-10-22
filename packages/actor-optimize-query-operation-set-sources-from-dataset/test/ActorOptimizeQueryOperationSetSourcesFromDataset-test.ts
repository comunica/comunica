import type { IActionOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { Algebra } from '@comunica/utils-algebra';
import { DataFactory } from 'rdf-data-factory';
import { ActorOptimizeQueryOperationSetSourcesFromDataset } from '../lib/index';
import '@comunica/utils-jest';

const DF = new DataFactory();

function from(defaultGraphs: string[], namedGraphs: string[], input: Algebra.Operation): Algebra.From {
  return {
    type: Algebra.Types.FROM,
    input,
    default: defaultGraphs.map(graph => DF.namedNode(graph)),
    named: namedGraphs.map(graph => DF.namedNode(graph)),
  };
}

describe('ActorOptimizeQueryOperationSetSourcesFromDataset', () => {
  let bus: any;
  let actor: ActorOptimizeQueryOperationSetSourcesFromDataset;
  const bgp: Algebra.Bgp = { type: Algebra.Types.BGP, patterns: []};

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    actor = new ActorOptimizeQueryOperationSetSourcesFromDataset({ name: 'actor', bus });
  });

  describe('test', () => {
    it('fails if dereferenceFromNamed is not enabled', async() => {
      const action: IActionOptimizeQueryOperation = {
        context: new ActionContext(),
        operation: from([ 'http://example.org/default.ttl' ], [], bgp),
      };
      await expect(actor.test(action)).resolves.toFailTest(
        'This actor can only be used when dereferenceFromNamed is enabled.',
      );
    });

    it('fails if the operation has no dataset clauses', async() => {
      const action: IActionOptimizeQueryOperation = {
        context: new ActionContext().set(KeysInitQuery.dereferenceFromNamed, true),
        operation: bgp,
      };
      await expect(actor.test(action)).resolves.toFailTest(
        'This actor can only be used on queries with a FROM or FROM NAMED clause.',
      );
    });

    it('passes if dereferenceFromNamed is enabled and dataset clauses are present', async() => {
      const action: IActionOptimizeQueryOperation = {
        context: new ActionContext().set(KeysInitQuery.dereferenceFromNamed, true),
        operation: from([ 'http://example.org/default.ttl' ], [], bgp),
      };
      await expect(actor.test(action)).resolves.toPassTestVoid();
    });
  });

  describe('run', () => {
    it('should append the dataset clauses as sources, and strip them from the operation', async() => {
      const operation = from([ 'http://example.org/default.ttl' ], [ 'http://example.org/named.ttl' ], bgp);
      const output = await actor.run({ operation, context: new ActionContext() });

      expect(output.operation).toBe(bgp);
      expect(output.context.get(KeysInitQuery.querySourcesUnidentified)).toEqual([
        'http://example.org/default.ttl',
        {
          value: 'http://example.org/named.ttl',
          context: expect.any(ActionContext),
        },
      ]);
    });

    it('should tag FROM NAMED sources with the named graph they must be exposed under', async() => {
      const operation = from([], [ 'http://example.org/named.ttl' ], bgp);
      const output = await actor.run({ operation, context: new ActionContext() });

      const sources = output.context.get(KeysInitQuery.querySourcesUnidentified)!;
      const sourceContext = <IActionContext> (<any> sources[0]).context;
      expect(sourceContext.get(KeysQueryOperation.sourceAsNamedGraph))
        .toEqual(DF.namedNode('http://example.org/named.ttl'));
    });

    it('should deduplicate FROM sources that are already present in the context', async() => {
      const operation = from([ 'http://example.org/default.ttl' ], [], bgp);
      const context = new ActionContext({
        [KeysInitQuery.querySourcesUnidentified.name]: [ 'http://example.org/default.ttl' ],
      });
      const output = await actor.run({ operation, context });

      expect(output.context.get(KeysInitQuery.querySourcesUnidentified)).toEqual([
        'http://example.org/default.ttl',
      ]);
    });
  });
});
