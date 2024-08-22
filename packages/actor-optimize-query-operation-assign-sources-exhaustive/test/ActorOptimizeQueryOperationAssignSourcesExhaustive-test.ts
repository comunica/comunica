import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery, KeysQueryOperation, KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQuerySourceWrapper } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory } from 'sparqlalgebrajs';
import {
  ActorOptimizeQueryOperationAssignSourcesExhaustive,
} from '../lib/ActorOptimizeQueryOperationAssignSourcesExhaustive';

const AF = new Factory();
const DF = new DataFactory();

describe('ActorOptimizeQueryOperationAssignSourcesExhaustive', () => {
  let bus: any;

  const source1: IQuerySourceWrapper = <any> {
    source: {
      referenceValue: 'source1',
      getSelectorShape: () => ({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.types.PROJECT,
        },
      }),
    },
  };
  const sourcePattern: IQuerySourceWrapper = <any> {
    source: {
      referenceValue: 'source1',
      getSelectorShape: () => ({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.types.PATTERN,
        },
      }),
    },
  };

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorOptimizeQueryOperationAssignSourcesExhaustive instance', () => {
    let actor: ActorOptimizeQueryOperationAssignSourcesExhaustive;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationAssignSourcesExhaustive({ name: 'actor', bus });
    });

    it('should test', async() => {
      await expect(actor.test({
        operation: AF.createNop(),
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      })).resolves.toBeTruthy();
    });

    describe('run', () => {
      it('should pass operation for no sources', async() => {
        const operationIn = AF.createNop();
        const { operation: operationOut } = await actor.run({
          operation: operationIn,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
        });
        expect(operationOut).toBe(operationIn);
      });

      it('should pass operation for a zero-length sources array', async() => {
        const operationIn = AF.createNop();
        const { operation: operationOut } = await actor.run({
          operation: operationIn,
          context: new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
          }).set(KeysQueryOperation.querySources, []),
        });
        expect(operationOut).toBe(operationIn);
      });

      it('should globally assign operation to 1 source without destination that accepts the operation', async() => {
        const operationIn = AF.createNop();
        const { operation: operationOut } = await actor.run({
          operation: operationIn,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF })
            .set(KeysQueryOperation.querySources, [ source1 ]),
        });
        expect(operationOut).not.toBe(operationIn);
        expect(ActorQueryOperation.getOperationSource(operationOut)).toBe(source1);
      });

      it('should globally assign operation to 1 source with equal destination that accepts the operation', async() => {
        const operationIn = AF.createNop();
        const { operation: operationOut } = await actor.run({
          operation: operationIn,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF })
            .set(KeysQueryOperation.querySources, [ source1 ])
            .set(KeysRdfUpdateQuads.destination, 'source1'),
        });
        expect(operationOut).not.toBe(operationIn);
        expect(ActorQueryOperation.getOperationSource(operationOut)).toBe(source1);
      });

      it('should exhaustively assign operation to 1 source with non-equal destination', async() => {
        const operationIn = AF.createBgp([
          AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          AF.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        ]);
        const { operation: operationOut } = await actor.run({
          operation: operationIn,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF })
            .set(KeysQueryOperation.querySources, [ source1 ])
            .set(KeysRdfUpdateQuads.destination, 'sourceOther'),
        });
        expect(operationOut).not.toBe(operationIn);
        expect(ActorQueryOperation.getOperationSource(operationOut)).toBeUndefined();
        expect(ActorQueryOperation.getOperationSource(operationOut.patterns[0])).toBe(source1);
        expect(ActorQueryOperation.getOperationSource(operationOut.patterns[1])).toBe(source1);
      });

      it('should exhaustively assign operation to 1 source without destination that rejects the operation', async() => {
        const operationIn = AF.createBgp([
          AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          AF.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        ]);
        const { operation: operationOut } = await actor.run({
          operation: operationIn,
          context: new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
          }).set(KeysQueryOperation.querySources, [ sourcePattern ]),
        });
        expect(operationOut).not.toBe(operationIn);
        expect(ActorQueryOperation.getOperationSource(operationOut)).toBeUndefined();
        expect(ActorQueryOperation.getOperationSource(operationOut.patterns[0])).toBe(sourcePattern);
        expect(ActorQueryOperation.getOperationSource(operationOut.patterns[1])).toBe(sourcePattern);
      });

      it('should exhaustively assign operation to 2 sources', async() => {
        const operationIn = AF.createBgp([
          AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          AF.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        ]);
        const { operation: operationOut } = await actor.run({
          operation: operationIn,
          context: new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
          }).set(KeysQueryOperation.querySources, [ source1, sourcePattern ]),
        });
        expect(operationOut).not.toBe(operationIn);
        expect(ActorQueryOperation.getOperationSource(operationOut)).toBeUndefined();
        expect(ActorQueryOperation.getOperationSource(operationOut.patterns[0])).toBeUndefined();
        expect(ActorQueryOperation.getOperationSource(operationOut.patterns[1])).toBeUndefined();
        expect(ActorQueryOperation.getOperationSource(operationOut.patterns[0].input[0])).toBe(source1);
        expect(ActorQueryOperation.getOperationSource(operationOut.patterns[0].input[1])).toBe(sourcePattern);
        expect(ActorQueryOperation.getOperationSource(operationOut.patterns[1].input[0])).toBe(source1);
        expect(ActorQueryOperation.getOperationSource(operationOut.patterns[1].input[1])).toBe(sourcePattern);
      });

      it('should keep the queryString for a single source', async() => {
        const operationIn = AF.createNop();
        const { operation: operationOut, context: contextOut } = await actor.run({
          operation: operationIn,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF })
            .set(KeysQueryOperation.querySources, [ source1 ])
            .set(KeysInitQuery.queryString, 'abc'),
        });
        expect(operationOut).not.toBe(operationIn);
        expect(ActorQueryOperation.getOperationSource(operationOut)).toBe(source1);
        expect(contextOut.get(KeysInitQuery.queryString)).toBe('abc');
      });

      it('should not keep the queryString for two sources', async() => {
        const operationIn = AF.createNop();
        const { operation: operationOut, context: contextOut } = await actor.run({
          operation: operationIn,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF })
            .set(KeysQueryOperation.querySources, [ source1, source1 ])
            .set(KeysInitQuery.queryString, 'abc'),
        });
        expect(operationOut).not.toBe(operationIn);
        expect(contextOut.get(KeysInitQuery.queryString)).toBeUndefined();
      });
    });

    describe('assignExhaustive', () => {
      it('for pattern with one source', async() => {
        const operationIn = AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'));
        const operationOut = actor.assignExhaustive(AF, operationIn, [ source1 ]);
        expect(operationOut.type).toEqual(Algebra.types.PATTERN);
        expect(ActorQueryOperation.getOperationSource(operationOut)).toBe(source1);
      });

      it('for pattern with two sources', async() => {
        const operationIn = AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'));
        const operationOut = actor.assignExhaustive(AF, operationIn, [ source1, sourcePattern ]);
        expect(operationOut.type).toEqual(Algebra.types.UNION);
        expect(operationOut.input).toHaveLength(2);
        expect(operationOut.input[0].type).toEqual(Algebra.types.PATTERN);
        expect(operationOut.input[1].type).toEqual(Algebra.types.PATTERN);
        expect(ActorQueryOperation.getOperationSource(operationOut.input[0])).toBe(source1);
        expect(ActorQueryOperation.getOperationSource(operationOut.input[1])).toBe(sourcePattern);
      });

      it('for link with one source', async() => {
        const operationIn = AF.createLink(DF.namedNode('p1'));
        const operationOut = actor.assignExhaustive(AF, operationIn, [ source1 ]);
        expect(operationOut.type).toEqual(Algebra.types.LINK);
        expect(ActorQueryOperation.getOperationSource(operationOut)).toBe(source1);
      });

      it('for link with two sources', async() => {
        const operationIn = AF.createLink(DF.namedNode('p1'));
        const operationOut = actor.assignExhaustive(AF, operationIn, [ source1, sourcePattern ]);
        expect(operationOut.type).toEqual(Algebra.types.ALT);
        expect(operationOut.input).toHaveLength(2);
        expect(operationOut.input[0].type).toEqual(Algebra.types.LINK);
        expect(operationOut.input[1].type).toEqual(Algebra.types.LINK);
        expect(ActorQueryOperation.getOperationSource(operationOut.input[0])).toBe(source1);
        expect(ActorQueryOperation.getOperationSource(operationOut.input[1])).toBe(sourcePattern);
      });

      it('for nps with one source', async() => {
        const operationIn = AF.createNps([ DF.namedNode('p1'), DF.namedNode('p2') ]);
        const operationOut = actor.assignExhaustive(AF, operationIn, [ source1 ]);
        expect(operationOut.type).toEqual(Algebra.types.NPS);
        expect(ActorQueryOperation.getOperationSource(operationOut)).toBe(source1);
      });

      it('for nps with two sources', async() => {
        const operationIn = AF.createNps([ DF.namedNode('p1'), DF.namedNode('p2') ]);
        const operationOut = actor.assignExhaustive(AF, operationIn, [ source1, sourcePattern ]);
        expect(operationOut.type).toEqual(Algebra.types.ALT);
        expect(operationOut.input).toHaveLength(2);
        expect(operationOut.input[0].type).toEqual(Algebra.types.NPS);
        expect(operationOut.input[1].type).toEqual(Algebra.types.NPS);
        expect(ActorQueryOperation.getOperationSource(operationOut.input[0])).toBe(source1);
        expect(ActorQueryOperation.getOperationSource(operationOut.input[1])).toBe(sourcePattern);
      });

      it('for service with one source should not assign', async() => {
        const operationIn = AF.createService(AF.createNop(), DF.namedNode('source'));
        const operationOut = actor.assignExhaustive(AF, operationIn, [ source1 ]);
        expect(operationOut.type).toEqual(Algebra.types.SERVICE);
        expect(ActorQueryOperation.getOperationSource(operationOut)).toBeUndefined();
      });

      it('for a construct query', async() => {
        const operationIn = AF.createConstruct(
          AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          [
            AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          ],
        );
        const operationOut = actor.assignExhaustive(AF, operationIn, [ source1 ]);
        expect(operationOut.type).toEqual(Algebra.types.CONSTRUCT);
        expect(operationOut.input.type).toEqual(Algebra.types.PATTERN);
        expect(ActorQueryOperation.getOperationSource(operationOut.input)).toBe(source1);
      });

      it('for a delete-insert query', async() => {
        const operationIn = AF.createDeleteInsert(
          [
            AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          ],
          [
            AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          ],
          AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        );
        const operationOut = actor.assignExhaustive(AF, operationIn, [ source1 ]);
        expect(operationOut.type).toEqual(Algebra.types.DELETE_INSERT);
        expect(operationOut.where.type).toEqual(Algebra.types.PATTERN);
        expect(ActorQueryOperation.getOperationSource(operationOut.delete[0])).not.toBe(source1);
        expect(ActorQueryOperation.getOperationSource(operationOut.insert[0])).not.toBe(source1);
        expect(ActorQueryOperation.getOperationSource(operationOut.where)).toBe(source1);
      });
    });
  });
});
