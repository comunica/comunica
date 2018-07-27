import {ActorSparqlParse} from "@comunica/bus-sparql-parse";
import {Bus} from "@comunica/core";
import {ActorSparqlParseAlgebra} from "../lib/ActorSparqlParseAlgebra";

describe('ActorSparqlParseAlgebra', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorSparqlParseAlgebra module', () => {
    it('should be a function', () => {
      expect(ActorSparqlParseAlgebra).toBeInstanceOf(Function);
    });

    it('should be a ActorSparqlParseAlgebra constructor', () => {
      expect(new (<any> ActorSparqlParseAlgebra)({ name: 'actor', bus })).toBeInstanceOf(ActorSparqlParseAlgebra);
      expect(new (<any> ActorSparqlParseAlgebra)({ name: 'actor', bus })).toBeInstanceOf(ActorSparqlParse);
    });

    it('should not be able to create new ActorSparqlParseAlgebra objects without \'new\'', () => {
      expect(() => { (<any> ActorSparqlParseAlgebra)(); }).toThrow();
    });
  });

  describe('An ActorSparqlParseAlgebra instance', () => {
    let actor: ActorSparqlParseAlgebra;

    beforeEach(() => {
      actor = new ActorSparqlParseAlgebra({ name: 'actor', bus });
    });

    it('should not test on the graphql format', () => {
      return expect(actor.test({ query: 'a', queryFormat: 'graphql' })).rejects.toBeTruthy();
    });

    it('should test on no format', () => {
      return expect(actor.test({ query: 'a' })).resolves.toBeTruthy();
    });

    it('should test on the sparql format', () => {
      return expect(actor.test({ query: 'a', queryFormat: 'sparql' })).resolves.toBeTruthy();
    });

    it('should run', () => {
      return expect(actor.run({ query: "SELECT * WHERE { ?a a ?b }" })).resolves.toMatchObject(
        {
          operation: {
            input: {
              patterns: [
                {
                  graph: {value: ""},
                  object: {value: "b"},
                  predicate: {value: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"},
                  subject: {value: "a"},
                  type: "pattern",
                },
              ],
              type: "bgp"},
            type: "project",
            variables: [
              {
                value: "a",
              },
              {
                value: "b",
              },
            ],
          },
        });
    });
  });
});
