import {Actor, IAction, IActorArgs, IActorOutput, IActorTest} from "@comunica/core";
import {IMediatorTypePriority} from "@comunica/mediatortype-priority";

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

  public readonly priority: number;

  constructor(args: IActorRdfSourceIdentifierArgs) {
    super(args);
  }

  public abstract async test(action: IActionRdfSourceIdentifier): Promise<IMediatorTypePriority>;

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
  /**
   * Flags about the source
   */
  flags?: {[id: string]: any};
}

export interface IActorRdfSourceIdentifierArgs
  extends IActorArgs<IActionRdfSourceIdentifier, IActorTest, IActorRdfSourceIdentifierOutput> {
  priority: number;
}
