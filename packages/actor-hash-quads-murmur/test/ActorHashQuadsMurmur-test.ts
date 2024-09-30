import type { IActionHashQuads } from '@comunica/bus-hash-quads';
import { ActorHashQuads } from '@comunica/bus-hash-quads';
import { ActionContext, Bus } from '@comunica/core';
import type { Quad } from 'rdf-data-factory';
import { DataFactory } from 'rdf-data-factory';
import { ActorHashQuadsMurmur } from '../lib/ActorHashQuadsMurmur';
import '@comunica/utils-jest';

const DF = new DataFactory();

describe('ActorHashQuadsMurmur', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorHashQuadsMurmur module', () => {
    it('should be a function', () => {
      expect(ActorHashQuadsMurmur).toBeInstanceOf(Function);
    });

    it('should be a ActorHashQuadsMurmur constructor', () => {
      expect(new (<any> ActorHashQuadsMurmur)({ name: 'actor', bus })).toBeInstanceOf(ActorHashQuadsMurmur);
      expect(new (<any> ActorHashQuadsMurmur)({ name: 'actor', bus })).toBeInstanceOf(ActorHashQuads);
    });

    it('should not be able to create new ActorHashQuadsMurmur objects without \'new\'', () => {
      expect(() => {
        (<any> ActorHashQuadsMurmur)();
      }).toThrow(`Class constructor ActorHashQuadsMurmur cannot be invoked without 'new'`);
    });
  });

  describe('An ActorHashQuadsMurmur instance', () => {
    let actor: ActorHashQuadsMurmur;

    beforeEach(() => {
      actor = new ActorHashQuadsMurmur({ name: 'actor', bus });
    });

    it('should test', async() => {
      const action: IActionHashQuads = {
        context: new ActionContext(),
      };
      await expect(actor.test(action)).resolves.toPassTestVoid();
    });

    it('should run', async() => {
      const action: IActionHashQuads = {
        context: new ActionContext(),
      };
      const result = await actor.run(action);

      const quad1: Quad = DF.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.namedNode('o'),
      );
      expect(result.hashFunction(quad1)).toEqual(result.hashFunction(quad1));
      expect(result.hashFunction(quad1)).not.toEqual(result.hashFunction(DF.quad(
        DF.namedNode('s2'),
        DF.namedNode('p2'),
        DF.namedNode('o2'),
      )));
    });
  });
});
