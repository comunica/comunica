import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus, passTest } from '@comunica/core';
import type { IPhysicalQueryPlanLogger, IPhysicalQueryPlanNode } from '@comunica/types';
import { ActorQueryOperationTyped, BusQueryOperation } from '..';
import '@comunica/utils-jest';

describe('ActorQueryOperationTyped', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorQueryOperationTyped module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationTyped).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationTyped constructor', () => {
      expect(new (<any> ActorQueryOperationTyped)({ name: 'actor', bus }, 'bla'))
        .toBeInstanceOf(ActorQueryOperationTyped);
    });

    it('should not be able to create new ActorQueryOperationTyped objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryOperationTyped)();
      }).toThrow(`Class constructor ActorQueryOperationTyped cannot be invoked without 'new'`);
    });

    it('should not be able to create new ActorQueryOperationTyped objects without an operation name', () => {
      expect(() => {
        new (<any> ActorQueryOperationTyped)({ name: 'actor', bus }, null);
      }).toThrow(`A valid "operationName" argument must be provided.`);
    });
  });

  describe('when subscribed to a BusQueryOperation', () => {
    // Regression guard: the operation name must already be set on the actor by the time
    // `Actor`'s constructor subscribes it to the bus. If it is only assigned after `super(...)`,
    // every actor is indexed as unidentified, and every action gets published to every actor.
    it('should only be published to for actions of its own operation type', async() => {
      const busIndexed = new BusQueryOperation({ name: 'bus-indexed' });
      const actorOp1 = new (<any> ActorQueryOperationTyped)({ name: 'actor-op1', bus: busIndexed }, 'op1');
      const actorOp2 = new (<any> ActorQueryOperationTyped)({ name: 'actor-op2', bus: busIndexed }, 'op2');
      actorOp1.testOperation = () => Promise.resolve(passTest({}));
      actorOp2.testOperation = () => Promise.resolve(passTest({}));

      const replies = busIndexed.publish(<any> { operation: { type: 'op1' }, context: new ActionContext() });
      await Promise.all(replies.map(reply => reply.reply));

      expect(replies.map(reply => reply.actor.name)).toEqual([ 'actor-op1' ]);
    });

    it('should expose its operation name to the bus index', () => {
      const busIndexed = new BusQueryOperation({ name: 'bus-indexed' });
      const actor = new (<any> ActorQueryOperationTyped)({ name: 'actor-op1', bus: busIndexed }, 'op1');
      expect(actor.operationName).toBe('op1');
      expect((<any> busIndexed).actorsIndex).toHaveProperty('op1', [ actor ]);
      expect((<any> busIndexed).actorsIndex).not.toHaveProperty('_undefined_');
    });
  });

  describe('An ActorQueryOperationTyped instance', () => {
    const actor = new (<any> ActorQueryOperationTyped)({ name: 'actor', bus }, 'op');
    actor.testOperation = () => Promise.resolve(passTest({ metadata: {}}));
    actor.runOperation = () => Promise.resolve({ metadata: {}});

    it('should not test without operation', async() => {
      await expect(actor.test({ context: new ActionContext() })).resolves.toFailTest(`Missing field 'operation' in a query operation action.`);
    });

    it('should not test with an invalid operation', async() => {
      await expect(actor.test({ operation: { type: 'other-op' }, context: new ActionContext() })).resolves.toFailTest(`Actor actor only supports op operations, but got other-op`);
    });

    it('should test with a valid operation', async() => {
      await expect(actor.test({ operation: { type: 'op' }, context: new ActionContext() }))
        .resolves.toPassTest({ metadata: {}});
    });

    it('should run', async() => {
      await expect(actor.run({ operation: { type: 'op' }, context: new ActionContext() })).resolves.toBeTruthy();
    });

    it('should run and invoke the physicalQueryPlanLogger', async() => {
      const parentNode: IPhysicalQueryPlanNode = <any> { id: 'parent' };
      const planNode: IPhysicalQueryPlanNode = {
        appendMetadata: jest.fn(),
        adoptInput: jest.fn(),
        setOutput: jest.fn(),
      };
      const logger: IPhysicalQueryPlanLogger = {
        logOperation: jest.fn().mockReturnValue(planNode),
        finalize: jest.fn(),
        getNodeForOutput: jest.fn(),
        toJson: jest.fn(),
      };
      const context = new ActionContext({
        [KeysInitQuery.physicalQueryPlanLogger.name]: logger,
        [KeysInitQuery.physicalQueryPlanNode.name]: parentNode,
      });
      jest.spyOn(actor, 'runOperation');

      const operation = { type: 'op' };
      const action = { operation, context };
      const output = await actor.run(action);

      expect(logger.logOperation).toHaveBeenCalledWith({
        logicalOperator: 'op',
        parentNode,
        actor: 'actor',
        operation,
      });
      expect(planNode.setOutput).toHaveBeenCalledWith(output);
      expect(actor.runOperation).toHaveBeenCalledWith(operation, new ActionContext({
        [KeysInitQuery.physicalQueryPlanLogger.name]: logger,
        [KeysInitQuery.physicalQueryPlanNode.name]: planNode,
        [KeysQueryOperation.operation.name]: operation,
      }), undefined);
    });
  });
});
