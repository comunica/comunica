import {ActionObserver} from "../lib/ActionObserver";
import {Actor} from "../lib/Actor";
import {Bus} from "../lib/Bus";

describe('Bus', () => {
  describe('The Bus module', () => {
    it('should be a function', () => {
      expect(Bus).toBeInstanceOf(Function);
    });

    it('should be a Bus constructor', () => {
      expect(new Bus({ name: 'Bus' })).toBeInstanceOf(Bus);
    });
  });

  describe('A Bus instance', () => {
    let bus: any;
    const actor1 = new (<any> Actor)({ name: 'actor1', bus: new Bus({ name: 'bus1' }) });
    const actor2 = new (<any> Actor)({ name: 'actor2', bus: new Bus({ name: 'bus2' }) });
    const actor3 = new (<any> Actor)({ name: 'actor3', bus: new Bus({ name: 'bus3' }) });

    const observer1 = new (<any> ActionObserver)({ name: 'observer1', bus: new Bus({ name: 'bus1' }) });
    const observer2 = new (<any> ActionObserver)({ name: 'observer2', bus: new Bus({ name: 'bus2' }) });
    const observer3 = new (<any> ActionObserver)({ name: 'observer3', bus: new Bus({ name: 'bus3' }) });

    const actorTest = (action: any) => {
      return new Promise((resolve) => {
        resolve({ type: 'test', sent: action });
      });
    };

    beforeEach(() => {
      actor1.test = actorTest;
      actor2.test = actorTest;
      actor3.test = actorTest;

      observer1.onRun = () => { return; };
      observer2.onRun = () => { return; };
      observer3.onRun = () => { return; };

      jest.spyOn(actor1, 'test');
      jest.spyOn(actor2, 'test');
      jest.spyOn(actor3, 'test');

      jest.spyOn(observer1, 'onRun');
      jest.spyOn(observer2, 'onRun');
      jest.spyOn(observer3, 'onRun');

      bus = new Bus({ name: 'bus' });
    });

    it('should have a \'name\' field', () => {
      expect(bus.name).toEqual('bus');
    });

    it('should allow an actor to be subscribed', () => {
      bus.subscribe(actor1);
      expect(bus.actors).toContain(actor1);
      expect(bus.actors).toHaveLength(1);
    });

    it('should allow an actor to be subscribed and unsubscribed', () => {
      bus.subscribe(actor1);
      expect(bus.actors).toContain(actor1);
      expect(bus.actors).toHaveLength(1);
      expect(bus.unsubscribe(actor1)).toBeTruthy();
      expect(bus.actors).not.toContain(actor1);
      expect(bus.actors).toHaveLength(0);
    });

    it('should allow multiple actors to be subscribed and unsubscribed', () => {
      bus.subscribe(actor1);
      bus.subscribe(actor2);
      bus.subscribe(actor3);
      expect(bus.actors).toContain(actor1);
      expect(bus.actors).toContain(actor2);
      expect(bus.actors).toContain(actor3);
      expect(bus.actors).toHaveLength(3);
      expect(bus.unsubscribe(actor1)).toBeTruthy();
      expect(bus.actors).toHaveLength(2);
      expect(bus.unsubscribe(actor3)).toBeTruthy();
      expect(bus.actors).not.toContain(actor1);
      expect(bus.actors).toContain(actor2);
      expect(bus.actors).not.toContain(actor3);
      expect(bus.actors).toHaveLength(1);
    });

    it('should allow an actor to be subscribed multiple times', () => {
      bus.subscribe(actor1);
      bus.subscribe(actor1);
      bus.subscribe(actor1);
      expect(bus.actors).toHaveLength(3);
    });

    it('should return \'false\' when unsubscribing an actor that was not subscribed', () => {
      expect(bus.unsubscribe(actor1)).toBeFalsy();
    });

    it('should allow an observer to be subscribed', () => {
      bus.subscribeObserver(observer1);
      expect(bus.observers).toContain(observer1);
      expect(bus.observers).toHaveLength(1);

      bus.onRun(1, 2, 3);
      expect(observer1.onRun).toHaveBeenCalledTimes(1);
      expect(observer1.onRun).toBeCalledWith(1, 2, 3);
      expect(observer2.onRun).toHaveBeenCalledTimes(0);
      expect(observer3.onRun).toHaveBeenCalledTimes(0);
    });

    it('should allow an observer to be subscribed and unsubscribed', () => {
      bus.subscribeObserver(observer1);
      expect(bus.observers).toContain(observer1);
      expect(bus.observers).toHaveLength(1);
      expect(bus.unsubscribeObserver(observer1)).toBeTruthy();
      expect(bus.observers).not.toContain(observer1);
      expect(bus.observers).toHaveLength(0);

      bus.onRun(1, 2, 3);
      expect(observer1.onRun).toHaveBeenCalledTimes(0);
      expect(observer2.onRun).toHaveBeenCalledTimes(0);
      expect(observer3.onRun).toHaveBeenCalledTimes(0);
    });

    it('should allow multiple observers to be subscribed and unsubscribed', () => {
      bus.subscribeObserver(observer1);
      bus.subscribeObserver(observer2);
      bus.subscribeObserver(observer3);
      expect(bus.observers).toContain(observer1);
      expect(bus.observers).toContain(observer2);
      expect(bus.observers).toContain(observer3);
      expect(bus.observers).toHaveLength(3);
      expect(bus.unsubscribeObserver(observer1)).toBeTruthy();
      expect(bus.observers).toHaveLength(2);
      expect(bus.unsubscribeObserver(observer3)).toBeTruthy();
      expect(bus.observers).not.toContain(observer1);
      expect(bus.observers).toContain(observer2);
      expect(bus.observers).not.toContain(observer3);
      expect(bus.observers).toHaveLength(1);

      bus.onRun(1, 2, 3);
      expect(observer1.onRun).toHaveBeenCalledTimes(0);
      expect(observer2.onRun).toHaveBeenCalledTimes(1);
      expect(observer2.onRun).toBeCalledWith(1, 2, 3);
      expect(observer3.onRun).toHaveBeenCalledTimes(0);
    });

    it('should allow an observer to be subscribed multiple times', () => {
      bus.subscribeObserver(observer1);
      bus.subscribeObserver(observer1);
      bus.subscribeObserver(observer1);
      expect(bus.observers).toHaveLength(3);

      bus.onRun(1, 2, 3);
      expect(observer1.onRun).toHaveBeenCalledTimes(3);
      expect(observer1.onRun).toBeCalledWith(1, 2, 3);
      expect(observer2.onRun).toHaveBeenCalledTimes(0);
      expect(observer3.onRun).toHaveBeenCalledTimes(0);
    });

    it('should return \'false\' when unsubscribing an observer that was not subscribed', () => {
      expect(bus.unsubscribeObserver(observer1)).toBeFalsy();
    });

    describe('without actors', () => {
      it('should send an action to 0 actors', () => {
        bus.publish({});
        expect(actor1.test).not.toHaveBeenCalled();
        expect(actor2.test).not.toHaveBeenCalled();
        expect(actor3.test).not.toHaveBeenCalled();
      });
    });

    describe('with 1 actors', () => {
      beforeEach(() => {
        bus.subscribe(actor1);
      });

      it('should send an action to 1 actor', () => {
        bus.publish({});
        expect(actor1.test).toHaveBeenCalledTimes(1);
        expect(actor2.test).not.toHaveBeenCalled();
        expect(actor3.test).not.toHaveBeenCalled();
      });

      it('should send two actions to 1 actor', () => {
        bus.publish({});
        bus.publish({});
        expect(actor1.test).toHaveBeenCalledTimes(2);
        expect(actor2.test).not.toHaveBeenCalled();
        expect(actor3.test).not.toHaveBeenCalled();
      });

      it('should send no action to 1 unsubscribed actor', () => {
        bus.unsubscribe(actor1);
        bus.publish({});
        expect(actor1.test).not.toHaveBeenCalled();
        expect(actor2.test).not.toHaveBeenCalled();
        expect(actor3.test).not.toHaveBeenCalled();
      });

      it('should receive 1 publication reply', () => {
        expect(bus.publish({})).toHaveLength(1);
      });

      it('should receive a correct publication reply', () => {
        expect(bus.publish({ a: 'b' })[0].actor).toEqual(actor1);
        expect(bus.publish({ a: 'b' })[0].reply).toBeInstanceOf(Promise);
        return expect(bus.publish({ a: 'b' })[0].reply).resolves.toEqual({ type: 'test', sent: { a: 'b' } });
      });
    });

    describe('with 3 actors', () => {
      beforeEach(() => {
        bus.subscribe(actor1);
        bus.subscribe(actor2);
        bus.subscribe(actor3);
      });

      it('should send an action to 3 actors', () => {
        bus.publish({});
        expect(actor1.test).toHaveBeenCalledTimes(1);
        expect(actor2.test).toHaveBeenCalledTimes(1);
        expect(actor3.test).toHaveBeenCalledTimes(1);
      });

      it('should send two actions to 3 actors', () => {
        bus.publish({});
        bus.publish({});
        expect(actor1.test).toHaveBeenCalledTimes(2);
        expect(actor2.test).toHaveBeenCalledTimes(2);
        expect(actor3.test).toHaveBeenCalledTimes(2);
      });

      it('should send no action to 1 unsubscribed actor, but an action to 2 subscribed actors', () => {
        bus.unsubscribe(actor1);
        bus.publish({});
        expect(actor1.test).not.toHaveBeenCalled();
        expect(actor2.test).toHaveBeenCalledTimes(1);
        expect(actor3.test).toHaveBeenCalledTimes(1);
      });

      it('should receive 3 publication replies', () => {
        expect(bus.publish({})).toHaveLength(3);
      });

      it('should receive correct publication replies', () => {
        expect(bus.publish({ a: 'b' })[0].actor).toBe(actor1);
        expect(bus.publish({ a: 'b' })[0].reply).toBeInstanceOf(Promise);

        expect(bus.publish({ a: 'b' })[1].actor).toBe(actor2);
        expect(bus.publish({ a: 'b' })[1].reply).toBeInstanceOf(Promise);

        expect(bus.publish({ a: 'b' })[2].actor).toBe(actor3);
        expect(bus.publish({ a: 'b' })[2].reply).toBeInstanceOf(Promise);
      });
    });

    describe('when manually ordering actors', () => {
      beforeEach(() => {
        bus.subscribe(actor1);
        bus.subscribe(actor2);
        bus.subscribe(actor3);
      });

      it('should be ordered by insertion order by default', () => {
        expect(bus.actors).toEqual([actor1, actor2, actor3]);
      });

      it('should not change the order when calling reordering without dependencies', () => {
        bus.reorderForDependencies();
        expect(bus.actors).toEqual([actor1, actor2, actor3]);
      });

      it('should change the order when adding 1 dependency', () => {
        bus.addDependencies(actor2, [actor1]);
        expect(bus.actors).toEqual([actor2, actor3, actor1]);

        bus.addDependencies(actor3, [actor2]);
        expect(bus.actors).toEqual([actor3, actor2, actor1]);
      });

      it('should change the order when adding 2 dependencies', () => {
        bus.addDependencies(actor2, [actor1, actor3]);
        expect(bus.actors).toEqual([actor2, actor1, actor3]);

        bus.addDependencies(actor3, [actor1]);
        expect(bus.actors).toEqual([actor2, actor3, actor1]);
      });

      it('should not change the effective order when a dependency is added for an unsubscribed actor', () => {
        bus.addDependencies(actor2, [{}]);
        expect(bus.actors).toEqual([actor1, actor2, actor3]);
      });

      it('should not change the effective order when a dependent is added for an unsubscribed actor', () => {
        bus.addDependencies({}, [actor2]);
        expect(bus.actors).toEqual([actor1, actor3, actor2]);
      });

      it('should change the order for chained dependencies', () => {
        bus.addDependencies(actor3, [actor2]);
        expect(bus.actors).toEqual([actor1, actor3, actor2]);

        bus.addDependencies(actor2, [actor1]);
        expect(bus.actors).toEqual([actor3, actor2, actor1]);
      });

      it('should error on cyclic links', () => {
        bus.addDependencies(actor1, [actor2]);
        bus.addDependencies(actor2, [actor3]);
        expect(() => bus.addDependencies(actor3, [actor1]))
          .toThrow(new Error('Cyclic dependency links detected in bus bus'));
      });
    });

    describe('with ordered actors', () => {
      let actor1o;
      let actor2o;
      let actor3o;

      beforeEach(() => {
        actor1o = new (<any> Actor)({ name: 'actor1o', bus });
        actor2o = new (<any> Actor)({ name: 'actor2o', bus, beforeActors: [actor1o] });
        actor3o = new (<any> Actor)({ name: 'actor3o', bus, beforeActors: [actor2o] });

        actor1o.test = actorTest;
        actor2o.test = actorTest;
        actor3o.test = actorTest;
      });

      it('should receive correct publication replies', () => {
        expect(bus.publish({ a: 'b' })[0].actor).toBe(actor3o);
        expect(bus.publish({ a: 'b' })[0].reply).toBeInstanceOf(Promise);

        expect(bus.publish({ a: 'b' })[1].actor).toBe(actor2o);
        expect(bus.publish({ a: 'b' })[1].reply).toBeInstanceOf(Promise);

        expect(bus.publish({ a: 'b' })[2].actor).toBe(actor1o);
        expect(bus.publish({ a: 'b' })[2].reply).toBeInstanceOf(Promise);
      });
    });

  });
});
