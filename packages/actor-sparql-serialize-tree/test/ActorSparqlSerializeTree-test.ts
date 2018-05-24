import {ActorSparqlSerialize} from "@comunica/bus-sparql-serialize";
import {Bus} from "@comunica/core";
import {ActorSparqlSerializeTree} from "../lib/ActorSparqlSerializeTree";

describe('ActorSparqlSerializeTree', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorSparqlSerializeTree module', () => {
    it('should be a function', () => {
      expect(ActorSparqlSerializeTree).toBeInstanceOf(Function);
    });

    it('should be a ActorSparqlSerializeTree constructor', () => {
      expect(new (<any> ActorSparqlSerializeTree)({ name: 'actor', bus })).toBeInstanceOf(ActorSparqlSerializeTree);
      expect(new (<any> ActorSparqlSerializeTree)({ name: 'actor', bus })).toBeInstanceOf(ActorSparqlSerialize);
    });

    it('should not be able to create new ActorSparqlSerializeTree objects without \'new\'', () => {
      expect(() => { (<any> ActorSparqlSerializeTree)(); }).toThrow();
    });
  });

  describe('An ActorSparqlSerializeTree instance', () => {
    let actor: ActorSparqlSerializeTree;

    beforeEach(() => {
      actor = new ActorSparqlSerializeTree({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
