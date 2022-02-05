import type { IActorTest } from '@comunica/core';
import type * as RDF from '@rdfjs/types';

/**
 * A mediator type that has an iterations parameter.
 */
export interface IMediatorTypeJoinCoefficients extends IActorTest, RDF.QueryOperationCost {}
