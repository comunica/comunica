import {ActorSparqlParse} from "@comunica/bus-sparql-parse";
import {Bus} from "@comunica/core";
import {ActorSparqlParseGraphql} from "../lib/ActorSparqlParseGraphql";

describe('ActorSparqlParseGraphql', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorSparqlParseGraphql module', () => {
    it('should be a function', () => {
      expect(ActorSparqlParseGraphql).toBeInstanceOf(Function);
    });

    it('should be a ActorSparqlParseGraphql constructor', () => {
      expect(new (<any> ActorSparqlParseGraphql)({ name: 'actor', bus })).toBeInstanceOf(ActorSparqlParseGraphql);
      expect(new (<any> ActorSparqlParseGraphql)({ name: 'actor', bus })).toBeInstanceOf(ActorSparqlParse);
    });

    it('should not be able to create new ActorSparqlParseGraphql objects without \'new\'', () => {
      expect(() => { (<any> ActorSparqlParseGraphql)(); }).toThrow();
    });
  });

  describe('An ActorSparqlParseGraphql instance', () => {
    let actor: ActorSparqlParseGraphql;

    beforeEach(() => {
      actor = new ActorSparqlParseGraphql({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
