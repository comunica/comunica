import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionHashBindings } from '@comunica/bus-hash-bindings';
import { ActorHashBindings } from '@comunica/bus-hash-bindings';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorHashBindingsSha1 } from '../lib/ActorHashBindingsSha1';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorHashBindingsSha1', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorHashBindingsSha1 module', () => {
    it('should be a function', () => {
      expect(ActorHashBindingsSha1).toBeInstanceOf(Function);
    });

    it('should be a ActorHashBindingsSha1 constructor', () => {
      expect(new (<any> ActorHashBindingsSha1)({ name: 'actor', bus })).toBeInstanceOf(ActorHashBindingsSha1);
      expect(new (<any> ActorHashBindingsSha1)({ name: 'actor', bus })).toBeInstanceOf(ActorHashBindings);
    });

    it('should not be able to create new ActorHashBindingsSha1 objects without \'new\'', () => {
      expect(() => { (<any> ActorHashBindingsSha1)(); }).toThrow();
    });
  });

  describe('An ActorHashBindingsSha1 instance', () => {
    let actor: ActorHashBindingsSha1;

    beforeEach(() => {
      actor = new ActorHashBindingsSha1({ name: 'actor', bus });
    });

    it('should test with allowHashCollisions true', () => {
      const action: IActionHashBindings = {
        context: new ActionContext(),
        allowHashCollisions: true,
      };
      return expect(actor.test(action)).resolves.toEqual(true);
    });

    it('should not test with allowHashCollisions false', () => {
      const action: IActionHashBindings = {
        context: new ActionContext(),
        allowHashCollisions: false,
      };
      return expect(actor.test(action)).rejects.toBeTruthy();
    });

    it('should run', async() => {
      const action: IActionHashBindings = {
        context: new ActionContext(),
        allowHashCollisions: false,
      };
      const result = await actor.run(action);
      expect(result.hashCollisions).toEqual(true);

      expect(result.hashFunction(BF.bindings([
        [ DF.variable('a'), DF.namedNode('ex:a') ],
        [ DF.variable('b'), DF.namedNode('ex:b') ],
      ]))).toEqual(result.hashFunction(BF.bindings([
        [ DF.variable('a'), DF.namedNode('ex:a') ],
        [ DF.variable('b'), DF.namedNode('ex:b') ],
      ])));
      expect(result.hashFunction(BF.bindings([
        [ DF.variable('a'), DF.namedNode('ex:a') ],
        [ DF.variable('b'), DF.namedNode('ex:b') ],
      ]))).not.toEqual(result.hashFunction(BF.bindings([
        [ DF.variable('a'), DF.namedNode('ex:a') ],
        [ DF.variable('c'), DF.namedNode('ex:b') ],
      ])));
    });
  });
});
