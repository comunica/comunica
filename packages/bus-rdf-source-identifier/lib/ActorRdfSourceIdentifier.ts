import {Actor, IAction, IActorArgs, IActorOutput, IActorTest} from "@comunica/core";

/**
 * A comunica actor for rdf-source-identifier events.
 *
 * Actor types:
 * * Input:  IActionRdfSourceIdentifier:      The source value to discover the type of.
 * * Test:   <none>
 * * Output: IActorRdfSourceIdentifierOutput: The identified source type.
 *
 * @see IActionRdfSourceIdentifier
 * @see IActorRdfSourceIdentifierOutput
 */
export abstract class ActorRdfSourceIdentifier
  extends Actor<IActionRdfSourceIdentifier, IActorTest, IActorRdfSourceIdentifierOutput> {

  constructor(args: IActorArgs<IActionRdfSourceIdentifier, IActorTest, IActorRdfSourceIdentifierOutput>) {
    super(args);
  }

}

export interface IActionRdfSourceIdentifier extends IAction {
  /**
   * The provided source value in the context.
   */
  sourceValue: string;
}

export interface IActorRdfSourceIdentifierOutput extends IActorOutput {
  /**
   * The identified source type.
   */
  sourceType: string;
}
