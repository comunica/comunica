import {ActorRdfMetadataExtract} from "@comunica/bus-rdf-metadata-extract";
import {Bus} from "@comunica/core";
import {Readable} from "stream";
import {ActorRdfMetadataExtractHydraCount} from "../lib/ActorRdfMetadataExtractHydraCount";

describe('ActorRdfMetadataExtractHydraCount', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfMetadataExtractHydraCount module', () => {
    it('should be a function', () => {
      expect(ActorRdfMetadataExtractHydraCount).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfMetadataExtractHydraCount constructor', () => {
      expect(new (<any> ActorRdfMetadataExtractHydraCount)({ name: 'actor', bus, predicates: [] }))
        .toBeInstanceOf(ActorRdfMetadataExtractHydraCount);
      expect(new (<any> ActorRdfMetadataExtractHydraCount)({ name: 'actor', bus, predicates: [] }))
        .toBeInstanceOf(ActorRdfMetadataExtract);
    });

    it('should not be able to create new ActorRdfMetadataExtractHydraCount objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfMetadataExtractHydraCount)(); }).toThrow();
    });

    it('should throw an error when constructed without a name', () => {
      expect(() => { new (<any> ActorRdfMetadataExtractHydraCount)({ bus, predicates: [] }); }).toThrow();
    });

    it('should throw an error when constructed without a bus', () => {
      expect(() => { new (<any> ActorRdfMetadataExtractHydraCount)({ name: 'actor', predicates: [] }); }).toThrow();
    });

    it('should throw an error when constructed without predicates', () => {
      expect(() => { new (<any> ActorRdfMetadataExtractHydraCount)({ name: 'actor', bus }); }).toThrow();
    });

    it('should throw an error when constructed without a name and bus', () => {
      expect(() => { new (<any> ActorRdfMetadataExtractHydraCount)({ predicates: [] }); }).toThrow();
    });

    it('should throw an error when constructed without a name, bus and predicates', () => {
      expect(() => { new (<any> ActorRdfMetadataExtractHydraCount)({ }); }).toThrow();
    });

    it('should throw an error when constructed without arguments', () => {
      expect(() => { new (<any> ActorRdfMetadataExtractHydraCount)(); }).toThrow();
    });
  });

  describe('An ActorRdfMetadataExtractHydraCount instance', () => {
    let actor: ActorRdfMetadataExtractHydraCount;
    let input: Readable;
    let inputNone: Readable;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractHydraCount({ name: 'actor', bus, predicates: [ 'px', 'py' ] });
      input = stream([
        quad('s1', 'p1', 'o1', ''),
        quad('g1', 'py', '12345', ''),
        quad('s2', 'px', '5678', ''),
        quad('s3', 'p3', 'o3', ''),
      ]);
      inputNone = stream([
        quad('s1', 'p1', 'o1', ''),
      ]);
    });

    it('should test', () => {
      return expect(actor.test({ pageUrl: '', metadata: input })).resolves.toBeTruthy();
    });

    it('should run on a stream where count is given', () => {
      return expect(actor.run({ pageUrl: '', metadata: input })).resolves
        .toEqual({ metadata: { totalItems: 12345 }});
    });

    it('should run on a stream where count is not given', () => {
      return expect(actor.run({ pageUrl: '', metadata: inputNone })).resolves
        .toEqual({ metadata: { totalItems: Infinity }});
    });
  });
});

function stream(quads) {
  const readable = new Readable({ objectMode: true });
  readable._read = () => {
    readable.push(quads.shift());
    if (quads.length === 0) {
      readable.push(null);
    }
  };
  return readable;
}

function quad(s, p, o, g) {
  return {
    graph:     { value: g },
    object:    { value: o },
    predicate: { value: p },
    subject:   { value: s },
  };
}
