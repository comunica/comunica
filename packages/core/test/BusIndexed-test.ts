import {ActionObserver} from "../lib/ActionObserver";
import {Actor} from "../lib/Actor";
import {Bus} from "../lib/Bus";
import {BusIndexed} from "../lib/BusIndexed";

describe('BusIndexed', () => {
  describe('The BusIndexed module', () => {
    it('should be a function', () => {
      expect(BusIndexed).toBeInstanceOf(Function);
    });

    it('should be a BusIndexed constructor', () => {
      expect(new BusIndexed({ name: 'BusIndexed', actorIdentifierFields: [], actionIdentifierFields: [] }))
        .toBeInstanceOf(BusIndexed);
    });
  });

  describe('A BusIndexed instance with non-existing actorIdentifierFields and actionIdentifierFields', () => {
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

      bus = new BusIndexed({ name: 'bus', actorIdentifierFields: ['ACTOR'], actionIdentifierFields: ['ACTION'] });
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

  });

  describe('A BusIndexed instance with simple actorIdentifierFields and actionIdentifierFields', () => {
    let bus: any;
    const actor1 = new (<any> Actor)({ name: 'actor1', bus: new Bus({ name: 'bus1' }), type: '1' });
    const actor2 = new (<any> Actor)({ name: 'actor2', bus: new Bus({ name: 'bus2' }), type: '2' });
    const actor3 = new (<any> Actor)({ name: 'actor3', bus: new Bus({ name: 'bus3' }), type: '1' });
    const actor4 = new (<any> Actor)({ name: 'actor4', bus: new Bus({ name: 'bus3' }) });

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
      actor4.test = actorTest;

      observer1.onRun = () => { return; };
      observer2.onRun = () => { return; };
      observer3.onRun = () => { return; };

      jest.spyOn(actor1, 'test');
      jest.spyOn(actor2, 'test');
      jest.spyOn(actor3, 'test');
      jest.spyOn(actor4, 'test');

      jest.spyOn(observer1, 'onRun');
      jest.spyOn(observer2, 'onRun');
      jest.spyOn(observer3, 'onRun');

      bus = new BusIndexed({ name: 'bus', actorIdentifierFields: ['type'], actionIdentifierFields: ['a'] });
    });

    it('should have a \'name\' field', () => {
      expect(bus.name).toEqual('bus');
    });

    it('should allow an actor to be subscribed', () => {
      bus.subscribe(actor1);
      expect(bus.actors).toContain(actor1);
      expect(bus.actors).toHaveLength(1);
      expect(bus.actorsIndex).toEqual({ 1: [actor1] });
    });

    it('should not allow an unsubscribed identified actor to be unsubscribed', () => {
      expect(bus.unsubscribe(actor1)).toBeFalsy();
    });

    it('should not allow an unsubscribed identified actor to be unsubscribed with another actor of same type', () => {
      bus.subscribe(actor3);
      expect(bus.unsubscribe(actor1)).toBeFalsy();
    });

    it('should not allow an unsubscribed unidentified actor to be unsubscribed', () => {
      expect(bus.unsubscribe(actor4)).toBeFalsy();
    });

    it('should allow an actor to be subscribed and unsubscribed', () => {
      bus.subscribe(actor1);
      expect(bus.actors).toContain(actor1);
      expect(bus.actors).toHaveLength(1);
      expect(bus.actorsIndex).toEqual({ 1: [actor1] });
      expect(bus.unsubscribe(actor1)).toBeTruthy();
      expect(bus.actors).not.toContain(actor1);
      expect(bus.actors).toHaveLength(0);
      expect(bus.actorsIndex).toEqual({});
    });

    it('should allow an unidentified actor to be subscribed and unsubscribed', () => {
      bus.subscribe(actor4);
      expect(bus.actors).toContain(actor4);
      expect(bus.actors).toHaveLength(1);
      expect(bus.actorsIndex).toEqual({ _undefined_: [actor4] });
      expect(bus.unsubscribe(actor4)).toBeTruthy();
      expect(bus.actors).not.toContain(actor4);
      expect(bus.actors).toHaveLength(0);
      expect(bus.actorsIndex).toEqual({});
    });

    it('should allow multiple actors to be subscribed and unsubscribed', () => {
      bus.subscribe(actor1);
      bus.subscribe(actor2);
      bus.subscribe(actor3);
      expect(bus.actors).toContain(actor1);
      expect(bus.actors).toContain(actor2);
      expect(bus.actors).toContain(actor3);
      expect(bus.actors).toHaveLength(3);
      expect(bus.actorsIndex).toEqual({ 1: [actor1, actor3], 2: [actor2] });
      expect(bus.unsubscribe(actor1)).toBeTruthy();
      expect(bus.actorsIndex).toEqual({ 1: [actor3], 2: [actor2] });
      expect(bus.actors).toHaveLength(2);
      expect(bus.unsubscribe(actor3)).toBeTruthy();
      expect(bus.actorsIndex).toEqual({ 2: [actor2] });
      expect(bus.actors).not.toContain(actor1);
      expect(bus.actors).toContain(actor2);
      expect(bus.actors).not.toContain(actor3);
      expect(bus.actors).toHaveLength(1);
    });

    it('should allow multiple identified and unidentified actors to be subscribed and unsubscribed', () => {
      bus.subscribe(actor1);
      bus.subscribe(actor2);
      bus.subscribe(actor3);
      bus.subscribe(actor4);
      expect(bus.actors).toContain(actor1);
      expect(bus.actors).toContain(actor2);
      expect(bus.actors).toContain(actor3);
      expect(bus.actors).toContain(actor4);
      expect(bus.actors).toHaveLength(4);
      expect(bus.actorsIndex).toEqual({ 1: [actor1, actor3], 2: [actor2], _undefined_: [actor4] });
      expect(bus.unsubscribe(actor1)).toBeTruthy();
      expect(bus.actorsIndex).toEqual({ 1: [actor3], 2: [actor2], _undefined_: [actor4] });
      expect(bus.actors).toHaveLength(3);
      expect(bus.unsubscribe(actor3)).toBeTruthy();
      expect(bus.actorsIndex).toEqual({ 2: [actor2], _undefined_: [actor4] });
      expect(bus.actors).not.toContain(actor1);
      expect(bus.actors).toContain(actor2);
      expect(bus.actors).not.toContain(actor3);
      expect(bus.actors).toContain(actor4);
      expect(bus.actors).toHaveLength(2);
      expect(bus.unsubscribe(actor4)).toBeTruthy();
      expect(bus.actorsIndex).toEqual({ 2: [actor2] });
      expect(bus.actors).not.toContain(actor1);
      expect(bus.actors).toContain(actor2);
      expect(bus.actors).not.toContain(actor3);
      expect(bus.actors).not.toContain(actor4);
      expect(bus.actors).toHaveLength(1);
    });

    it('should allow an actor to be subscribed multiple times', () => {
      bus.subscribe(actor1);
      bus.subscribe(actor1);
      bus.subscribe(actor1);
      expect(bus.actorsIndex).toEqual({ 1: [actor1, actor1, actor1] });
      expect(bus.actors).toHaveLength(3);
    });

    it('should return \'false\' when unsubscribing an actor that was not subscribed', () => {
      expect(bus.unsubscribe(actor1)).toBeFalsy();
    });

    describe('without actors', () => {
      it('should send an action to 0 actors', () => {
        bus.publish({ a: '1' });
        expect(actor1.test).not.toHaveBeenCalled();
        expect(actor2.test).not.toHaveBeenCalled();
        expect(actor3.test).not.toHaveBeenCalled();
      });
    });

    describe('with 3 actors', () => {
      beforeEach(() => {
        bus.subscribe(actor1);
        bus.subscribe(actor2);
        bus.subscribe(actor3);
      });

      it('should send an action of type 1', () => {
        bus.publish({ a: '1' });
        expect(actor1.test).toHaveBeenCalledTimes(1);
        expect(actor2.test).not.toHaveBeenCalled();
        expect(actor3.test).toHaveBeenCalledTimes(1);
      });

      it('should send an action of type 2', () => {
        bus.publish({ a: '2' });
        expect(actor1.test).not.toHaveBeenCalled();
        expect(actor2.test).toHaveBeenCalledTimes(1);
        expect(actor3.test).not.toHaveBeenCalled();
      });

      it('should send two actions of type 1', () => {
        bus.publish({ a: '1' });
        bus.publish({ a: '1' });
        expect(actor1.test).toHaveBeenCalledTimes(2);
        expect(actor2.test).not.toHaveBeenCalled();
        expect(actor3.test).toHaveBeenCalledTimes(2);
      });

      it('should send no action to 1 unsubscribed actor', () => {
        bus.unsubscribe(actor1);
        bus.publish({ a: '1' });
        expect(actor1.test).not.toHaveBeenCalled();
        expect(actor2.test).not.toHaveBeenCalled();
        expect(actor3.test).toHaveBeenCalledTimes(1);
      });

      it('should receive 1 publication reply', () => {
        expect(bus.publish({ a: '1' })).toHaveLength(2);
      });

      it('should receive a correct publication reply', async () => {
        expect(bus.publish({ a: '1' })[0].actor).toEqual(actor1);
        expect(bus.publish({ a: '1' })[0].reply).toBeInstanceOf(Promise);
        expect(bus.publish({ a: '1' })[1].actor).toEqual(actor3);
        expect(bus.publish({ a: '1' })[1].reply).toBeInstanceOf(Promise);
        expect(await bus.publish({ a: '1' })[0].reply).toEqual({ type: 'test', sent: { a: '1' } });
        expect(await bus.publish({ a: '1' })[1].reply).toEqual({ type: 'test', sent: { a: '1' } });
      });
    });

    describe('with an identified actor and an unidentified actor', () => {
      beforeEach(() => {
        bus.subscribe(actor1);
        bus.subscribe(actor4);
      });

      it('should send an action of type 1 to typed actor and unidentified actor', () => {
        bus.publish({ a: '1' });
        expect(actor1.test).toHaveBeenCalledTimes(1);
        expect(actor4.test).toHaveBeenCalledTimes(1);
      });

      it('should send an action of type 2 to typed actor and unidentified actor', () => {
        bus.publish({ a: '2' });
        expect(actor1.test).not.toHaveBeenCalled();
        expect(actor4.test).toHaveBeenCalledTimes(1);
      });

      it('should send an action of no type to all actors', () => {
        bus.publish({});
        expect(actor1.test).toHaveBeenCalledTimes(1);
        expect(actor4.test).toHaveBeenCalledTimes(1);
      });

      it('should receive a correct publication reply', async () => {
        expect(bus.publish({ a: '1' })[0].actor).toEqual(actor1);
        expect(bus.publish({ a: '1' })[0].reply).toBeInstanceOf(Promise);
        expect(bus.publish({ a: '1' })[1].actor).toEqual(actor4);
        expect(bus.publish({ a: '1' })[1].reply).toBeInstanceOf(Promise);
        expect(await bus.publish({ a: '1' })[0].reply).toEqual({ type: 'test', sent: { a: '1' } });
        expect(await bus.publish({ a: '1' })[1].reply).toEqual({ type: 'test', sent: { a: '1' } });
      });
    });

  });
});
