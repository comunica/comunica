import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IPhysicalQueryPlanLogger } from '@comunica/types';
import { ActorQueryOperationTyped } from '..';

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
      expect(() => { (<any> ActorQueryOperationTyped)(); }).toThrow();
    });

    it('should not be able to create new ActorQueryOperationTyped objects without an operation name', () => {
      expect(() => { new (<any> ActorQueryOperationTyped)({ name: 'actor', bus }, null); }).toThrow();
    });
  });

  describe('An ActorQueryOperationTyped instance', () => {
    const actor = new (<any> ActorQueryOperationTyped)({ name: 'actor', bus }, 'op');
    actor.testOperation = () => Promise.resolve({ metadata: {}});
    actor.runOperation = () => Promise.resolve({ metadata: {}});

    it('should not test without operation', () => {
      return expect(actor.test({ context: new ActionContext() })).rejects.toBeTruthy();
    });

    it('should not test with an invalid operation', () => {
      return expect(actor.test({ operation: { type: 'other-op' }, context: new ActionContext() })).rejects.toBeTruthy();
    });

    it('should test with a valid operation', () => {
      return expect(actor.test({ operation: { type: 'op' }, context: new ActionContext() })).resolves.toBeTruthy();
    });

    it('should run', () => {
      return expect(actor.run({ operation: { type: 'op' }, context: new ActionContext() })).resolves.toBeTruthy();
    });

    it('should run and invoke the physicalQueryPlanLogger', async() => {
      const parentNode = '';
      const logger: IPhysicalQueryPlanLogger = {
        logOperation: jest.fn(),
        toJson: jest.fn(),
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
      }));
    });
  });
});
