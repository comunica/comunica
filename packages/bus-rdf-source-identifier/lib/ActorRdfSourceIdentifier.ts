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

  protected getSourceUrl(action: IActionRdfSourceIdentifier): string {
    if (!action.sourceValue.startsWith('http')) {
      throw new Error(`Actor ${this.name} can only detect sources hosted via HTTP(S).`);
    }
    return action.sourceValue.replace(/#.*/, '');
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

export interface IActorRdfSourceIdentifierArgs
  extends IActorArgs<IActionRdfSourceIdentifier, IActorTest, IActorRdfSourceIdentifierOutput> {
  priority: number;
}
