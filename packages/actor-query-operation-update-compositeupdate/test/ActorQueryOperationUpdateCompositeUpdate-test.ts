import type { IActorQueryOperationOutputUpdate } from '@comunica/bus-query-operation';
import { ActorQueryOperation, KEY_CONTEXT_READONLY } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import { ActorQueryOperationUpdateCompositeUpdate } from '../lib/ActorQueryOperationUpdateCompositeUpdate';

describe('ActorQueryOperationUpdateCompositeUpdate', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate(arg: any) {
        if (arg.operation === 'RESOLVE') {
          return Promise.resolve({
            type: 'update',
            updateResult: Promise.resolve(),
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
      expect(() => { (<any> ActorQueryOperationUpdateCompositeUpdate)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationUpdateCompositeUpdate instance', () => {
    let actor: ActorQueryOperationUpdateCompositeUpdate;

    beforeEach(() => {
      actor = new ActorQueryOperationUpdateCompositeUpdate({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on compositeupdate', () => {
      const op = { operation: { type: 'compositeupdate' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on readOnly', () => {
      const op = { operation: { type: 'compositeupdate' }, context: ActionContext({ [KEY_CONTEXT_READONLY]: true }) };
      return expect(actor.test(op)).rejects.toThrowError(`Attempted a write operation in read-only mode`);
    });

    it('should not test on non-compositeupdate', () => {
      const op = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run without updates', async() => {
      const op = {
        operation: {
          type: 'compositeupdate',
          updates: [],
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
    });

    it('should run with one operation', async() => {
      const op = {
        operation: {
          type: 'compositeupdate',
          updates: [
            'RESOLVE',
          ],
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
    });

    it('should run with one three operations', async() => {
      const op = {
        operation: {
          type: 'compositeupdate',
          updates: [
            'RESOLVE',
            'RESOLVE',
            'RESOLVE',
          ],
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
    });
  });
});
