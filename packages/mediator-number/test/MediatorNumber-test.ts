import {Actor, Bus, IAction, IActorOutput, IActorTest, Mediator} from "@comunica/core";
import {MediatorNumber} from "../lib/MediatorNumber";

describe('MediatorNumber', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The MediatorNumber module', () => {
    it('should be a function', () => {
      expect(MediatorNumber).toBeInstanceOf(Function);
    });

    it('should be a MediatorNumber constructor', () => {
      expect(new (<any> MediatorNumber)({ name: 'mediator', bus, field: 'field', type: MediatorNumber.MIN }))
        .toBeInstanceOf(MediatorNumber);
      expect(new (<any> MediatorNumber)({ name: 'mediator', bus, field: 'field', type: MediatorNumber.MIN }))
        .toBeInstanceOf(Mediator);
    });

    it('should not be able to create new MediatorNumber objects without \'new\'', () => {
      expect(() => { (<any> MediatorNumber)(); }).toThrow();
    });

    it('should not throw an error when constructed with \'field\' and \'type\' parameters', () => {
      expect(() => { new MediatorNumber({ name: 'mediator', bus, field: 'field', type: MediatorNumber.MIN }); })
        .not.toThrow();
      expect(() => { new MediatorNumber({ name: 'mediator', bus, field: 'field', type: MediatorNumber.MAX }); })
        .not.toThrow();
    });

    it('should throw an error when constructed without arguments', () => {
      expect(() => { new MediatorNumber({ name: 'mediator', bus, field: 'field', type: 'invalidType' }); }).toThrow();
    });

    it('should store the \'field\' and \'type\' parameters', () => {
      expect(new MediatorNumber({ name: 'mediator', bus, field: 'field', type: MediatorNumber.MIN }).field)
        .toEqual('field');
      expect(new MediatorNumber({ name: 'mediator', bus, field: 'field', type: MediatorNumber.MIN }).type)
        .toEqual(MediatorNumber.MIN);
    });
  });

  describe('An MediatorNumber instance', () => {
    let mediatorMin: MediatorNumber<DummyActor, IAction, IDummyTest, IDummyTest>;
    let mediatorMax: MediatorNumber<DummyActor, IAction, IDummyTest, IDummyTest>;

    beforeEach(() => {
      mediatorMin = new MediatorNumber({ name: 'mediatorMin', bus, field: 'field', type: MediatorNumber.MIN });
      mediatorMax = new MediatorNumber({ name: 'mediatorMax', bus, field: 'field', type: MediatorNumber.MAX });
    });

    describe('with defined actor fields', () => {
      beforeEach(() => {
        bus.subscribe(new DummyActor(10, bus));
        bus.subscribe(new DummyActor(100, bus));
        bus.subscribe(new DummyActor(1, bus));
      });

      it('should mediate to the minimum value for type MIN', () => {
        return expect(mediatorMin.mediate({})).resolves.toEqual({ field: 1 });
      });

      it('should mediate to the maximum value for type MAX', () => {
        return expect(mediatorMax.mediate({})).resolves.toEqual({ field: 100 });
      });
    });

    describe('with null actor fields', () => {
      beforeEach(() => {
        bus.subscribe(new DummyActor(null, bus));
      });

      it('should mediate to the minimum value for type MIN', () => {
        return expect(mediatorMin.mediate({})).resolves.toEqual({ field: null });
      });

      it('should mediate to the maximum value for type MAX', () => {
        return expect(mediatorMax.mediate({})).resolves.toEqual({ field: null });
      });
    });

    describe('with defined and null actor fields', () => {
      beforeEach(() => {
        bus.subscribe(new DummyActor(null, bus));
        bus.subscribe(new DummyActor(10, bus));
        bus.subscribe(new DummyActor(null, bus));
        bus.subscribe(new DummyActor(100, bus));
        bus.subscribe(new DummyActor(null, bus));
        bus.subscribe(new DummyActor(1, bus));
        bus.subscribe(new DummyActor(null, bus));
      });

      it('should mediate to the minimum value for type MIN', () => {
        return expect(mediatorMin.mediate({})).resolves.toEqual({ field: 1 });
      });

      it('should mediate to the maximum value for type MAX', () => {
        return expect(mediatorMax.mediate({})).resolves.toEqual({ field: 100 });
      });
    });

    describe('with actors throwing errors', () => {
      beforeEach(() => {
        mediatorMin = new MediatorNumber({ bus, field: 'field', ignoreErrors: true,
          name: 'mediatorMin', type: MediatorNumber.MIN });
        mediatorMax = new MediatorNumber({ bus, field: 'field', ignoreErrors: true,
          name: 'mediatorMax', type: MediatorNumber.MAX });
        bus.subscribe(new ErrorDummyActor(null, bus));
        bus.subscribe(new DummyActor(100, bus));
        bus.subscribe(new DummyActor(1, bus));
      });

      it('should mediate to the minimum value for type MIN', () => {
        return expect(mediatorMin.mediate({})).resolves.toEqual({ field: 1 });
      });

      it('should mediate to the maximum value for type MAX', () => {
        return expect(mediatorMax.mediate({})).resolves.toEqual({ field: 100 });
      });
    });
  });
});

class DummyActor extends Actor<IAction, IDummyTest, IDummyTest> {

  public readonly id: number | null;

  constructor(id: number | null, bus: Bus<DummyActor, IAction, IDummyTest, IDummyTest>) {
    super({ name: 'dummy' + id, bus });
    this.id = id;
  }

  public async test(action: IAction): Promise<IDummyTest> {
    return { field: this.id };
  }

  public async run(action: IAction): Promise<IDummyTest> {
    return { field: this.id };
  }

}

// tslint:disable-next-line:max-classes-per-file
class ErrorDummyActor extends DummyActor {
  public async test(action: IAction): Promise<IDummyTest> {
    throw new Error();
  }
}

interface IDummyTest extends IActorTest, IActorOutput {
  field: number;
}
