import {ActorInit} from "@comunica/bus-init";
import {Bus} from "@comunica/core";
import {MediatorRace} from "@comunica/mediator-race";
import {PassThrough, Readable} from "stream";
import {ActorInitRdfDereference} from "../lib/ActorInitRdfDereference";

describe('ActorInitRdfDereference', () => {
  let bus;
  let busInit;
  let mediator;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    busInit = new Bus({ name: 'bus-init' });
    mediator = new MediatorRace({ name: 'mediator', bus: busInit });
  });

  describe('The ActorInitRdfDereference module', () => {
    it('should be a function', () => {
      expect(ActorInitRdfDereference).toBeInstanceOf(Function);
    });

    it('should be a ActorInitRdfDereference constructor', () => {
      expect(new (<any> ActorInitRdfDereference)({ name: 'actor', bus, mediatorRdfDereference: mediator }))
        .toBeInstanceOf(ActorInitRdfDereference);
      expect(new (<any> ActorInitRdfDereference)({ name: 'actor', bus, mediatorRdfDereference: mediator }))
        .toBeInstanceOf(ActorInit);
    });

    it('should not be able to create new ActorInitRdfDereference objects without \'new\'', () => {
      expect(() => { (<any> ActorInitRdfDereference)(); }).toThrow();
    });

    it('should store the \'mediatorRdfDereference\' parameter', () => {
      expect(new ActorInitRdfDereference({ name: 'actor', bus, mediatorRdfDereference: mediator })
        .mediatorRdfDereference).toEqual(mediator);
    });

    it('should store the \'url\' parameter', () => {
      expect(new ActorInitRdfDereference({ name: 'actor', bus, mediatorRdfDereference: mediator, url: 'abc' })
        .url).toEqual('abc');
    });
  });

  describe('An ActorInitRdfDereference instance', () => {
    let actor: ActorInitRdfDereference;

    beforeEach(() => {
      const input = new Readable({ objectMode: true });
      input._read = () => {
        input.push({ a: 'triple' });
        input.push(null);
      };
      mediator.mediate = () => Promise.resolve({ quads: input });
      actor = new ActorInitRdfDereference({ name: 'actor', bus, mediatorRdfDereference: mediator });
    });

    it('should test', () => {
      return expect(actor.test({ argv: [], env: {}, stdin: new PassThrough() })).resolves.toBeTruthy();
    });

    it('should run with URL from argv', () => {
      return actor.run({ argv: [ 'https://www.google.com/' ], env: {}, stdin: new PassThrough() })
      .then((result) => {
        return new Promise((resolve, reject) => {
          result.stdout.on('data', (line) => expect(line).toBeTruthy());
          result.stdout.on('end', resolve);
        });
      });
    });

    it('should run with configured URL', () => {
      actor = new ActorInitRdfDereference({ name: 'actor', bus, mediatorRdfDereference: mediator, url: 'abc' });
      return actor.run({ argv: [], env: {}, stdin: new PassThrough() })
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    it('should not run without URL', () => {
      return expect(actor.run({ argv: [], env: {}, stdin: new PassThrough() })).rejects.toBeTruthy();
    });
  });
});
