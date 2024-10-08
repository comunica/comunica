import type {
  IActionIteratorTransform,
  IActionIteratorTransformBindings,
  IActionIteratorTransformQuad,
  IActorIteratorTransformBindingsOutput,
  IActorIteratorTransformQuadOutput,
  ITransformIteratorOutput }
  from '@comunica/bus-iterator-transform';
import { ActorIteratorTransform } from '@comunica/bus-iterator-transform';
import { KeysStatistics } from '@comunica/context-entries';
import type { StatisticIntermediateResults } from '@comunica/statistic-intermediate-results';
import type { MetadataBindings, MetadataQuads } from '@comunica/types';
import * as RDF from '@rdfjs/types';
import { AsyncIterator } from 'asynciterator';

/**
 * A comunica Record Intermediate Results Iterator Transform Actor.
 * This actor simply updates the intermediate result statistic when an intermediate result is produced.
 */
export class ActorIteratorTransformRecordIntermediateResults
  extends ActorIteratorTransform<
    AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>,
    MetadataBindings | MetadataQuads
> {

  public async transformIterator(action: IActionIteratorTransformQuad): 
    Promise<ITransformIteratorOutput<AsyncIterator<RDF.Quad>, MetadataQuads>>;

  public async transformIterator(action: IActionIteratorTransformBindings):
    Promise<ITransformIteratorOutput<AsyncIterator<RDF.Bindings>, MetadataBindings>> ;
    
  public async transformIterator(action: IActionIteratorTransformBindings | IActionIteratorTransformQuad):
    Promise<ITransformIteratorOutput<AsyncIterator<RDF.Bindings>, MetadataBindings> 
    | ITransformIteratorOutput<AsyncIterator<RDF.Quad>, MetadataQuads>>
  {
    const statisticIntermediateResults: StatisticIntermediateResults = action.context
    .getSafe(KeysStatistics.intermediateResults);
    // TODO SEPERATE THE TWO CASES BY TYPE
    const output = <AsyncIterator<RDF.Bindings>> action.stream.map((data) => {
        statisticIntermediateResults.updateStatistic(
          { 
            type: <'bindings'> action.type, 
            data: <RDF.Bindings> data, 
            metadata: { 
              operation: action.operation,
              ...action.metadata 
            }},
        );
        return data;  
      })
    return {stream: output, metadata: <() => Promise<MetadataBindings>> action.metadata}
  }
}
