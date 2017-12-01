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

    it('should test', () => {
      return expect(actor.test({ query: "abc" })).resolves.toBeTruthy();
    });

    it('should run', () => {
      return expect(actor.run({ query: "SELECT * WHERE { ?a a ?b }" })).resolves.toMatchObject(
        {
          operation: {
            input: {
              patterns: [
                {
                  graph: {termType: "DefaultGraph", value: ""},
                  object: {termType: "Variable", value: "b"},
                  predicate: {termType: "NamedNode", value: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"},
                  subject: {termType: "Variable", value: "a"},
                  type: "pattern",
                },
              ],
              type: "bgp"},
            type: "project",
            variables: [
              {
                termType: "Variable",
                value: "a",
              },
              {
                termType: "Variable",
                value: "b",
              },
            ],
          },
        });
    });
  });
});
