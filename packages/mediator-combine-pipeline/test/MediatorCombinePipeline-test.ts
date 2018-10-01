import {Actor, Bus, IAction, IActorOutput, IActorTest, Mediator} from "@comunica/core";
import {MediatorCombinePipeline} from "../lib/MediatorCombinePipeline";

describe('MediatorCombinePipeline', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The MediatorCombinePipeline module', () => {
    it('should be a function', () => {
      expect(MediatorCombinePipeline).toBeInstanceOf(Function);
    });

    it('should be a MediatorCombinePipeline constructor', () => {
      expect(new (<any> MediatorCombinePipeline)({ name: 'mediator', bus }))
        .toBeInstanceOf(MediatorCombinePipeline);
      expect(new (<any> MediatorCombinePipeline)({ name: 'mediator', bus }))
        .toBeInstanceOf(Mediator);
    });
  });

  describe('An MediatorCombinePipeline instance', () => {
    let mediator: MediatorCombinePipeline<DummyActor, IDummyAction, IActorTest>;

    beforeEach(() => {
      mediator = new MediatorCombinePipeline({ name: 'mediator', bus });
      new DummyActor(10, bus);
      new DummyActor(100, bus);
      new DummyActor(1, bus);
    });

    it('should throw an error when mediateWith is called', () => {
      return expect(() => (<any> mediator).mediateWith({}, [])).toThrow();
    });

    it('should mediate', () => {
      return expect(mediator.mediate({ field: 1 })).resolves.toEqual({ field: 2101 });
    });
  });

  describe('An MediatorCombinePipeline instance without actors', () => {
    let mediator: MediatorCombinePipeline<DummyActor, IDummyAction, IActorTest>;

    beforeEach(() => {
      mediator = new MediatorCombinePipeline({ name: 'mediator', bus });
    });

    it('should mediate', () => {
      return expect(mediator.mediate({ field: 1 })).resolves.toEqual({ field: 1 });
    });
  });
});

class DummyActor extends Actor<IDummyAction, IActorTest, IDummyAction> {

  public readonly id: number;

  constructor(id: number, bus: Bus<DummyActor, IDummyAction, IActorTest, IDummyAction>) {
    super({ name: 'dummy' + id, bus });
    this.id = id;
  }

  public async test(action: IDummyAction): Promise<IActorTest> {
    return true;
  }

  public async run(action: IDummyAction): Promise<IDummyAction> {
    return { field: action.field * this.id + this.id };
  }

}

interface IDummyAction extends IAction, IActorOutput {
  field: number;
}
