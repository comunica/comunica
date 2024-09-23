import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionHashBindings } from '@comunica/bus-hash-bindings';
import { ActorHashBindings } from '@comunica/bus-hash-bindings';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorHashBindingsSha1 } from '../lib/ActorHashBindingsSha1';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

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
      expect(() => {
        (<any> ActorHashBindingsSha1)();
      }).toThrow(`Class constructor ActorHashBindingsSha1 cannot be invoked without 'new'`);
    });
  });

  describe('An ActorHashBindingsSha1 instance', () => {
    let actor: ActorHashBindingsSha1;

    beforeEach(() => {
      actor = new ActorHashBindingsSha1({ name: 'actor', bus });
    });

    it('should test with allowHashCollisions true', async() => {
      const action: IActionHashBindings = {
        context: new ActionContext(),
        allowHashCollisions: true,
      };
      await expect(actor.test(action)).resolves.toPassTestVoid();
    });

    it('should not test with allowHashCollisions false', async() => {
      const action: IActionHashBindings = {
        context: new ActionContext(),
        allowHashCollisions: false,
      };
      await expect(actor.test(action)).resolves
        .toFailTest(`Actor actor can not provide hash functions without hash collisions`);
    });

    it('should run', async() => {
      const action: IActionHashBindings = {
        context: new ActionContext(),
        allowHashCollisions: false,
      };
      const result = await actor.run(action);
      expect(result.hashCollisions).toBe(true);
      const vars = [ DF.variable('a'), DF.variable('b') ];

      expect(result.hashFunction(BF.bindings([
        [ DF.variable('a'), DF.namedNode('ex:a') ],
        [ DF.variable('b'), DF.namedNode('ex:b') ],
      ]), vars)).toEqual(result.hashFunction(BF.bindings([
        [ DF.variable('a'), DF.namedNode('ex:a') ],
        [ DF.variable('b'), DF.namedNode('ex:b') ],
      ]), vars));
      expect(result.hashFunction(BF.bindings([
        [ DF.variable('b'), DF.namedNode('ex:b') ],
        [ DF.variable('a'), DF.namedNode('ex:a') ],
      ]), vars)).toEqual(result.hashFunction(BF.bindings([
        [ DF.variable('a'), DF.namedNode('ex:a') ],
        [ DF.variable('b'), DF.namedNode('ex:b') ],
      ]), vars));
      expect(result.hashFunction(BF.bindings([
        [ DF.variable('a'), DF.namedNode('ex:a') ],
        [ DF.variable('b'), DF.namedNode('ex:b') ],
      ]), vars)).not.toEqual(result.hashFunction(BF.bindings([
        [ DF.variable('a'), DF.namedNode('ex:a') ],
        [ DF.variable('c'), DF.namedNode('ex:b') ],
      ]), vars));
    });
  });
});
