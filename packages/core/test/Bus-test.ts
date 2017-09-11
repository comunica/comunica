import { expect } from 'chai';
import * as sinon from 'sinon';

import {Actor} from "../lib/Actor";
import {Bus} from "../lib/Bus";

describe('Bus', () => {
    describe('The Bus module', () => {
        it('should be a function', () => {
            Bus.should.be.a('function');
        });

        it('should be a Bus constructor', () => {
            new Bus({ name: 'Bus' }).should.be.an.instanceof(Bus);
        });

        it('should not be able to create new Bus objects without \'new\'', () => {
            expect(() => { (<any> Bus)(); }).to.throw();
        });

        it('should throw an error when constructed without a name', () => {
            expect(() => { new (<any> Bus)({}); }).to.throw();
        });

        it('should throw an error when constructed without arguments', () => {
            expect(() => { new (<any> Bus)(); }).to.throw();
        });
    });

    describe('A Bus instance', () => {
        let bus: any;
        const actor1 = new (<any> Actor)({ name: 'actor1', bus: new Bus({ name: 'bus1' }) });
        const actor2 = new (<any> Actor)({ name: 'actor2', bus: new Bus({ name: 'bus2' }) });
        const actor3 = new (<any> Actor)({ name: 'actor3', bus: new Bus({ name: 'bus3' }) });

        const actorTest = (action: any) => {
            return new Promise((resolve) => {
                resolve({ type: 'test', sent: action });
            });
        };

        beforeEach(() => {
            actor1.test = actorTest;
            actor2.test = actorTest;
            actor3.test = actorTest;

            bus = new Bus({ name: 'bus' });

            sinon.spy(actor1, 'test');
            sinon.spy(actor2, 'test');
            sinon.spy(actor3, 'test');
        });

        it('should have a \'name\' field', () => {
            bus.name.should.equal('bus');
        });

        it('should allow an actor to be subscribed', () => {
            bus.subscribe(actor1);
            bus.actors.should.contain(actor1);
            bus.actors.length.should.equal(1);
        });

        it('should allow an actor to be subscribed and unsubscribed', () => {
            bus.subscribe(actor1);
            bus.actors.should.contain(actor1);
            bus.actors.length.should.equal(1);
            bus.unsubscribe(actor1).should.equal(true);
            bus.actors.should.not.contain(actor1);
            bus.actors.length.should.equal(0);
        });

        it('should allow multiple actors to be subscribed and unsubscribed', () => {
            bus.subscribe(actor1);
            bus.subscribe(actor2);
            bus.subscribe(actor3);
            bus.actors.should.contain(actor1);
            bus.actors.should.contain(actor2);
            bus.actors.should.contain(actor3);
            bus.actors.length.should.equal(3);
            bus.unsubscribe(actor1).should.equal(true);
            bus.actors.length.should.equal(2);
            bus.unsubscribe(actor3).should.equal(true);
            bus.actors.should.not.contain(actor1);
            bus.actors.should.contain(actor2);
            bus.actors.should.not.contain(actor3);
            bus.actors.length.should.equal(1);
        });

        it('should allow an actor to be subscribed multiple times', () => {
            bus.subscribe(actor1);
            bus.subscribe(actor1);
            bus.subscribe(actor1);
            bus.actors.length.should.equal(3);
        });

        it('should return \'false\' when unsubscribing an actor that was not subscribed', () => {
            bus.unsubscribe(actor1).should.equal(false);
        });

        describe('without actors', () => {
            it('should send an action to 0 actors', () => {
                bus.publish({});
                actor1.test.should.not.have.been.called;
                actor2.test.should.not.have.been.called;
                actor3.test.should.not.have.been.called;
            });
        });

        describe('with 1 actors', () => {
            beforeEach(() => {
                bus.subscribe(actor1);
            });

            it('should send an action to 1 actor', () => {
                bus.publish({});
                actor1.test.should.have.been.calledOnce;
                actor2.test.should.not.have.been.called;
                actor3.test.should.not.have.been.called;
            });

            it('should send two actions to 1 actor', () => {
                bus.publish({});
                bus.publish({});
                actor1.test.should.have.been.calledTwice;
                actor2.test.should.not.have.been.called;
                actor3.test.should.not.have.been.called;
            });

            it('should send no action to 1 unsubscribed actor', () => {
                bus.unsubscribe(actor1);
                bus.publish({});
                actor1.test.should.not.have.been.called;
                actor2.test.should.not.have.been.called;
                actor3.test.should.not.have.been.called;
            });

            it('should receive 1 publication reply', () => {
                bus.publish({}).length.should.equal(1);
            });

            it('should receive a correct publication reply', () => {
                bus.publish({ a: 'b' })[0].actor.should.equal(actor1);
                bus.publish({ a: 'b' })[0].reply.should.be.instanceof(Promise);
                return bus.publish({ a: 'b' })[0].reply.should.eventually
                    .deep.equal({ type: 'test', sent: { a: 'b' } });
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
                actor1.test.should.have.been.calledOnce;
                actor2.test.should.have.been.calledOnce;
                actor3.test.should.have.been.calledOnce;
            });

            it('should send two actions to 3 actors', () => {
                bus.publish({});
                bus.publish({});
                actor1.test.should.have.been.calledTwice;
                actor2.test.should.have.been.calledTwice;
                actor3.test.should.have.been.calledTwice;
            });

            it('should send no action to 1 unsubscribed actor, but an action to 2 subscribed actors', () => {
                bus.unsubscribe(actor1);
                bus.publish({});
                actor1.test.should.not.have.been.called;
                actor2.test.should.have.been.calledOnce;
                actor3.test.should.have.been.calledOnce;
            });

            it('should receive 3 publication replies', () => {
                bus.publish({}).length.should.equal(3);
            });

            it('should receive correct publication replies', () => {
                bus.publish({ a: 'b' })[0].actor.should.equal(actor1);
                bus.publish({ a: 'b' })[0].reply.should.be.instanceof(Promise);

                bus.publish({ a: 'b' })[1].actor.should.equal(actor2);
                bus.publish({ a: 'b' })[1].reply.should.be.instanceof(Promise);

                bus.publish({ a: 'b' })[2].actor.should.equal(actor3);
                bus.publish({ a: 'b' })[2].reply.should.be.instanceof(Promise);
            });
        });

    });
});
