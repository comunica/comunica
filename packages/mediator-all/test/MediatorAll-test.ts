import type { IAction, IActorOutput, IActorTest, TestResult } from '@comunica/core';
import { failTest, passTest, Actor, Bus, Mediator } from '@comunica/core';
import { MediatorAll } from '../lib/MediatorAll';

describe('MediatorAll', () => {
  let bus: Bus<DummyActor, IAction, IDummyTest, IDummyTest>;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The MediatorAll module', () => {
    it('should be a function', () => {
      expect(MediatorAll).toBeInstanceOf(Function);
    });

    it('should be a MediatorAll constructor', () => {
      expect(new (<any> MediatorAll)({ name: 'mediator', bus }))
        .toBeInstanceOf(MediatorAll);
      expect(new (<any> MediatorAll)({ name: 'mediator', bus }))
        .toBeInstanceOf(Mediator);
    });
  });

  describe('An MediatorAll instance', () => {
    describe('without actors', () => {
      let busm: Bus<DummyActor, IAction, IDummyTest, IDummyTest>;
      let mediator: MediatorAll<DummyActor, IAction, IDummyTest, IDummyTest>;

      beforeEach(() => {
        busm = new Bus({ name: 'bus' });
        mediator = new MediatorAll({ name: 'mediator', bus: busm });
      });

      it('should mediate to all resolving actors', async() => {
        await expect(mediator.mediate(<any> { a: 'b' })).resolves.toBeUndefined();
      });

      it('should throw for mediateWith', async() => {
        await expect((<any> mediator).mediateWith()).rejects
          .toThrow(new Error('Unsupported operation: MediatorAll#mediateWith'));
      });
    });

    describe('with passing actors', () => {
      let busm: Bus<DummyActor, IAction, IDummyTest, IDummyTest>;
      let mediator: MediatorAll<DummyActor, IAction, IDummyTest, IDummyTest>;
      let a0: DummyActor;
      let a1: DummyActor;
      let a2: DummyActor;

      beforeEach(() => {
        busm = new Bus({ name: 'bus' });
        mediator = new MediatorAll({ name: 'mediator', bus: busm });
        busm.subscribe(a0 = new DummyActor(10, 10, busm, false));
        busm.subscribe(a1 = new DummyActor(100, 0, busm, false));
        busm.subscribe(a2 = new DummyActor(1, 20, busm, false));
        jest.spyOn(a0, 'runObservable');
        jest.spyOn(a1, 'runObservable');
        jest.spyOn(a2, 'runObservable');
      });

      it('should mediate to all resolving actors', async() => {
        await expect(mediator.mediate(<any> { a: 'b' })).resolves.toEqual({ field: 10 });
        expect(a0.runObservable).toHaveBeenCalledWith({ a: 'b' }, undefined);
        expect(a1.runObservable).toHaveBeenCalledWith({ a: 'b' }, undefined);
        expect(a2.runObservable).toHaveBeenCalledWith({ a: 'b' }, undefined);
      });
    });

    describe('with failing actors', () => {
      let busm: Bus<DummyActor, IAction, IDummyTest, IDummyTest>;
      let mediator: MediatorAll<DummyActor, IAction, IDummyTest, IDummyTest>;
      let a0: DummyActor;
      let a1: DummyActor;
      let a2: DummyActor;

      beforeEach(() => {
        busm = new Bus({ name: 'bus' });
        mediator = new MediatorAll({ name: 'mediator', bus: busm });
        busm.subscribe(a0 = new DummyActor(10, 10, busm, true));
        busm.subscribe(a1 = new DummyActor(100, 0, busm, true));
        busm.subscribe(a2 = new DummyActor(1, 20, busm, true));
        jest.spyOn(a0, 'runObservable');
        jest.spyOn(a1, 'runObservable');
        jest.spyOn(a2, 'runObservable');
      });

      it('should mediate over no actors', async() => {
        await expect(mediator.mediate(<any> { a: 'b' })).resolves.toBeUndefined();
        expect(a0.runObservable).not.toHaveBeenCalled();
        expect(a1.runObservable).not.toHaveBeenCalled();
        expect(a2.runObservable).not.toHaveBeenCalled();
      });
    });

    describe('with passing and failing actors', () => {
      let busm: Bus<DummyActor, IAction, IDummyTest, IDummyTest>;
      let mediator: MediatorAll<DummyActor, IAction, IDummyTest, IDummyTest>;
      let a0: DummyActor;
      let a1: DummyActor;
      let a2: DummyActor;

      beforeEach(() => {
        busm = new Bus({ name: 'bus' });
        mediator = new MediatorAll({ name: 'mediator', bus: busm });
        busm.subscribe(a0 = new DummyActor(10, 10, busm, false));
        busm.subscribe(a1 = new DummyActor(100, 0, busm, true));
        busm.subscribe(a2 = new DummyActor(1, 20, busm, false));
        jest.spyOn(a0, 'runObservable');
        jest.spyOn(a1, 'runObservable');
        jest.spyOn(a2, 'runObservable');
      });

      it('should mediate over the non-rejecting actors', async() => {
        await expect(mediator.mediate(<any> { a: 'b' })).resolves.toEqual({ field: 10 });
        expect(a0.runObservable).toHaveBeenCalledWith({ a: 'b' }, undefined);
        expect(a1.runObservable).not.toHaveBeenCalled();
        expect(a2.runObservable).toHaveBeenCalledWith({ a: 'b' }, undefined);
      });
    });
  });
});

class DummyActor extends Actor<IAction, IDummyTest, IDummyTest> {
  public readonly id: number;
  public readonly delay: number;
  public readonly fail: boolean;

  public constructor(
    id: number,
    delay: number,
    bus: Bus<DummyActor, IAction, IDummyTest, IDummyTest>,
    fail: boolean,
  ) {
    super({ name: `dummy${id}`, bus });
    this.id = id;
    this.delay = delay;
    this.fail = fail;
  }

  public test(): Promise<TestResult<IDummyTest>> {
    if (this.fail) {
      return new Promise((resolve) => {
        setTimeout(() => resolve(failTest(`${this.id}`)), 10);
      });
    }
    return new Promise(resolve => setTimeout(() => resolve(passTest({ field: this.id })), this.delay));
  }

  public run(): Promise<IDummyTest> {
    return new Promise(resolve => setTimeout(() => resolve({ field: this.id }), this.delay));
  }
}

interface IDummyTest extends IActorTest, IActorOutput {
  field: number;
}
