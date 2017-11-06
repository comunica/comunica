import {Actor, Bus, IAction, IActorOutput, IActorTest, Mediator} from "@comunica/core";
import {MediatorCombineUnion} from "../lib/MediatorCombineUnion";

describe('MediatorCombineUnion', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The MediatorCombineUnion module', () => {
    it('should be a function', () => {
      expect(MediatorCombineUnion).toBeInstanceOf(Function);
    });

    it('should be a MediatorCombineUnion constructor', () => {
      expect(new (<any> MediatorCombineUnion)({ name: 'mediator', bus, field: 'field' }))
        .toBeInstanceOf(MediatorCombineUnion);
      expect(new (<any> MediatorCombineUnion)({ name: 'mediator', bus, field: 'field' }))
        .toBeInstanceOf(Mediator);
    });

    it('should not be able to create new MediatorCombineUnion objects without \'new\'', () => {
      expect(() => { (<any> MediatorCombineUnion)(); }).toThrow();
    });

    it('should throw an error when constructed without a name', () => {
      expect(() => { new (<any> MediatorCombineUnion)({ bus, field: 'field' }); }).toThrow();
    });

    it('should throw an error when constructed without a bus', () => {
      expect(() => { new (<any> MediatorCombineUnion)({ name: 'mediator', field: 'field' }); }).toThrow();
    });

    it('should throw an error when constructed without a field', () => {
      expect(() => { new (<any> MediatorCombineUnion)({ name: 'mediator', bus }); }).toThrow();
    });

    it('should throw an error when constructed without a name, bus and field', () => {
      expect(() => { new (<any> MediatorCombineUnion)({}); }).toThrow();
    });

    it('should throw an error when constructed without arguments', () => {
      expect(() => { new (<any> MediatorCombineUnion)(); }).toThrow();
    });
  });

  describe('An MediatorCombineUnion instance', () => {
    let mediator: MediatorCombineUnion<DummyActor, IAction, IDummyTest, IDummyTest>;

    beforeEach(() => {
      mediator = new MediatorCombineUnion({ name: 'mediator', bus, field: 'field' });
    });

    it('should throw an error when mediateWith is called', () => {
      return expect(() => (<any> mediator).mediateWith({}, [])).toThrow();
    });

    describe('without actors', () => {
      it('should not mediate', () => {
        return expect(mediator.mediate({})).rejects.toBeTruthy();
      });
    });

    describe('for defined actors', () => {
      beforeEach(() => {
        bus.subscribe(new DummyActor(1, { a: '10' }, bus));
        bus.subscribe(new DummyActor(10, { a: '100', b: { a: '1' }, c: [ 3, 2, 1 ], e: { b: '1' } }, bus));
        bus.subscribe(new DummyActor(100, { a: '100', b: [ 1, 2, 3 ], c: { a: '100' }, d: '123', e: { a: '100' } },
          bus));
      });

      it('should mediate', () => {
        return expect(mediator.mediate({})).resolves
          .toEqual({ field: { a: '10', b: { a: '1' }, c: [ 3, 2, 1 ], d: '123', e: { b: '1' }}});
      });
    });
  });
});

class DummyActor extends Actor<IAction, IDummyTest, IDummyTest> {

  public readonly data: any;

  constructor(id: number, data: any, bus: Bus<DummyActor, IAction, IDummyTest, IDummyTest>) {
    super({ name: 'dummy' + id, bus });
    this.data = data;
  }

  public async test(action: IAction): Promise<IDummyTest> {
    return { field: this.data, otherField: 'ignored' };
  }

  public async run(action: IAction): Promise<IDummyTest> {
    return { field: this.data, otherField: 'ignored' };
  }

}

interface IDummyTest extends IActorTest, IActorOutput {
  field: number;
  otherField: string;
}
