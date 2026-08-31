import type { IAction, IActorOutput, IActorTest, IBus, TestResult } from '@comunica/core';
import { failTest, passTest, ActionContext, Actor, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { MediatorRace } from '..';

describe('MediatorRace', () => {
  let bus: IBus;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The MediatorRace module', () => {
    it('should be a function', () => {
      expect(MediatorRace).toBeInstanceOf(Function);
    });

    it('should be a MediatorRace constructor', () => {
      expect(new (<any> MediatorRace)({ name: 'mediator', bus, field: 'field' })).toBeInstanceOf(MediatorRace);
    });
  });

  describe('An MediatorRace instance', () => {
    describe('with passing actors', () => {
      let busm: Bus<DummyActor, IAction, IDummyTest, IDummyTest>;
      let mediator: MediatorRace<DummyActor, IAction, IDummyTest, IDummyTest>;

      beforeEach(() => {
        busm = new Bus({ name: 'bus' });
        mediator = new MediatorRace({ name: 'mediator', bus: busm });
        busm.subscribe(new DummyActor(10, 100, busm, false));
        busm.subscribe(new DummyActor(100, 0, busm, false));
        busm.subscribe(new DummyActor(1, 200, busm, false));
      });

      it('should mediate to the earliest resolver', async() => {
        await expect(mediator.mediate({ context })).resolves.toEqual({ field: 100 });
      });
    });

    describe('with failing actors', () => {
      let busm: Bus<DummyActor, IAction, IDummyTest, IDummyTest>;
      let mediator: MediatorRace<DummyActor, IAction, IDummyTest, IDummyTest>;

      beforeEach(() => {
        busm = new Bus({ name: 'bus' });
        mediator = new MediatorRace({ name: 'mediator', bus: busm });
        busm.subscribe(new DummyActor(10, 100, busm, true));
        busm.subscribe(new DummyActor(100, 0, busm, true));
        busm.subscribe(new DummyActor(1, 200, busm, true));
      });

      it('should reject when mediated', async() => {
        await expect(mediator.mediate({ context })).rejects.toBeTruthy();
      });
    });

    describe('with passing and failing actors', () => {
      let busm: Bus<DummyActor, IAction, IDummyTest, IDummyTest>;
      let mediator: MediatorRace<DummyActor, IAction, IDummyTest, IDummyTest>;

      beforeEach(() => {
        busm = new Bus({ name: 'bus' });
        mediator = new MediatorRace({ name: 'mediator', bus: busm });
        busm.subscribe(new DummyActor(10, 100, busm, false));
        busm.subscribe(new DummyActor(100, 0, busm, true));
        busm.subscribe(new DummyActor(1, 200, busm, false));
      });

      it('should mediate to the earliest non-rejecting resolver', async() => {
        await expect(mediator.mediate({ context })).resolves.toEqual({ field: 10 });
      });
    });

    describe('with passing and rejecting actors', () => {
      let busm: Bus<DummyActor, IAction, IDummyTest, IDummyTest>;
      let mediator: MediatorRace<DummyActor, IAction, IDummyTest, IDummyTest>;

      beforeEach(() => {
        busm = new Bus({ name: 'bus' });
        mediator = new MediatorRace({ name: 'mediator', bus: busm });
        busm.subscribe(new DummyActor(10, 100, busm, false));
        busm.subscribe(new DummyActor(100, 0, busm, false, true));
        busm.subscribe(new DummyActor(1, 200, busm, false));
      });

      it('should throw when mediating', async() => {
        await expect(mediator.mediate({ context })).rejects.toThrow('100');
      });
    });
  });
});

class DummyActor extends Actor<IAction, IDummyTest, IDummyTest> {
  public readonly id: number;
  public readonly delay: number;
  public readonly fail: boolean;
  public readonly reject: boolean;

  public constructor(
    id: number,
    delay: number,
    bus: Bus<DummyActor, IAction, IDummyTest, IDummyTest>,
    fail: boolean,
    reject?: boolean,
  ) {
    super({ name: `dummy${id}`, bus });
    this.id = id;
    this.delay = delay;
    this.fail = fail;
    this.reject = Boolean(reject);
  }

  public async test(): Promise<TestResult<IDummyTest>> {
    if (this.fail) {
      return failTest(`${this.id}`);
    }
    if (this.reject) {
      throw new Error(`${this.id}`);
    }
    return new Promise(resolve => setTimeout(() => resolve(passTest({ field: this.id })), this.delay));
  }

  public async run(): Promise<IDummyTest> {
    return new Promise(resolve => setTimeout(() => resolve({ field: this.id }), this.delay));
  }
}

interface IDummyTest extends IActorTest, IActorOutput {
  field: number;
}
