import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionIteratorTransform, ITransformIteratorOutput } from '@comunica/bus-iterator-transform';
import { ActorIteratorTransform } from '@comunica/bus-iterator-transform';
import { ActionContext, Bus } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { MetadataBindings, MetadataQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { AsyncIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';

const DF = new DataFactory();
const BF = new BindingsFactory();

class DummyTransform extends ActorIteratorTransform<AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>, MetadataBindings | MetadataQuads> {
  public transformIterator<T extends AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>, M extends MetadataBindings | MetadataQuads>(
    action: IActionIteratorTransform<T, M>,
  ): ITransformIteratorOutput<T, M> {
    // Return unchanged
    return { stream: action.stream, streamMetadata: action.streamMetadata };
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
        operation: 'inner',
        stream: bindingsStream,
        streamMetadata: metadata,
        context: new ActionContext(),
      })).resolves.toBeTruthy();
    });
    it('should test false when run with operation it does not wrap', async() => {
      await expect(actor.test({
        operation: 'nop',
        stream: bindingsStream,
        streamMetadata: metadata,
        context: new ActionContext(),
      })).rejects.toThrow('Operation type not supported in configuration of actor');
    });
    it('should test true when wraps is undefined', async() => {
      const actorWrapsAll = new DummyTransform({ name: 'actor', bus });
      await expect(actorWrapsAll.test({
        operation: 'nop',
        stream: bindingsStream,
        streamMetadata: metadata,
        context: new ActionContext(),
      })).resolves.toBeTruthy();
    });
    it('should run transformIterator', () => {
      const context = new ActionContext();
      const spy = jest.spyOn(actor, 'transformIterator');
      actor.run(
        {
          operation: 'nop',
          stream: bindingsStream,
          streamMetadata: metadata,
          context,
        },
      );
      expect(spy).toHaveBeenCalledWith({
        operation: 'nop',
        stream: bindingsStream,
        streamMetadata: metadata,
        context,
        metadata: undefined,
      });
    });
  });
});
