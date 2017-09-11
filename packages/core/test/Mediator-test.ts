import { expect } from 'chai';
import * as sinon from 'sinon';

import {Actor} from "../lib/Actor";
import {Bus} from "../lib/Bus";
import {Mediator} from "../lib/Mediator";

describe('Mediator', () => {
    let bus: any;

    beforeEach(() => {
        bus = new Bus({ name: 'bus' });
    });

    describe('The Mediator module', () => {
        it('should be a function', () => {
            Mediator.should.be.a('function');
        });

        it('should be a Mediator constructor', () => {
            new (<any> Mediator)({ name: 'mediator', bus: new Bus({ name: 'bus' }) }).should.be.an.instanceof(Mediator);
        });

        it('should not be able to create new Mediator objects without \'new\'', () => {
            expect(() => { (<any> Mediator)(); }).to.throw();
        });

        it('should throw an error when constructed without a name', () => {
            expect(() => { new (<any> Mediator)({ bus }); }).to.throw();
        });

        it('should throw an error when constructed without a bus', () => {
            expect(() => { new (<any> Mediator)({ name: 'name' }); }).to.throw();
        });

        it('should throw an error when constructed without a name and bus', () => {
            expect(() => { new (<any> Mediator)({}); }).to.throw();
        });

        it('should throw an error when constructed without arguments', () => {
            expect(() => { new (<any> Mediator)(); }).to.throw();
        });
    });

    describe('An Mediator instance', () => {
        let mediator: any;
        beforeEach(() => {
            mediator = new (<any> Mediator)({ name: 'mediator', bus });
        });

        it('should have a \'name\' field', () => {
            mediator.name.should.equal('mediator');
        });

        it('should have a \'bus\' field', () => {
            mediator.bus.should.equal(bus);
        });

        describe('without actors in the bus', () => {
            it('should throw an error when mediated over', () => {
                return mediator.mediate({}).should.be.rejected;
            });
        });

        let actor1: any;
        let actor2: any;
        let actor3: any;

        const actorTest = (action: any) => {
            return new Promise((resolve) => {
                resolve({ type: 'test', sent: action });
            });
        };
        const actorRun = (action: any) => {
            return new Promise((resolve) => {
                resolve({ type: 'run', sent: action });
            });
        };
        const mediateWithFirst = (action: any, testResults: any) => {
            return testResults[0].actor;
        };

        beforeEach(() => {
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

            sinon.spy(actor1, 'test');
            sinon.spy(actor2, 'test');
            sinon.spy(actor3, 'test');
            sinon.spy(actor1, 'run');
            sinon.spy(actor2, 'run');
            sinon.spy(actor3, 'run');
            sinon.spy(mediator, 'mediateWith');
        });

        describe('without 1 actor in the bus', () => {
            beforeEach(() => {
                mediator.bus.subscribe(actor1);
            });

            it('should not throw an error when mediated over', () => {
                return mediator.mediate({}).should.not.be.rejected;
            });

            it('should call \'mediateWith\' when mediated over', () => {
                return mediator.mediate({}).then(() => {
                    mediator.mediateWith.should.have.been.calledOnce;
                });
            });

            it('should call the actor test and run methods when mediated over', () => {
                return mediator.mediate({}).then(() => {
                    actor1.test.should.have.been.calledOnce;
                    actor1.run.should.have.been.calledOnce;
                });
            });
        });

        describe('without 3 actors in the bus', () => {
            beforeEach(() => {
                mediator.bus.subscribe(actor1);
                mediator.bus.subscribe(actor2);
                mediator.bus.subscribe(actor3);
            });

            it('should not throw an error when mediated over', () => {
                return mediator.mediate({}).should.not.be.rejected;
            });

            it('should call \'mediateWith\' when mediated over', () => {
                return mediator.mediate({}).then(() => {
                    mediator.mediateWith.should.have.been.calledOnce;
                });
            });

            it('should call all the actor tests methods when mediated over', () => {
                return mediator.mediate({}).then(() => {
                    actor1.test.should.have.been.calledOnce;
                    actor2.test.should.have.been.calledOnce;
                    actor3.test.should.have.been.calledOnce;
                });
            });

            it('should only call one actor run method when mediated over', () => {
                return mediator.mediate({}).then(() => {
                    actor1.run.should.have.been.calledOnce;
                    actor2.run.should.not.have.been.called;
                    actor3.run.should.not.have.been.called;
                });
            });
        });
    });
});
