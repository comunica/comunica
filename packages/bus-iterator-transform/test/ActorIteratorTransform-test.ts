import { BindingsFactory } from '@comunica/bindings-factory';
import type {
  IActionIteratorTransformBindings,
  IActionIteratorTransformQuads,
  ITransformIteratorOutput }
  from '@comunica/bus-iterator-transform';
import { ActorIteratorTransform } from '@comunica/bus-iterator-transform';
import { ActionContext, Bus } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { MetadataBindings, MetadataQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { AsyncIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { types } from 'sparqlalgebrajs/lib/algebra';

const DF = new DataFactory();
const BF = new BindingsFactory();

class DummyTransform extends ActorIteratorTransform {
  public transformCalls = 0;

  public async transformIteratorBindings(
    action: IActionIteratorTransformBindings,
  ): Promise<ITransformIteratorOutput<AsyncIterator<RDF.Bindings>, MetadataBindings>> {
    // Return unchanged
    const transformedStream = action.stream.map((data: RDF.Bindings) => {
      this.transformCalls++;
      return data;
    });
    return { stream: transformedStream, metadata: action.metadata };
  }

  public async transformIteratorQuads(
    action: IActionIteratorTransformQuads,
  ): Promise<ITransformIteratorOutput<AsyncIterator<RDF.Quad>, MetadataQuads>> {
    // Return unchanged
    const transformedStream = action.stream.map((data: RDF.Quad) => {
      this.transformCalls++;
      return data;
    });
    return { stream: transformedStream, metadata: action.metadata };
  }
}

describe('ActorIteratorTransform', () => {
  describe('An ActorIteratorTransform instance', () => {
    let actor: DummyTransform;
    let bus: any;
    let metadata: () => Promise<MetadataBindings>;
    let bindingsStream: AsyncIterator<RDF.Bindings>;

    beforeEach(() => {
      bus = new Bus({ name: 'bus' });
      actor = new DummyTransform({ name: 'actor', bus, wraps: [ 'inner' ]});
      metadata = async() => {
        return {
          canContainUndefs: true,
          variables: [ DF.variable('v0') ],
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 0 },
        };
      };
      bindingsStream = new AsyncIterator();
    });

    it('should test true when run with operation it wraps', async() => {
      await expect(actor.test({
        type: 'bindings',
        operation: 'inner',
        stream: bindingsStream,
        metadata,
        context: new ActionContext(),
        originalAction: { context: new ActionContext() },
      })).resolves.toBeTruthy();
    });

    it('should test false when run with operation it does not wrap', async() => {
      await expect(actor.test({
        type: 'bindings',
        operation: types.NOP,
        stream: bindingsStream,
        metadata,
        context: new ActionContext(),
        originalAction: { context: new ActionContext() },
      })).rejects.toThrow('Operation type not supported in configuration of actor');
    });

    it('should test true when wraps is undefined', async() => {
      const actorWrapsAll = new DummyTransform({ name: 'actor', bus });
      await expect(actorWrapsAll.test({
        type: 'bindings',
        operation: types.NOP,
        stream: bindingsStream,
        metadata,
        context: new ActionContext(),
        originalAction: { context: new ActionContext() },
      })).resolves.toBeTruthy();
    });

    it('should run transformIterator', async() => {
      const context = new ActionContext();
      const spy = jest.spyOn(actor, 'transformIteratorBindings');
      await actor.run(
        {
          type: 'bindings',
          operation: types.NOP,
          stream: bindingsStream,
          metadata,
          context: new ActionContext(),
          originalAction: { context: new ActionContext() },
        },
      );
      expect(spy).toHaveBeenCalledWith({
        type: 'bindings',
        operation: types.NOP,
        stream: bindingsStream,
        metadata,
        context: new ActionContext(),
        originalAction: { context: new ActionContext() },
      });
    });
  });
});
