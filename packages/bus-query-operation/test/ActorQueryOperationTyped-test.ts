import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus, passTest } from '@comunica/core';
import type { IPhysicalQueryPlanLogger } from '@comunica/types';
import { ActorQueryOperationTyped } from '..';
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
      const parentNode = '';
      const logger: IPhysicalQueryPlanLogger = {
        logOperation: jest.fn(),
        toJson: jest.fn(),
        stashChildren: jest.fn(),
        unstashChild: jest.fn(),
        appendMetadata: jest.fn(),
      };
      const context = new ActionContext({
        [KeysInitQuery.physicalQueryPlanLogger.name]: logger,
        [KeysInitQuery.physicalQueryPlanNode.name]: parentNode,
      });
      jest.spyOn(actor, 'runOperation');

      const operation = { type: 'op' };
      const action = { operation, context };
      await actor.run(action);

      expect(logger.logOperation).toHaveBeenCalledWith(
        'op',
        undefined,
        operation,
        parentNode,
        'actor',
        {},
      );
      expect(actor.runOperation).toHaveBeenCalledWith(operation, new ActionContext({
        [KeysInitQuery.physicalQueryPlanLogger.name]: logger,
        [KeysInitQuery.physicalQueryPlanNode.name]: operation,
        [KeysQueryOperation.operation.name]: operation,
      }), undefined);
    });
  });
});
