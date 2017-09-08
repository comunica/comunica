const Actor = require('../lib/Actor').Actor;
const Bus = require('../lib/Bus').Bus;

describe('Actor', function () {
  var bus = new Bus({ name: 'bus' });

  describe('The Actor module', function () {
    it('should be a function', function () {
      Actor.should.be.a('function');
    });

    it('should be a Actor constructor', function () {
      new Actor({ name: 'actor', bus: new Bus({ name: 'bus' }) }).should.be.an.instanceof(Actor);
    });

    it('should not be able to create new Actor objects without \'new\'', function () {
      expect(function() { Actor() }).to.throw();
    });

    it('should throw an error when constructed without a name', function () {
      expect(function() { new Actor({ bus: bus }) }).to.throw();
    });

    it('should throw an error when constructed without a bus', function () {
      expect(function() { new Actor({ name: 'name' }) }).to.throw();
    });

    it('should throw an error when constructed without a name and bus', function () {
      expect(function() { new Actor({}) }).to.throw();
    });

    it('should throw an error when constructed without arguments', function () {
      expect(function() { new Actor() }).to.throw();
    });
  });

  describe('An Actor instance', function () {
    var actor = new Actor({ name: 'actor', bus: bus });

    it('should have a \'name\' field', function () {
      actor.name.should.equal('actor');
    });

    it('should have a \'bus\' field', function () {
      actor.bus.should.equal(bus);
    });
  });
});