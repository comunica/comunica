import { Actor, Bus } from '@comunica/core';
import { namedNode, variable } from '@rdfjs/data-model';
import { termToString } from 'rdf-string';
import { Factory } from 'sparqlalgebrajs';
import { ActorAbstractPath } from '../lib/ActorAbstractPath';

describe('ActorAbstractPath', () => {
  const bus = new Bus({ name: 'bus' });
  const factory: Factory = new Factory();

  describe('The ActorAbstractPath module', () => {
    it('should be a function', () => {
      expect(ActorAbstractPath).toBeInstanceOf(Function);
    });

    it('should be a ActorAbstractPath constructor', () => {
      expect(new (<any> ActorAbstractPath)({ bus: new Bus({ name: 'bus' }), name: 'actor' }))
        .toBeInstanceOf(ActorAbstractPath);
      expect(new (<any> ActorAbstractPath)({ bus: new Bus({ name: 'bus' }), name: 'actor' }))
        .toBeInstanceOf(Actor);
    });

    it('should not be able to create new ActorAbstractPath objects without \'new\'', () => {
      expect(() => { (<any> ActorAbstractPath)(); }).toThrow();
    });
  });

  describe('An ActorAbstractPath instance', () => {
    const actor = new (<any> ActorAbstractPath)({ bus, name: 'actor' });

    it('generates unique variable', () => {
      const path = factory.createPath(
        namedNode('s'),
        factory.createLink(namedNode('p')),
        variable('b'),
      );
      return expect(termToString(actor.generateVariable(path))).not.toEqual(path.object.value);
    });
  });
});
