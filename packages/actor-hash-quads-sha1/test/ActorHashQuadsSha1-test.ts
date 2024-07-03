import type { IActionHashQuads } from '@comunica/bus-hash-quads';
import { ActorHashQuads } from '@comunica/bus-hash-quads';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type { Quad } from 'rdf-data-factory';
import { DataFactory } from 'rdf-data-factory';
import { ActorHashQuadsSha1 } from '../lib/ActorHashQuadsSha1';

const DF = new DataFactory();

describe('ActorHashQuadsSha1', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorHashQuadsSha1 module', () => {
    it('should be a function', () => {
      expect(ActorHashQuadsSha1).toBeInstanceOf(Function);
    });

    it('should be a ActorHashQuadsSha1 constructor', () => {
      expect(new (<any> ActorHashQuadsSha1)({ name: 'actor', bus })).toBeInstanceOf(ActorHashQuadsSha1);
      expect(new (<any> ActorHashQuadsSha1)({ name: 'actor', bus })).toBeInstanceOf(ActorHashQuads);
    });

    it('should not be able to create new ActorHashQuadsSha1 objects without \'new\'', () => {
      expect(() => {
        (<any> ActorHashQuadsSha1)();
      }).toThrow(`Class constructor ActorHashQuadsSha1 cannot be invoked without 'new'`);
    });
  });

  describe('An ActorHashQuadsSha1 instance', () => {
    let actor: ActorHashQuadsSha1;

    beforeEach(() => {
      actor = new ActorHashQuadsSha1({ name: 'actor', bus });
    });

    it('should test with allowHashCollisions true', async() => {
      const action: IActionHashQuads = {
        context: new ActionContext(),
        allowHashCollisions: true,
      };
      await expect(actor.test(action)).resolves.toBe(true);
    });

    it('should not test with allowHashCollisions false', async() => {
      const action: IActionHashQuads = {
        context: new ActionContext(),
        allowHashCollisions: false,
      };
      await expect(actor.test(action)).rejects.toBeTruthy();
    });

    it('should run', async() => {
      const action: IActionHashQuads = {
        context: new ActionContext(),
        allowHashCollisions: false,
      };
      const result = await actor.run(action);
      expect(result.hashCollisions).toBe(true);

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
