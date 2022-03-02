import type { IAction, IActorOutput, IActorTest } from '@comunica/core';
import { ActionContext, Actor, Bus, Mediator } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { MediatorNumber } from '..';

describe('MediatorNumber', () => {
  let bus: Bus<DummyActor, IAction, IDummyTest, IDummyTest>;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The MediatorNumber module', () => {
    it('should be a function', () => {
      expect(MediatorNumber).toBeInstanceOf(Function);
    });

    it('should be a MediatorNumber constructor', () => {
      expect(new (<any> MediatorNumber)({ name: 'mediator', bus, field: 'field', type: 'min' }))
        .toBeInstanceOf(MediatorNumber);
      expect(new (<any> MediatorNumber)({ name: 'mediator', bus, field: 'field', type: 'min' }))
        .toBeInstanceOf(Mediator);
    });

    it('should not throw an error when constructed with \'field\' and \'type\' parameters', () => {
      expect(() => { new MediatorNumber({ name: 'mediator', bus, field: 'field', type: 'min' }); })
        .not.toThrow();
      expect(() => { new MediatorNumber({ name: 'mediator', bus, field: 'field', type: 'max' }); })
        .not.toThrow();
    });

    it('should throw an error when constructed without arguments', () => {
      expect(() => { new MediatorNumber(
        { name: 'mediator', bus, field: 'field', type: <any> 'invalidType' },
      ); }).toThrow();
    });

    it('should store the \'field\' and \'type\' parameters', () => {
      expect(new MediatorNumber({ name: 'mediator', bus, field: 'field', type: 'min' }).field)
        .toEqual('field');
      expect(new MediatorNumber({ name: 'mediator', bus, field: 'field', type: 'min' }).type)
        .toEqual('min');
    });
  });

  describe('An MediatorNumber instance', () => {
    let mediatorMin: MediatorNumber<DummyActor, IAction, IDummyTest, IDummyTest>;
    let mediatorMax: MediatorNumber<DummyActor, IAction, IDummyTest, IDummyTest>;

    beforeEach(() => {
      mediatorMin = new MediatorNumber({ name: 'mediatorMin', bus, field: 'field', type: 'min' });
      mediatorMax = new MediatorNumber({ name: 'mediatorMax', bus, field: 'field', type: 'max' });
    });

    describe('with defined actor fields', () => {
      beforeEach(() => {
        bus.subscribe(new DummyActor(10, bus));
        bus.subscribe(new DummyActor(100, bus));
        bus.subscribe(new DummyActor(1, bus));
      });

      it('should mediate to the minimum value for type MIN', () => {
        return expect(mediatorMin.mediate({ context })).resolves.toEqual({ field: 1 });
      });

      it('should mediate to the maximum value for type MAX', () => {
        return expect(mediatorMax.mediate({ context })).resolves.toEqual({ field: 100 });
      });
    });

    describe('with undefined actor fields', () => {
      beforeEach(() => {
        bus.subscribe(new DummyActor(undefined, bus));
      });

      it('should mediate to the minimum value for type MIN', () => {
        return expect(mediatorMin.mediate({ context })).resolves.toEqual({ field: undefined });
      });

      it('should mediate to the maximum value for type MAX', () => {
        return expect(mediatorMax.mediate({ context })).resolves.toEqual({ field: undefined });
      });
    });

    describe('without actors', () => {
      it('should mediate to the minimum value for type MIN', () => {
        return expect(mediatorMin.mediate({ context })).rejects
          .toThrow(new Error('No actors are able to reply to a message in the bus bus'));
      });

      it('should mediate to the maximum value for type MAX', () => {
        return expect(mediatorMax.mediate({ context })).rejects
          .toThrow(new Error('No actors are able to reply to a message in the bus bus'));
      });
    });

    describe('with defined and undefined actor fields', () => {
      beforeEach(() => {
        bus.subscribe(new DummyActor(undefined, bus));
        bus.subscribe(new DummyActor(10, bus));
        bus.subscribe(new DummyActor(undefined, bus));
        bus.subscribe(new DummyActor(100, bus));
        bus.subscribe(new DummyActor(undefined, bus));
        bus.subscribe(new DummyActor(1, bus));
        bus.subscribe(new DummyActor(undefined, bus));
      });

      it('should mediate to the minimum value for type MIN', () => {
        return expect(mediatorMin.mediate({ context })).resolves.toEqual({ field: 1 });
      });

      it('should mediate to the maximum value for type MAX', () => {
        return expect(mediatorMax.mediate({ context })).resolves.toEqual({ field: 100 });
      });
    });

    describe('without undefined actor fields', () => {
      beforeEach(() => {
        bus.subscribe(new DummyActorInvalid(1, bus));
        bus.subscribe(new DummyActorInvalid(2, bus));
        bus.subscribe(new DummyActorInvalid(3, bus));
        bus.subscribe(new DummyActorInvalid(4, bus));
      });

      it('should mediate to the first value for type MIN', () => {
        return expect(mediatorMin.mediate({ context })).resolves.toEqual({ field: 1 });
      });

      it('should mediate to the first value for type MAX', () => {
        return expect(mediatorMax.mediate({ context })).resolves.toEqual({ field: 1 });
      });
    });

    describe('with actors throwing errors', () => {
      beforeEach(() => {
        mediatorMin = new MediatorNumber({ bus,
          field: 'field',
          ignoreErrors: true,
          name: 'mediatorMin',
          type: 'min' });
        mediatorMax = new MediatorNumber({ bus,
          field: 'field',
          ignoreErrors: true,
          name: 'mediatorMax',
          type: 'max' });
        bus.subscribe(new ErrorDummyActor(undefined, bus));
        bus.subscribe(new DummyActor(100, bus));
        bus.subscribe(new DummyActor(1, bus));
      });

      it('should mediate to the minimum value for type MIN', () => {
        return expect(mediatorMin.mediate({ context })).resolves.toEqual({ field: 1 });
      });

      it('should mediate to the maximum value for type MAX', () => {
        return expect(mediatorMax.mediate({ context })).resolves.toEqual({ field: 100 });
      });
    });

    describe('with only an actor throwing errors, where errors are ignored', () => {
      beforeEach(() => {
        mediatorMin = new MediatorNumber({ bus,
          field: 'field',
          ignoreErrors: true,
          name: 'mediatorMin',
          type: 'min' });
        mediatorMax = new MediatorNumber({ bus,
          field: 'field',
          ignoreErrors: true,
          name: 'mediatorMax',
          type: 'max' });
        bus.subscribe(new ErrorDummyActor(undefined, bus));
      });

      it('should not mediate to the minimum value for type MIN', () => {
        return expect(mediatorMin.mediate({ context })).rejects.toThrow(new Error(
          'All actors rejected their test in mediatorMin\n' +
          'abc\n' +
          'abc',
        ));
      });

      it('should not mediate to the maximum value for type MAX', () => {
        return expect(mediatorMax.mediate({ context })).rejects.toThrow(new Error(
          'All actors rejected their test in mediatorMax\n' +
          'abc\n' +
          'abc',
        ));
      });
    });

    describe('with only an actor throwing errors, where errors are not ignored', () => {
      beforeEach(() => {
        mediatorMin = new MediatorNumber({ bus,
          field: 'field',
          ignoreErrors: false,
          name: 'mediatorMin',
          type: 'min' });
        mediatorMax = new MediatorNumber({ bus,
          field: 'field',
          ignoreErrors: false,
          name: 'mediatorMax',
          type: 'max' });
        bus.subscribe(new ErrorDummyActor(undefined, bus));
      });

      it('should not mediate to the minimum value for type MIN', () => {
        return expect(mediatorMin.mediate({ context })).rejects.toThrow(new Error('abc'));
      });

      it('should not mediate to the maximum value for type MAX', () => {
        return expect(mediatorMax.mediate({ context })).rejects.toThrow(new Error('abc'));
      });
    });
  });
});

class DummyActor extends Actor<IAction, IDummyTest, IDummyTest> {
  public readonly id: number | undefined;

  public constructor(id: number | undefined, bus: Bus<DummyActor, IAction, IDummyTest, IDummyTest>) {
    super({ name: `dummy${id}`, bus });
    this.id = id;
  }

  public async test(action: IAction): Promise<IDummyTest> {
    return { field: this.id };
  }

  public async run(action: IAction): Promise<IDummyTest> {
    return { field: this.id };
  }
}

class DummyActorInvalid extends Actor<IAction, IDummyTest, IDummyTest> {
  public readonly id: number;

  public constructor(id: number, bus: Bus<DummyActor, IAction, IDummyTest, IDummyTest>) {
    super({ name: `dummy${id}`, bus });
    this.id = id;
  }

  public async test(action: IAction): Promise<IDummyTest> {
    return <any> {};
  }

  public async run(action: IAction): Promise<IDummyTest> {
    return { field: this.id };
  }
}

class ErrorDummyActor extends DummyActor {
  public async test(action: IAction): Promise<IDummyTest> {
    throw new Error('abc');
  }
}

interface IDummyTest extends IActorTest, IActorOutput {
  field: number | undefined;
}
