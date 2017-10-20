import {Actor, IAction, IActorOutput, IActorTest} from "@comunica/core";
import {Bus} from "@comunica/core/lib/Bus";
import {Mediator} from "@comunica/core/lib/Mediator";
import {MediatorRace} from "../lib/MediatorRace";

describe('MediatorRace', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The MediatorRace module', () => {
    it('should be a function', () => {
      expect(MediatorRace).toBeInstanceOf(Function);
    });

    it('should be a MediatorRace constructor', () => {
      expect(new (<any> MediatorRace)({ name: 'mediator', bus, field: 'field' })).toBeInstanceOf(MediatorRace);
    });

    it('should not be able to create new MediatorRace objects without \'new\'', () => {
      expect(() => { (<any> MediatorRace)(); }).toThrow();
    });

    it('should throw an error when constructed without arguments', () => {
      expect(() => { new (<any> MediatorRace)(); }).toThrow();
    });
  });

  describe('An MediatorRace instance', () => {
    let mediator: MediatorRace<DummyActor, IAction, IDummyTest, IDummyTest>;

    beforeEach(() => {
      mediator = new MediatorRace({ name: 'mediator', bus });
      bus.subscribe(new DummyActor(10, 10, bus));
      bus.subscribe(new DummyActor(100, 0, bus));
      bus.subscribe(new DummyActor(1, 20, bus));
    });

    it('should mediate to the earliest resolver', () => {
      return expect(mediator.mediate({})).resolves.toEqual({ field: 100 });
    });
  });
});

class DummyActor extends Actor<IAction, IDummyTest, IDummyTest> {

  public readonly id: number;
  public readonly delay: number;

  constructor(id: number, delay: number, bus: Bus<DummyActor, IAction, IDummyTest, IDummyTest>) {
    super({ name: 'dummy' + id, bus });
    this.id = id;
    this.delay = delay;
  }

  public test(action: IAction): Promise<IDummyTest> {
    return new Promise((resolve, reject) => setTimeout(() => resolve({ field: this.id }), this.delay));
  }

  public async run(action: IAction): Promise<IDummyTest> {
    return { field: this.id };
  }

}

interface IDummyTest extends IActorTest, IActorOutput {
  field: number;
}
