import {Actor, Bus} from "@comunica/core";
import {blankNode, namedNode} from "rdf-data-model";
import {Factory} from "sparqlalgebrajs";
import {ActorAbstractPath} from "../lib/ActorAbstractPath";

describe('ActorAbstractMediaTyped', () => {
  const bus = new Bus({ name: 'bus' });
  const factory: Factory = new Factory();

  describe('The ActorAbstractMediaTyped module', () => {
    it('should be a function', () => {
      expect(ActorAbstractPath).toBeInstanceOf(Function);
    });

    it('should be a ActorAbstractMediaTyped constructor', () => {
      expect(new (<any> ActorAbstractPath)({ bus: new Bus({ name: 'bus' }), name: 'actor' }))
        .toBeInstanceOf(ActorAbstractPath);
      expect(new (<any> ActorAbstractPath)({ bus: new Bus({ name: 'bus' }), name: 'actor' }))
        .toBeInstanceOf(Actor);
    });

    it('should not be able to create new ActorAbstractMediaTyped objects without \'new\'', () => {
      expect(() => { (<any> ActorAbstractPath)(); }).toThrow();
    });
  });

  describe('An ActorAbstractMediaTyped instance', () => {
    const actor = new (<any> ActorAbstractPath)({ bus, name: 'actor' });

    it('generates unique blank nodes', () => {
      const path = factory.createPath(
        namedNode('s'),
        factory.createLink(namedNode('p')),
        blankNode('b'),
      );
      return expect(actor.generateBlankNode(path).value).not.toEqual(path.object.value);
    });
  });
});
