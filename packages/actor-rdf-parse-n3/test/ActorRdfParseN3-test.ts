import {ActorRdfParse} from "@comunica/bus-rdf-parse";
import {Bus} from "@comunica/core/lib/Bus";
import * as RDF from "rdf-js";
import {Readable} from "stream";
import {ActorRdfParseN3} from "../lib/ActorRdfParseN3";

describe('ActorRdfParseN3', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfParseN3 module', () => {
    it('should be a function', () => {
      expect(ActorRdfParseN3).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParseN3 constructor', () => {
      expect(new (<any> ActorRdfParseN3)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfParseN3);
      expect(new (<any> ActorRdfParseN3)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfParse);
    });

    it('should not be able to create new ActorRdfParseN3 objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfParseN3)(); }).toThrow();
    });

    it('should throw an error when constructed without a name', () => {
      expect(() => { new (<any> ActorRdfParseN3)({ bus }); }).toThrow();
    });

    it('should throw an error when constructed without a bus', () => {
      expect(() => { new (<any> ActorRdfParseN3)({ name: 'actor' }); }).toThrow();
    });

    it('should throw an error when constructed without a name and bus', () => {
      expect(() => { new (<any> ActorRdfParseN3)({}); }).toThrow();
    });

    it('should throw an error when constructed without arguments', () => {
      expect(() => { new (<any> ActorRdfParseN3)(); }).toThrow();
    });
  });

  describe('An ActorRdfParseN3 instance', () => {
    let actor: ActorRdfParseN3;
    let input: Readable;

    beforeEach(() => {
      actor = new ActorRdfParseN3({ name: 'actor', bus });
      input = stringToStream(`
      <a> <b> <c>.
      <d> <e> <f> <g>.
      `);
    });

    it('should test on TriG', () => {
      return expect(actor.test({ input, mediaType: 'application/trig' })).resolves.toBeTruthy();
    });

    it('should test on N-Quads', () => {
      return expect(actor.test({ input, mediaType: 'application/n-quads' })).resolves.toBeTruthy();
    });

    it('should test on Turtle', () => {
      return expect(actor.test({ input, mediaType: 'text/turtle' })).resolves.toBeTruthy();
    });

    it('should test on N-Triples', () => {
      return expect(actor.test({ input, mediaType: 'application/n-triples' })).resolves.toBeTruthy();
    });

    it('should not test on JSON-LD', () => {
      return expect(actor.test({ input, mediaType: 'application/ld+json' })).rejects.toBeTruthy();
    });

    it('should run', () => {
      return actor.run({ input, mediaType: 'text/turtle' })
        .then((output) => {
          return new Promise((resolve, reject) => {
            const quads: RDF.Quad[] = [];
            output.quads.on('data', (quad) => quads.push(quad));
            output.quads.on('end', () => {
              if (quads.length === 2) {
                resolve();
              } else {
                reject();
              }
            });
          });
        });
    });
  });
});

function stringToStream(input: string) {
  const array: string[] = input.split('');
  const readable = new Readable();
  readable._read = () => {
    readable.push(array.shift());
    if (array.length === 0) {
      readable.push(null);
    }
    return;
  };
  return readable;
}
