import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { DataFactory } from 'rdf-data-factory';
import { ActorOptimizeQueryOperationLeftjoinExpressionPushdown } from '..';
import '@comunica/utils-jest';

const AF = new AlgebraFactory();
const DF = new DataFactory();

describe('ActorOptimizeQueryOperationLeftjoinExpressionPushdown', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorOptimizeQueryOperationLeftjoinExpressionPushdown instance', () => {
    let actor: ActorOptimizeQueryOperationLeftjoinExpressionPushdown;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationLeftjoinExpressionPushdown({ name: 'actor', bus });
    });

    it('should test', async() => {
      await expect(actor.test({ context: new ActionContext(), operation: AF.createNop() })).resolves.toPassTestVoid();
    });

    describe('run', () => {
      it('for an operation without leftjoin', async() => {
        const operationIn = AF.createNop();
        const { operation: operationOut } = await actor.run({
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
          operation: operationIn,
        });
        expect(operationOut).toEqual(operationIn);
      });

      it('for an operation with leftjoin that overlaps only left', async() => {
        const operationIn = AF.createLeftJoin(
          AF.createProject(
            AF.createBgp([]),
            [ DF.variable('s1'), DF.variable('p1') ],
          ),
          AF.createProject(
            AF.createBgp([]),
            [ DF.variable('s2'), DF.variable('p2') ],
          ),
          AF.createTermExpression(DF.variable('s1')),
        );
        const { operation: operationOut } = await actor.run({
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
          operation: operationIn,
        });
        expect(operationOut).toEqual(AF.createLeftJoin(
          AF.createFilter(
            AF.createProject(
              AF.createBgp([]),
              [ DF.variable('s1'), DF.variable('p1') ],
            ),
            AF.createTermExpression(DF.variable('s1')),
          ),
          AF.createProject(
            AF.createBgp([]),
            [ DF.variable('s2'), DF.variable('p2') ],
          ),
        ));
      });

      it('for an operation with leftjoin that overlaps only right', async() => {
        const operationIn = AF.createLeftJoin(
          AF.createProject(
            AF.createBgp([]),
            [ DF.variable('s1'), DF.variable('p1') ],
          ),
          AF.createProject(
            AF.createBgp([]),
            [ DF.variable('s2'), DF.variable('p2') ],
          ),
          AF.createTermExpression(DF.variable('s2')),
        );
        const { operation: operationOut } = await actor.run({
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
          operation: operationIn,
        });
        expect(operationOut).toEqual(AF.createLeftJoin(
          AF.createProject(
            AF.createBgp([]),
            [ DF.variable('s1'), DF.variable('p1') ],
          ),
          AF.createFilter(
            AF.createProject(
              AF.createBgp([]),
              [ DF.variable('s2'), DF.variable('p2') ],
            ),
            AF.createTermExpression(DF.variable('s2')),
          ),
        ));
      });

      it('for an operation with leftjoin that overlaps left and right', async() => {
        const operationIn = AF.createLeftJoin(
          AF.createProject(
            AF.createBgp([]),
            [ DF.variable('s1'), DF.variable('p1') ],
          ),
          AF.createProject(
            AF.createBgp([]),
            [ DF.variable('s1'), DF.variable('p2') ],
          ),
          AF.createTermExpression(DF.variable('s1')),
        );
        const { operation: operationOut } = await actor.run({
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
          operation: operationIn,
        });
        expect(operationOut).toEqual(operationIn);
      });
    });
  });
});
