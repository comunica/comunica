import type { IAction, IActorOutput, IActorTest } from '@comunica/core';
import { Actor, Bus, Mediator, ActionContext } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { MediatorCombinePipeline } from '../lib/MediatorCombinePipeline';

describe('MediatorCombinePipeline', () => {
  let bus: Bus<DummyActor, IDummyAction, IActorTest, IDummyAction>;

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

    it('should mediate without changing the context', async() => {
      const context = new ActionContext();
      const result = await mediator.mediate({ field: 1, context });
      expect(result).toEqual({ field: 2_101, context });
    });

    it('should mediate changing the context', async() => {
      new DummyActorContextOutput(1_000, bus);
      const context = new ActionContext({});
      const result = await mediator.mediate({ field: 1, context });
      expect(result).toHaveProperty('context');
      expect(result.context).not.toEqual(context);
      expect(result.context.toJS().id).toEqual(1_000);
    });
  });

  describe('An MediatorCombinePipeline instance with erroring actors and filtering disabled', () => {
    let mediator: MediatorCombinePipeline<DummyActor, IDummyAction, IActorTest>;

    beforeEach(() => {
      mediator = new MediatorCombinePipeline({ name: 'mediator', bus });
      new DummyActor(10, bus);
      new DummyActor(100, bus);
      new DummyActor(1, bus);
      new DummyThrowActor(1_000, bus);
    });

    it('should throw an error when mediateWith is called', () => {
      return expect(() => (<any> mediator).mediateWith({}, [])).toThrow();
    });

    it('should throw an error when mediate is called', async() => {
      const context = new ActionContext();
      await expect(() => mediator.mediate({ field: 1, context })).rejects.toThrowError('Dummy Error')
    });
  });

  describe('An MediatorCombinePipeline instance with erroring actors', () => {
    let mediator: MediatorCombinePipeline<DummyActor, IDummyAction, IActorTest>;

    beforeEach(() => {
      mediator = new MediatorCombinePipeline({ name: 'mediator', bus, filterErrors: true });
      new DummyActor(10, bus);
      new DummyActor(100, bus);
      new DummyActor(1, bus);
      new DummyThrowActor(1_000, bus);
    });

    it('should throw an error when mediateWith is called', () => {
      return expect(() => (<any> mediator).mediateWith({}, [])).toThrow();
    });

    it('should mediate without changing the context', async() => {
      const context = new ActionContext();
      const result = await mediator.mediate({ field: 1, context });
      expect(result).toEqual({ field: 2_101, context });
    });

    it('should mediate changing the context', async() => {
      new DummyActorContextOutput(1_000, bus);
      const context = new ActionContext({});
      const result = await mediator.mediate({ field: 1, context });
      expect(result).toHaveProperty('context');
      expect(result.context).not.toEqual(context);
      expect(result.context.toJS().id).toEqual(1_000);
    });
  });

  describe('An MediatorCombinePipeline instance without actors', () => {
    let mediator: MediatorCombinePipeline<DummyActor, IDummyAction, IActorTest>;

    beforeEach(() => {
      mediator = new MediatorCombinePipeline({ name: 'mediator', bus });
    });

    it('should mediate', () => {
      const context = new ActionContext();
      return expect(mediator.mediate({ field: 1, context })).resolves.toEqual({ field: 1, context });
    });
  });
});

class DummyActor extends Actor<IDummyAction, IActorTest, IDummyOutput> {
  public readonly id: number;

  public constructor(id: number, bus: Bus<DummyActor, IDummyAction, IActorTest, IDummyOutput>) {
    super({ name: `dummy${id}`, bus });
    this.id = id;
  }

  public async test(action: IDummyAction): Promise<IActorTest> {
    return true;
  }

  public async run(action: IDummyAction): Promise<IDummyOutput> {
    return { field: action.field * this.id + this.id, context: action.context };
  }
}

class DummyThrowActor extends Actor<IDummyAction, IActorTest, IDummyOutput> {
  public readonly id: number;

  public constructor(id: number, bus: Bus<DummyActor, IDummyAction, IActorTest, IDummyOutput>) {
    super({ name: `dummyThrow${id}`, bus });
    this.id = id;
  }

  public async test(action: IDummyAction): Promise<IActorTest> {
    throw new Error('Dummy Error')
  }

  public async run(action: IDummyAction): Promise<IDummyOutput> {
    return { field: action.field * this.id + this.id, context: action.context };
  }
}


class DummyActorContextOutput extends DummyActor {
  public async run(action: IDummyAction): Promise<IDummyOutput> {
    return {
      ...super.run(action),
      context: (<ActionContext> action.context).setRaw('id', this.id),
    };
  }
}

interface IDummyAction extends IAction {
  field: number;
}

interface IDummyOutput extends IActorOutput {
  field: number;
  context: IActionContext;
}
