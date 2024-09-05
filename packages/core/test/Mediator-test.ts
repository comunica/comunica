import type { IBus } from '..';
import { failTest, passTest, Actor, Bus, Mediator } from '..';

describe('Mediator', () => {
  let bus: IBus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The Mediator module', () => {
    it('should be a function', () => {
      expect(Mediator).toBeInstanceOf(Function);
    });

    it('should be a Mediator constructor', () => {
      expect(new (<any> Mediator)({ name: 'mediator', bus: new Bus({ name: 'bus' }) })).toBeInstanceOf(Mediator);
    });
  });

  describe('A Mediator instance', () => {
    let mediator: any;
    beforeEach(() => {
      mediator = new (<any> Mediator)({ name: 'mediator', bus });

      actor1 = new (<any> Actor)({ name: 'actor1', bus: new Bus({ name: 'bus1' }) });
      actor2 = new (<any> Actor)({ name: 'actor2', bus: new Bus({ name: 'bus2' }) });
      actor3 = new (<any> Actor)({ name: 'actor3', bus: new Bus({ name: 'bus3' }) });

      mediator.mediateWith = mediateWithFirst;

      actor1.test = actorTest;
      actor2.test = actorTest;
      actor3.test = actorTest;
      actor1.run = actorRun;
      actor2.run = actorRun;
      actor3.run = actorRun;

      jest.spyOn(mediator, 'mediateWith');
      jest.spyOn(actor1, 'test');
      jest.spyOn(actor2, 'test');
      jest.spyOn(actor3, 'test');
      jest.spyOn(actor1, 'run');
      jest.spyOn(actor2, 'run');
      jest.spyOn(actor3, 'run');
    });

    it('should have a \'name\' field', () => {
      expect(mediator.name).toBe('mediator');
    });

    it('should have a \'bus\' field', () => {
      expect(mediator.bus).toEqual(bus);
    });

    describe('constructFailureMessage', () => {
      beforeEach(() => {
        bus.failMessage = `This is a message based on $\{action.a} and $\{action.b.c}`;
      });

      it('instantiates templated strings', () => {
        expect(mediator.constructFailureMessage(
          { a: 'A', b: { c: 'C' }},
          [ 'fail1', 'fail2' ],
        )).toBe(`This is a message based on A and C
    Error messages of failing actors:
        fail1
        fail2`);
      });

      it('instantiates templated strings with missing action fields', () => {
        expect(mediator.constructFailureMessage(
          { a: 'A' },
          [ 'fail1', 'fail2' ],
        )).toBe(`This is a message based on A and $\{action.b.c}
    Error messages of failing actors:
        fail1
        fail2`);
      });
    });

    describe('without actors in the bus', () => {
      it('should throw an error when mediated over', async() => {
        await expect(mediator.mediate({})).rejects.toBeInstanceOf(Error);
      });
    });

    let actor1: any;
    let actor2: any;
    let actor3: any;

    const actorTest = (action: any) => {
      return new Promise((resolve) => {
        resolve(passTest({ type: 'test', sent: action }));
      });
    };
    const actorRun = (action: any) => {
      return new Promise((resolve) => {
        resolve(passTest({ type: 'run', sent: action }));
      });
    };
    const mediateWithFirst = async(action: any, testResults: any) => {
      return passTest(testResults[0].actor);
    };
    const mediateWithFirstError = async() => {
      return failTest('some error');
    };

    describe('without 1 actor in the bus', () => {
      beforeEach(() => {
        mediator.bus.subscribe(actor1);
      });

      it('should not throw an error when mediated over', async() => {
        await expect(mediator.mediate({})).resolves.toBeTruthy();
      });

      it('should call \'mediateWith\' when mediated over', async() => {
        await mediator.mediate({}).then(() => {
          expect(mediator.mediateWith).toHaveBeenCalledTimes(1);
        });
      });

      it('should call the actor test and run methods when mediated over', async() => {
        await mediator.mediate({}).then(() => {
          expect(actor1.test).toHaveBeenCalledTimes(1);
          expect(actor1.run).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('without 3 actors in the bus', () => {
      beforeEach(() => {
        mediator.bus.subscribe(actor1);
        mediator.bus.subscribe(actor2);
        mediator.bus.subscribe(actor3);
      });

      it('should not throw an error when mediated over', async() => {
        await expect(mediator.mediate({})).resolves.toBeTruthy();
      });

      it('should call \'mediateWith\' when mediated over', async() => {
        await mediator.mediate({}).then(() => {
          expect(mediator.mediateWith).toHaveBeenCalledTimes(1);
        });
      });

      it('should call all the actor tests methods when mediated over', async() => {
        await mediator.mediate({}).then(() => {
          expect(actor1.test).toHaveBeenCalledTimes(1);
          expect(actor2.test).toHaveBeenCalledTimes(1);
          expect(actor3.test).toHaveBeenCalledTimes(1);
        });
      });

      it('should only call one actor run method when mediated over', async() => {
        await mediator.mediate({}).then(() => {
          expect(actor1.run).toHaveBeenCalledTimes(1);
          expect(actor2.run).not.toHaveBeenCalled();
          expect(actor3.run).not.toHaveBeenCalled();
        });
      });

      it('should reject if the mediateWith function was rejected', async() => {
        mediator.mediateWith = mediateWithFirstError;
        await expect(mediator.mediate({})).rejects.toBeInstanceOf(Error);
      });
    });
  });
});
