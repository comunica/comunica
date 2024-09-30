import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultVoid } from '@comunica/types';
import { ActorQueryOperationUpdateCompositeUpdate } from '../lib/ActorQueryOperationUpdateCompositeUpdate';
import '@comunica/utils-jest';

describe('ActorQueryOperationUpdateCompositeUpdate', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate(arg: any) {
        if (arg.operation === 'RESOLVE') {
          return Promise.resolve({
            type: 'void',
            execute: () => Promise.resolve(),
          });
        }
        throw new Error(`INVALID OPERATION ${JSON.stringify(arg)}`);
      },
    };
  });

  describe('The ActorQueryOperationUpdateCompositeUpdate module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationUpdateCompositeUpdate).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationUpdateCompositeUpdate constructor', () => {
      expect(new (<any> ActorQueryOperationUpdateCompositeUpdate)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationUpdateCompositeUpdate);
      expect(new (<any> ActorQueryOperationUpdateCompositeUpdate)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationUpdateCompositeUpdate objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryOperationUpdateCompositeUpdate)();
      }).toThrow(`Class constructor ActorQueryOperationUpdateCompositeUpdate cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryOperationUpdateCompositeUpdate instance', () => {
    let actor: ActorQueryOperationUpdateCompositeUpdate;

    beforeEach(() => {
      actor = new ActorQueryOperationUpdateCompositeUpdate({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on compositeupdate', async() => {
      const op: any = { operation: { type: 'compositeupdate' }, context: new ActionContext() };
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should not test on readOnly', async() => {
      const op: any = {
        operation: { type: 'compositeupdate' },
        context: new ActionContext({ [KeysQueryOperation.readOnly.name]: true }),
      };
      await expect(actor.test(op)).resolves.toFailTest(`Attempted a write operation in read-only mode`);
    });

    it('should not test on non-compositeupdate', async() => {
      const op: any = { operation: { type: 'some-other-type' }, context: new ActionContext() };
      await expect(actor.test(op)).resolves.toFailTest(`Actor actor only supports compositeupdate operations, but got some-other-type`);
    });

    it('should run without updates', async() => {
      const op: any = {
        operation: {
          type: 'compositeupdate',
          updates: [],
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
    });

    it('should run with one operation', async() => {
      const op: any = {
        operation: {
          type: 'compositeupdate',
          updates: [
            'RESOLVE',
          ],
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
    });

    it('should run with one three operations', async() => {
      const op: any = {
        operation: {
          type: 'compositeupdate',
          updates: [
            'RESOLVE',
            'RESOLVE',
            'RESOLVE',
          ],
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
    });
  });
});
