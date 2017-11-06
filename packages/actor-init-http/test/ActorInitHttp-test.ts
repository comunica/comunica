import {ActorHttpNodeFetch} from "@comunica/actor-http-node-fetch";
import {ActorInit} from "@comunica/bus-init";
import {Bus} from "@comunica/core";
import {MediatorNumber} from "@comunica/mediator-number";
import {PassThrough} from "stream";
import {ActorInitHttp} from "../lib/ActorInitHttp";

describe('ActorInitHttp', () => {
  let bus;
  let busInit;
  let mediator;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    busInit = new Bus({ name: 'bus-init' });
    mediator = new MediatorNumber({ name: 'mediator', bus: busInit, field: 'time', type: MediatorNumber.MIN });
  });

  describe('The ActorInitHttp module', () => {
    it('should be a function', () => {
      expect(ActorInitHttp).toBeInstanceOf(Function);
    });

    it('should be a ActorInitHttp constructor', () => {
      expect(new (<any> ActorInitHttp)({ name: 'actor', bus, mediatorHttp: mediator })).toBeInstanceOf(ActorInitHttp);
      expect(new (<any> ActorInitHttp)({ name: 'actor', bus, mediatorHttp: mediator })).toBeInstanceOf(ActorInit);
    });

    it('should not be able to create new ActorInitHttp objects without \'new\'', () => {
      expect(() => { (<any> ActorInitHttp)(); }).toThrow();
    });

    it('should throw an error when constructed without a name', () => {
      expect(() => { new (<any> ActorInitHttp)({ bus, mediatorHttp: mediator }); }).toThrow();
    });

    it('should throw an error when constructed without a bus', () => {
      expect(() => { new (<any> ActorInitHttp)({ name: 'actor', mediatorHttp: mediator }); }).toThrow();
    });

    it('should throw an error when constructed without a mediator', () => {
      expect(() => { new (<any> ActorInitHttp)({ name: 'actor', bus }); }).toThrow();
    });

    it('should throw an error when constructed without a name, bus and mediator', () => {
      expect(() => { new (<any> ActorInitHttp)({}); }).toThrow();
    });

    it('should throw an error when constructed without arguments', () => {
      expect(() => { new (<any> ActorInitHttp)(); }).toThrow();
    });

    it('should store the \'mediatorHttp\' parameter', () => {
      expect(new ActorInitHttp({ name: 'actor', bus, mediatorHttp: mediator }).mediatorHttp).toEqual(mediator);
    });

    it('should store the \'url\' parameter', () => {
      expect(new ActorInitHttp({ name: 'actor', bus, mediatorHttp: mediator, url: 'abc' }).url).toEqual('abc');
    });

    it('should store the \'method\' parameter', () => {
      expect(new ActorInitHttp({ name: 'actor', bus, mediatorHttp: mediator, method: 'abc' }).method).toEqual('abc');
    });

    it('should store the \'headers\' parameter', () => {
      expect(new ActorInitHttp({ name: 'actor', bus, mediatorHttp: mediator, headers: [ 'abc', 'def' ] }).headers)
        .toEqual([ 'abc', 'def' ]);
    });
  });

  describe('An ActorInitHttp instance', () => {
    let actor: ActorInitHttp;

    beforeEach(() => {
      actor = new ActorInitHttp({ name: 'actor', bus, mediatorHttp: mediator });
      busInit.subscribe(new ActorHttpNodeFetch({ name: 'actor-node-fetch', bus }));
    });

    it('should test', () => {
      return expect(actor.test({ argv: [], env: {}, stdin: new PassThrough() })).resolves.toBe(null);
    });

    it('should run', () => {
      return expect(actor.run({ argv: [ 'https://www.google.com/' ], env: {}, stdin: new PassThrough() }))
        .resolves.toHaveProperty('stdout');
    });

    it('should run with parameters', () => {
      actor = new ActorInitHttp({
        bus,
        headers: [ 'Accept: text/html', 'user-agent: unit-tests' ],
        mediatorHttp: mediator,
        method: 'GET',
        name: 'actor',
        url: 'https://www.google.com/',
      });
      return expect(actor.run({ argv: [], env: {}, stdin: new PassThrough() })).resolves.toHaveProperty('stdout');
    });

    it('should run with argv', () => {
      return expect(actor
        .run({ argv: [ 'https://www.google.com/this/is/not/a/page' ], env: {}, stdin: new PassThrough() }))
        .resolves.toHaveProperty('stderr');
    });
  });
});
