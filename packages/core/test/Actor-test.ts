import { expect } from 'chai';

import {Actor} from "../lib/Actor";
import {Bus} from "../lib/Bus";

describe('Actor', () => {
    const bus = new Bus({ name: 'bus' });

    describe('The Actor module', () => {
        it('should be a function', () => {
            Actor.should.be.a('function');
        });

        it('should be a Actor constructor', () => {
            new (<any> Actor)({ name: 'actor', bus: new Bus({ name: 'bus' }) }).should.be.an.instanceof(Actor);
        });

        it('should not be able to create new Actor objects without \'new\'', () => {
            expect(() => { (<any> Actor)(); }).to.throw();
        });

        it('should throw an error when constructed without a name', () => {
            expect(() => { new (<any> Actor)({ bus }); }).to.throw();
        });

        it('should throw an error when constructed without a bus', () => {
            expect(() => { new (<any> Actor)({ name: 'name' }); }).to.throw();
        });

        it('should throw an error when constructed without a name and bus', () => {
            expect(() => { new (<any> Actor)({}); }).to.throw();
        });

        it('should throw an error when constructed without arguments', () => {
            expect(() => { new (<any> Actor)(); }).to.throw();
        });
    });

    describe('An Actor instance', () => {
        const actor = new (<any> Actor)({ name: 'actor', bus });

        it('should have a \'name\' field', () => {
            actor.name.should.equal('actor');
        });

        it('should have a \'bus\' field', () => {
            actor.bus.should.equal(bus);
        });
    });
});
