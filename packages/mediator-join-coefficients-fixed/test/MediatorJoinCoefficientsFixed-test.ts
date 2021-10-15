import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import { KeysCore } from '@comunica/context-entries';
import type { IAction, IActorOutput } from '@comunica/core';
import { ActionContext, Actor, Bus } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import { MediatorJoinCoefficientsFixed } from '../lib/MediatorJoinCoefficientsFixed';

describe('MediatorJoinCoefficientsFixed', () => {
  describe('An MediatorJoinCoefficientsFixed instance', () => {
    let bus: any;
    let mediator: MediatorJoinCoefficientsFixed;
    let debugLog: any;
    let action: IActionRdfJoin;

    beforeEach(() => {
      bus = new Bus({ name: 'bus' });
      mediator = new MediatorJoinCoefficientsFixed({
        name: 'mediator',
        bus,
        cpuWeight: 1,
        memoryWeight: 1,
        timeWeight: 1,
        ioWeight: 1,
      });
      debugLog = jest.fn();
      action = <any> {
        entries: [
          {
            output: <any> {
              type: 'bindings',
              variables: [ 'V' ],
              metadata: () => Promise.resolve({ cardinality: 10 }),
            },
            operation: <any> {},
          },
        ],
        context: ActionContext({
          [KeysCore.log]: {
            debug: debugLog,
          },
        }),
      };
    });

    it('should throw if no actors are registered', async() => {
      await expect(mediator.mediate(action))
        .rejects.toThrow('No actors are able to reply to a message in the bus bus');
    });

    it('should throw if all actors reject', async() => {
      new DummyActor(1, <any>{}, bus, true);
      new DummyActor(2, <any>{}, bus, true);
      new DummyActor(3, <any>{}, bus, true);

      await expect(mediator.mediate(action))
        .rejects.toThrow(`All actors rejected their test in mediator
Actor 1 rejects
Actor 2 rejects
Actor 3 rejects`);
    });

    it('should handle a single actor', async() => {
      new DummyActor(1, {
        iterations: 10,
        persistedItems: 20,
        blockingItems: 30,
        requestTime: 50,
      }, bus);

      expect(await mediator.mediate(action)).toEqual({ id: 1 });

      expect(debugLog).toHaveBeenCalledWith(
        `Determined physical join operator 'PHYSICAL1'`,
        {
          entries: 1,
          variables: [[ 'V' ]],
          coefficients: {
            PHYSICAL1: {
              iterations: 10,
              persistedItems: 20,
              blockingItems: 30,
              requestTime: 50,
            },
          },
          costs: {
            PHYSICAL1: 110,
          },
        },
      );
    });

    it('should handle a single actor without context', async() => {
      new DummyActor(1, {
        iterations: 10,
        persistedItems: 20,
        blockingItems: 30,
        requestTime: 50,
      }, bus);

      action.context = undefined;

      expect(await mediator.mediate(action)).toEqual({ id: 1 });
    });

    it('should handle multiple single actors', async() => {
      new DummyActor(1, {
        iterations: 10,
        persistedItems: 20,
        blockingItems: 30,
        requestTime: 50,
      }, bus);
      new DummyActor(2, {
        iterations: 10,
        persistedItems: 20,
        blockingItems: 30,
        requestTime: 20,
      }, bus);
      new DummyActor(3, {
        iterations: 1_000,
        persistedItems: 20,
        blockingItems: 30,
        requestTime: 10,
      }, bus);

      expect(await mediator.mediate(action)).toEqual({ id: 2 });

      expect(debugLog).toHaveBeenCalledWith(
        `Determined physical join operator 'PHYSICAL2'`,
        {
          entries: 1,
          variables: [[ 'V' ]],
          coefficients: {
            PHYSICAL1: {
              iterations: 10,
              persistedItems: 20,
              blockingItems: 30,
              requestTime: 50,
            },
            PHYSICAL2: {
              iterations: 10,
              persistedItems: 20,
              blockingItems: 30,
              requestTime: 20,
            },
            PHYSICAL3: {
              iterations: 1_000,
              persistedItems: 20,
              blockingItems: 30,
              requestTime: 10,
            },
          },
          costs: {
            PHYSICAL1: 110,
            PHYSICAL2: 80,
            PHYSICAL3: 1_060,
          },
        },
      );
    });

    it('should handle multiple single actors with one rejecting', async() => {
      new DummyActor(1, {
        iterations: 10,
        persistedItems: 20,
        blockingItems: 30,
        requestTime: 50,
      }, bus);
      new DummyActor(2, {
        iterations: 10,
        persistedItems: 20,
        blockingItems: 30,
        requestTime: 20,
      }, bus, true);
      new DummyActor(3, {
        iterations: 1_000,
        persistedItems: 20,
        blockingItems: 30,
        requestTime: 10,
      }, bus);

      expect(await mediator.mediate(action)).toEqual({ id: 1 });

      expect(debugLog).toHaveBeenCalledWith(
        `Determined physical join operator 'PHYSICAL1'`,
        {
          entries: 1,
          variables: [[ 'V' ]],
          coefficients: {
            PHYSICAL1: {
              iterations: 10,
              persistedItems: 20,
              blockingItems: 30,
              requestTime: 50,
            },
            PHYSICAL3: {
              iterations: 1_000,
              persistedItems: 20,
              blockingItems: 30,
              requestTime: 10,
            },
          },
          costs: {
            PHYSICAL1: 110,
            PHYSICAL3: 1_060,
          },
        },
      );
    });

    it('should handle multiple single actors with modified weights', async() => {
      mediator = new MediatorJoinCoefficientsFixed({
        name: 'mediator',
        bus,
        cpuWeight: 1,
        memoryWeight: 1,
        timeWeight: 1,
        ioWeight: 10_000,
      });

      new DummyActor(1, {
        iterations: 10,
        persistedItems: 20,
        blockingItems: 30,
        requestTime: 50,
      }, bus);
      new DummyActor(2, {
        iterations: 10,
        persistedItems: 20,
        blockingItems: 30,
        requestTime: 20,
      }, bus);
      new DummyActor(3, {
        iterations: 1_000,
        persistedItems: 20,
        blockingItems: 30,
        requestTime: 10,
      }, bus);

      expect(await mediator.mediate(action)).toEqual({ id: 3 });

      expect(debugLog).toHaveBeenCalledWith(
        `Determined physical join operator 'PHYSICAL3'`,
        {
          entries: 1,
          variables: [[ 'V' ]],
          coefficients: {
            PHYSICAL1: {
              iterations: 10,
              persistedItems: 20,
              blockingItems: 30,
              requestTime: 50,
            },
            PHYSICAL2: {
              iterations: 10,
              persistedItems: 20,
              blockingItems: 30,
              requestTime: 20,
            },
            PHYSICAL3: {
              iterations: 1_000,
              persistedItems: 20,
              blockingItems: 30,
              requestTime: 10,
            },
          },
          costs: {
            PHYSICAL1: 500_060,
            PHYSICAL2: 200_060,
            PHYSICAL3: 101_050,
          },
        },
      );
    });
  });
});

class DummyActor extends Actor<IAction, IMediatorTypeJoinCoefficients, IDummyOutput> {
  public readonly physicalName: string;
  public readonly id: number;
  public readonly coeffs: IMediatorTypeJoinCoefficients;
  public readonly reject: boolean;

  public constructor(
    id: number,
    coeffs: IMediatorTypeJoinCoefficients,
    bus: Bus<DummyActor, IAction, IMediatorTypeJoinCoefficients, IDummyOutput>,
    reject = false,
  ) {
    super({ name: `dummy${id}`, bus });
    this.physicalName = `PHYSICAL${id}`;
    this.id = id;
    this.coeffs = coeffs;
    this.reject = reject;
  }

  public async test(action: IAction): Promise<IMediatorTypeJoinCoefficients> {
    if (this.reject) {
      throw new Error(`Actor ${this.id} rejects`);
    }
    return this.coeffs;
  }

  public async run(action: IAction): Promise<IDummyOutput> {
    return { id: this.id };
  }
}

interface IDummyOutput extends IActorOutput {
  id: number;
}
