const Actor = require('../lib/Actor').Actor;
const Bus = require('../lib/Bus').Bus;
const Mediator = require('../lib/Mediator').Mediator;

describe('Mediator', function () {
  var bus;

  beforeEach(function() {
    bus = new Bus({ name: 'bus' });
  });

  describe('The Mediator module', function () {
    it('should be a function', function () {
      Mediator.should.be.a('function');
    });

    it('should be a Mediator constructor', function () {
      new Mediator({ name: 'mediator', bus: new Bus({ name: 'bus' }) }).should.be.an.instanceof(Mediator);
    });

    it('should not be able to create new Mediator objects without \'new\'', function () {
      expect(function() { Mediator() }).to.throw();
    });

    it('should throw an error when constructed without a name', function () {
      expect(function() { new Mediator({ bus: bus }) }).to.throw();
    });

    it('should throw an error when constructed without a bus', function () {
      expect(function() { new Mediator({ name: 'name' }) }).to.throw();
    });

    it('should throw an error when constructed without a name and bus', function () {
      expect(function() { new Mediator({}) }).to.throw();
    });

    it('should throw an error when constructed without arguments', function () {
      expect(function() { new Mediator() }).to.throw();
    });
  });

  describe('An Mediator instance', function () {
    var mediator;
    beforeEach(function() {
      mediator = new Mediator({ name: 'mediator', bus: bus });
    });

    it('should have a \'name\' field', function () {
      mediator.name.should.equal('mediator');
    });

    it('should have a \'bus\' field', function () {
      mediator.bus.should.equal(bus);
    });

    describe('without actors in the bus', function () {
      it('should throw an error when mediated over', function () {
        return mediator.mediate({}).should.be.rejected;
      });
    });

    var actor1;
    var actor2;
    var actor3;

    var actorTest = function(action) {
      return new Promise(function(resolve, reject) {
        resolve({ type: 'test', sent: action });
      });
    };
    var actorRun = function(action) {
      return new Promise(function(resolve, reject) {
        resolve({ type: 'run', sent: action });
      });
    };
    var mediateWithFirst = function(action, testResults) {
      return testResults[0].actor;
    };

    beforeEach(function() {
      actor1 = new Actor({ name: 'actor1', bus: new Bus({ name: 'bus1' }) });
      actor2 = new Actor({ name: 'actor2', bus: new Bus({ name: 'bus2' }) });
      actor3 = new Actor({ name: 'actor3', bus: new Bus({ name: 'bus3' }) });

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

    describe('without 1 actor in the bus', function () {
      beforeEach(function() {
        mediator.bus.subscribe(actor1);
      });

      it('should not throw an error when mediated over', function () {
        return mediator.mediate({}).should.not.be.rejected;
      });

      it('should call \'mediateWith\' when mediated over', function () {
        return mediator.mediate({}).then(function() {
          mediator.mediateWith.should.have.been.calledOnce;
        });
      });

      it('should call the actor test and run methods when mediated over', function () {
        return mediator.mediate({}).then(function() {
          actor1.test.should.have.been.calledOnce;
          actor1.run.should.have.been.calledOnce;
        });
      });
    });

    describe('without 3 actors in the bus', function () {
      beforeEach(function() {
        mediator.bus.subscribe(actor1);
        mediator.bus.subscribe(actor2);
        mediator.bus.subscribe(actor3);
      });

      it('should not throw an error when mediated over', function () {
        return mediator.mediate({}).should.not.be.rejected;
      });

      it('should call \'mediateWith\' when mediated over', function () {
        return mediator.mediate({}).then(function() {
          mediator.mediateWith.should.have.been.calledOnce;
        });
      });

      it('should call all the actor tests methods when mediated over', function () {
        return mediator.mediate({}).then(function() {
          actor1.test.should.have.been.calledOnce;
          actor2.test.should.have.been.calledOnce;
          actor3.test.should.have.been.calledOnce;
        });
      });

      it('should only call one actor run method when mediated over', function () {
        return mediator.mediate({}).then(function() {
          actor1.run.should.have.been.calledOnce;
          actor2.run.should.not.have.been.called;
          actor3.run.should.not.have.been.called;
        });
      });
    });
  });
});