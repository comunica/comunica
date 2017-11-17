import {ActorInit} from "@comunica/bus-init";
import {Bus} from "@comunica/core";
import {PassThrough, Readable} from "stream";
import {ActorInitRdfDereferencePaged} from "../lib/ActorInitRdfDereferencePaged";

describe('ActorInitRdfDereferencePaged', () => {
  let bus;
  let mediator;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediator = {};
  });

  describe('The ActorInitRdfDereferencePaged module', () => {
    it('should be a function', () => {
      expect(ActorInitRdfDereferencePaged).toBeInstanceOf(Function);
    });

    it('should be a ActorInitRdfDereferencePaged constructor', () => {
      expect(new (<any> ActorInitRdfDereferencePaged)({ name: 'actor', bus, mediatorRdfDereferencePaged: mediator }))
        .toBeInstanceOf(ActorInitRdfDereferencePaged);
      expect(new (<any> ActorInitRdfDereferencePaged)({ name: 'actor', bus, mediatorRdfDereferencePaged: mediator }))
        .toBeInstanceOf(ActorInit);
    });

    it('should not be able to create new ActorInitRdfDereferencePaged objects without \'new\'', () => {
      expect(() => { (<any> ActorInitRdfDereferencePaged)(); }).toThrow();
    });
  });

  describe('An ActorInitRdfDereferencePaged instance', () => {
    let actor: ActorInitRdfDereferencePaged;

    beforeEach(() => {
      const input = new Readable({ objectMode: true });
      input._read = () => {
        input.push({ a: 'triple' });
        input.push(null);
      };
      mediator.mediate = () => Promise.resolve({ data: input });
      actor = new ActorInitRdfDereferencePaged({ name: 'actor', bus, mediatorRdfDereferencePaged: mediator });
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
      actor = new ActorInitRdfDereferencePaged(
        { name: 'actor', bus, mediatorRdfDereferencePaged: mediator, url: 'abc' });
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
