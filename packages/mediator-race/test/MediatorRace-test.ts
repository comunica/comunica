import type { IAction, IActorOutput, IActorTest, IBus } from '@comunica/core';
import { ActionContext, Actor, Bus } from '@comunica/core';
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
    describe('with resolving actors', () => {
      let busm: Bus<DummyActor, IAction, IDummyTest, IDummyTest>;
      let mediator: MediatorRace<DummyActor, IAction, IDummyTest, IDummyTest>;

      beforeEach(() => {
        busm = new Bus({ name: 'bus' });
        mediator = new MediatorRace({ name: 'mediator', bus: busm });
        busm.subscribe(new DummyActor(10, 100, busm, false));
        busm.subscribe(new DummyActor(100, 0, busm, false));
        busm.subscribe(new DummyActor(1, 200, busm, false));
      });

      it('should mediate to the earliest resolver', () => {
        return expect(mediator.mediate({ context })).resolves.toEqual({ field: 100 });
      });
    });

    describe('with rejecting actors', () => {
      let busm: Bus<DummyActor, IAction, IDummyTest, IDummyTest>;
      let mediator: MediatorRace<DummyActor, IAction, IDummyTest, IDummyTest>;

      beforeEach(() => {
        busm = new Bus({ name: 'bus' });
        mediator = new MediatorRace({ name: 'mediator', bus: busm });
        busm.subscribe(new DummyActor(10, 100, busm, true));
        busm.subscribe(new DummyActor(100, 0, busm, true));
        busm.subscribe(new DummyActor(1, 200, busm, true));
      });

      it('should reject when mediated', () => {
        return expect(mediator.mediate({ context })).rejects.toBeTruthy();
      });
    });

    describe('with resolving and rejecting actors', () => {
      let busm: Bus<DummyActor, IAction, IDummyTest, IDummyTest>;
      let mediator: MediatorRace<DummyActor, IAction, IDummyTest, IDummyTest>;
      let actor0;
      let actor1;
      let actor2;

      beforeEach(() => {
        busm = new Bus({ name: 'bus' });
        mediator = new MediatorRace({ name: 'mediator', bus: busm });
        busm.subscribe(actor0 = new DummyActor(10, 100, busm, false));
        busm.subscribe(actor1 = new DummyActor(100, 0, busm, true));
        busm.subscribe(actor2 = new DummyActor(1, 200, busm, false));
      });

      it('should mediate to the earliest non-rejecting resolver', () => {
        return expect(mediator.mediate({ context })).resolves.toEqual({ field: 10 });
      });
    });
  });
});

class DummyActor extends Actor<IAction, IDummyTest, IDummyTest> {
  public readonly id: number;
  public readonly delay: number;
  public readonly reject: boolean;

  public constructor(id: number,
    delay: number,
    bus: Bus<DummyActor, IAction, IDummyTest, IDummyTest>,
    reject: boolean) {
    super({ name: `dummy${id}`, bus });
    this.id = id;
    this.delay = delay;
    this.reject = reject;
  }

  public test(action: IAction): Promise<IDummyTest> {
    if (this.reject) {
      return Promise.reject(new Error(`${this.id}`));
    }
    return new Promise((resolve, reject) => setTimeout(() => resolve({ field: this.id }), this.delay));
  }

  public run(action: IAction): Promise<IDummyTest> {
    return new Promise((resolve, reject) => setTimeout(() => resolve({ field: this.id }), this.delay));
  }
}

interface IDummyTest extends IActorTest, IActorOutput {
  field: number;
}
