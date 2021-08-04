import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { ActorQueryOperationBgpSingle } from '../lib/ActorQueryOperationBgpSingle';

describe('ActorQueryOperationBgpSingle', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({ operated: arg }),
    };
  });

  describe('The ActorQueryOperationBgpSingle module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationBgpSingle).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationBgpSingle constructor', () => {
      expect(new (<any> ActorQueryOperationBgpSingle)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationBgpSingle);
      expect(new (<any> ActorQueryOperationBgpSingle)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationBgpSingle objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationBgpSingle)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationBgpSingle instance', () => {
    let actor: ActorQueryOperationBgpSingle;

    beforeEach(() => {
      actor = new ActorQueryOperationBgpSingle({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should not test on empty BGPs', () => {
      const op: any = { operation: { type: 'bgp', patterns: []}};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should test on BGPs with a single pattern', () => {
      const op: any = { operation: { type: 'bgp', patterns: [ 'abc' ]}};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on BGPs with more than one pattern', () => {
      const op: any = { operation: { type: 'bgp', patterns: [ 'abc', 'def' ]}};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run with a context and delegate the pattern to the mediator', () => {
      const op: any = { operation: { type: 'bgp', patterns: [ 'abc' ]}, context: ActionContext({ c: 'C' }) };
      return actor.run(op).then(async output => {
        expect(output).toMatchObject({ operated: {
          context: ActionContext({ c: 'C', [KeysQueryOperation.operation]: op.operation }),
          operation: 'abc',
        }});
      });
    });

    it('should run with a context with parent metadata and delegate the pattern to the mediator', () => {
      const context = ActionContext({
        [KeysQueryOperation.bgpParentMetadata]: [{
          a: 'b',
        }],
      });
      const op: any = { operation: { type: 'bgp', patterns: [ 'abc' ]}, context };
      return actor.run(op).then(async output => {
        expect(output).toMatchObject({
          operated: {
            context: ActionContext({
              [KeysQueryOperation.patternParentMetadata]: { a: 'b' },
              [KeysQueryOperation.operation]: op.operation,
            }),
            operation: 'abc',
          },
        });
      });
    });

    it('should run without a context and delegate the pattern to the mediator', () => {
      const op: any = { operation: { type: 'bgp', patterns: [ 'abc' ]}};
      return actor.run(op).then(async output => {
        expect(output).toMatchObject({ operated: { operation: 'abc' }});
      });
    });
  });
});
