import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionHashBindings } from '@comunica/bus-hash-bindings';
import { ActorHashBindings } from '@comunica/bus-hash-bindings';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorHashBindingsMurmur } from '../lib/ActorHashBindingsMurmur';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('ActorHashBindingsMurmur', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorHashBindingsMurmur module', () => {
    it('should be a function', () => {
      expect(ActorHashBindingsMurmur).toBeInstanceOf(Function);
    });

    it('should be a ActorHashBindingsMurmur constructor', () => {
      expect(new (<any> ActorHashBindingsMurmur)({ name: 'actor', bus })).toBeInstanceOf(ActorHashBindingsMurmur);
      expect(new (<any> ActorHashBindingsMurmur)({ name: 'actor', bus })).toBeInstanceOf(ActorHashBindings);
    });

    it('should not be able to create new ActorHashBindingsMurmur objects without \'new\'', () => {
      expect(() => {
        (<any> ActorHashBindingsMurmur)();
      }).toThrow(`Class constructor ActorHashBindingsMurmur cannot be invoked without 'new'`);
    });
  });

  describe('An ActorHashBindingsMurmur instance', () => {
    let actor: ActorHashBindingsMurmur;

    beforeEach(() => {
      actor = new ActorHashBindingsMurmur({ name: 'actor', bus });
    });

    it('should test', async() => {
      const action: IActionHashBindings = {
        context: new ActionContext(),
      };
      await expect(actor.test(action)).resolves.toPassTestVoid();
    });

    it('should run', async() => {
      const action: IActionHashBindings = {
        context: new ActionContext(),
      };
      const result = await actor.run(action);
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
