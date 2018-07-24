import {ActorAbstractMediaTyped, IActionAbstractMediaTyped, IActorArgsMediaTyped,
  IActorOutputAbstractMediaTyped, IActorTestAbstractMediaTyped} from "@comunica/actor-abstract-mediatyped";
import {IActorQueryOperationOutput} from "@comunica/bus-query-operation";
import {IAction, IActorOutput, IActorTest} from "@comunica/core";

/**
 * A comunica actor for sparql-serialize events.
 *
 * Actor types:
 * * Input:  IActionSparqlSerialize:      SPARQL bindings or a quad stream.
 * * Test:   <none>
 * * Output: IActorSparqlSerializeOutput: A text stream.
 *
 * @see IActionSparqlSerialize
 * @see IActorSparqlSerializeOutput
 */
export abstract class ActorSparqlSerialize
  extends ActorAbstractMediaTyped<IActionSparqlSerialize, IActorTest, IActorSparqlSerializeOutput> {

  constructor(args: IActorArgsMediaTyped<IActionSparqlSerialize, IActorTest, IActorSparqlSerializeOutput>) {
    super(args);
  }

}

export type IActionRootSparqlParse = IActionAbstractMediaTyped<IActionSparqlSerialize>;
export type IActorTestRootSparqlParse = IActorTestAbstractMediaTyped<IActorTest>;
export type IActorOutputRootSparqlParse = IActorOutputAbstractMediaTyped<IActorSparqlSerializeOutput>;

export interface IActionSparqlSerialize extends IAction, IActorQueryOperationOutput {
}

export interface IActorSparqlSerializeOutput extends IActorOutput {
  /**
   * A readable string stream in a certain SPARQL serialization that was serialized.
   */
  data: NodeJS.ReadableStream;
}
