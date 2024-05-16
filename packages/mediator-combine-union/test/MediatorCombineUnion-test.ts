import type { IAction, IActorOutput, IActorTest } from '@comunica/core';
import { ActionContext, Actor, Bus, Mediator } from '@comunica/core';
import { MediatorCombineUnion } from '..';

describe('MediatorCombineUnion', () => {
  let bus: Bus<DummyActor, IAction, IDummyTest, IDummyTest>;

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
  });

  describe('An MediatorCombineUnion instance', () => {
    let mediator: MediatorCombineUnion<DummyActor, IAction, IDummyTest, IDummyTest>;

    beforeEach(() => {
      mediator = new MediatorCombineUnion({ name: 'mediator', bus, field: 'field' });
    });

    it('should throw an error when mediateWith is called', () => {
      expect(() => (<any> mediator).mediateWith({}, [])).toThrow('Method not supported.');
    });

    describe('without actors', () => {
      it('should mediate', async() => {
        await expect(mediator.mediate({ context: new ActionContext() })).resolves.toEqual({ field: {}});
      });
    });

    describe('for defined actors', () => {
      beforeEach(() => {
        bus.subscribe(new DummyActor(1, { a: '10' }, bus));
        bus.subscribe(new DummyActor(10, { a: '100', b: { a: '1' }, c: [ 3, 2, 1 ], e: { b: '1' }}, bus));
        bus.subscribe(
          new DummyActor(100, { a: '100', b: [ 1, 2, 3 ], c: { a: '100' }, d: '123', e: { a: '100' }}, bus),
        );
      });

      it('should mediate', async() => {
        await expect(mediator.mediate({ context: new ActionContext() })).resolves
          .toEqual({ field: { a: '10', b: { a: '1' }, c: [ 3, 2, 1 ], d: '123', e: { b: '1' }}});
      });
    });
  });

  describe('An MediatorCombineUnion instance with erroring actors', () => {
    let mediator: MediatorCombineUnion<DummyActor, IAction, IDummyTest, IDummyTest>;

    beforeEach(() => {
      mediator = new MediatorCombineUnion({ name: 'mediator', bus, field: 'field', filterErrors: true });
    });

    it('should throw an error when mediateWith is called', () => {
      expect(() => (<any> mediator).mediateWith({}, [])).toThrow('Method not supported.');
    });

    describe('without actors', () => {
      it('should mediate', async() => {
        await expect(mediator.mediate({ context: new ActionContext() })).resolves.toEqual({ field: {}});
      });
    });

    describe('for defined actors', () => {
      beforeEach(() => {
        bus.subscribe(new DummyActor(1, { a: '10' }, bus));
        bus.subscribe(new DummyActor(10, { a: '100', b: { a: '1' }, c: [ 3, 2, 1 ], e: { b: '1' }}, bus));
        bus.subscribe(new DummyThrowActor(10, { a: '100', b: { a: '1' }, c: [ 3, 2, 1 ], e: { b: '1' }}, bus));
        bus.subscribe(
          new DummyActor(100, { a: '100', b: [ 1, 2, 3 ], c: { a: '100' }, d: '123', e: { a: '100' }}, bus),
        );
      });

      it('should mediate', async() => {
        await expect(mediator.mediate({ context: new ActionContext() })).resolves
          .toEqual({ field: { a: '10', b: { a: '1' }, c: [ 3, 2, 1 ], d: '123', e: { b: '1' }}});
      });
    });
  });
});

class DummyActor extends Actor<IAction, IDummyTest, IDummyTest> {
  public readonly data: any;

  public constructor(id: number, data: any, bus: Bus<DummyActor, IAction, IDummyTest, IDummyTest>) {
    super({ name: `dummy${id}`, bus });
    this.data = data;
  }

  public async test(action: IAction): Promise<IDummyTest> {
    return { field: this.data, otherField: 'ignored' };
  }

  public async run(action: IAction): Promise<IDummyTest> {
    return { field: this.data, otherField: 'ignored' };
  }
}

class DummyThrowActor extends DummyActor {
  public constructor(
    id: number,
    data: any,
    bus: Bus<DummyActor, IAction, IDummyTest, IDummyTest>,
  ) {
    super(id, data, bus);
  }

  public override async test(action: IAction): Promise<IDummyTest> {
    throw new Error('Dummy Error');
  }
}

interface IDummyTest extends IActorTest, IActorOutput {
  field: number;
  otherField: string;
}
