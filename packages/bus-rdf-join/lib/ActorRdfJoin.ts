
import {Bindings, BindingsStream} from "@comunica/bus-query-operation";
import {Actor, IAction, IActorArgs, IActorOutput} from "@comunica/core";
import {IMediatorTypeIterations} from "@comunica/mediatortype-iterations";
import * as RDF from "rdf-js";

/**
 * A comunica actor for joining 2 binding streams.
 *
 * Actor types:
 * * Input:  IActionRdfJoin:      The streams that need to be joined.
 * * Test:   <none>
 * * Output: IActorRdfJoinOutput: The resulting joined stream.
 *
 * @see IActionRdfJoin
 * @see IActorRdfJoinOutput
 */
export abstract class ActorRdfJoin extends Actor<IActionRdfJoin, IMediatorTypeIterations, IActorRdfJoinOutput> {

  constructor(args: IActorArgs<IActionRdfJoin, IMediatorTypeIterations, IActorRdfJoinOutput>) {
    super(args);
  }

  /**
   * Returns an array containing all the variable names that occur in both binding streams.
   * @param {IActionRdfJoin} action
   * @returns {string[]}
   */
  protected static overlappingVariables(action: IActionRdfJoin): string[] {
    return action.leftVariables.filter((v) => action.rightVariables.indexOf(v) >= 0);
  }

  /**
   * Returns the variables that will occur in the joined bindings.
   * @param {IActionRdfJoin} action
   * @returns {string[]}
   */
  protected static joinVariables(action: IActionRdfJoin): string[] {
    return action.leftVariables.concat(action.rightVariables.filter((v) => action.leftVariables.indexOf(v) < 0));
  }

  /**
   * Returns the result of joining two bindings, or `null` if no join is possible.
   * @param {Bindings} left
   * @param {Bindings} right
   * @returns {Bindings}
   */
  protected static join(left: Bindings, right: Bindings): Bindings {
    let result = left;
    const incompatible = right.some((rightV: RDF.Term, key: string) => {
      const leftV = left.get(key);
      if (leftV) {
        return leftV.value !== rightV.value; // want to return true if there is no match
      } else {
        // not nice to change values in a `some` loop, but might be more efficient
        result = result.set(key, rightV);
      }
      return false;
    });
    if (incompatible) {
      return null;
    }
    return result;
  }

  /**
   * Checks if both metadata objects are present in the action, and if they have the specified key.
   * @param {IActionRdfJoin} action
   * @param {string} key
   * @returns {boolean}
   */
  protected static iteratorsHaveMetadata(action: IActionRdfJoin, key: string): boolean {
    if (!action.leftMetadata || !action.leftMetadata.hasOwnProperty(key)) {
      return false;
    }
    if (!action.rightMetadata || !action.rightMetadata.hasOwnProperty(key)) {
      return false;
    }
    return true;
  }

  /**
   * Default test function for join actors.
   * Checks whether both iterators have metadata.
   * If yes: call the abstract getIterations method, if not: return Infinity.
   * @param {IActionRdfJoin} action The input action containing the relevant iterators
   * @returns {Promise<IMediatorTypeIterations>} The calculated estime.
   */
  public async test(action: IActionRdfJoin): Promise<IMediatorTypeIterations> {
    if (!ActorRdfJoin.iteratorsHaveMetadata(action, 'totalItems')) {
      return { iterations: Infinity };
    }
    return { iterations: this.getIterations(action) };
  }

  /**
   * Used when calculating the number of iterations in the test function.
   * Both metadata objects are guaranteed to have a value for the `totalItems` key.
   * @param {IActionRdfJoin} action
   * @returns {number} The estimated number of iterations when joining the given iterators.
   */
  protected abstract getIterations(action: IActionRdfJoin): number;

}

export interface IActionRdfJoin extends IAction {
  /**
   * The left input stream.
   */
  left: BindingsStream;

  /**
   * Metadata about the left input stream, such as the estimated number of bindings.
   */
  leftMetadata?: {[id: string]: any};

  /**
   * The list of variable names (without '?') for which bindings are provided in the left stream.
   */
  leftVariables: string[];

  /**
   * The right input stream.
   */
  right: BindingsStream;

  /**
   * Metadata about the left input stream, such as the estimated number of bindings.
   */
  rightMetadata?: {[id: string]: any};

  /**
   * The list of variable names (without '?') for which bindings are provided in the right stream.
   */
  rightVariables: string[];
}

export interface IActorRdfJoinOutput extends IActorOutput {
  /**
   * The resulting stream joining the results of the two input streams.
   */
  bindingsStream: BindingsStream;

  /**
   * Metadata about the output stream, such as the estimated number of bindings.
   */
  metadata?: {[id: string]: any};

  /**
   * The list of variable names (without '?') for which bindings are provided in this stream.
   */
  variables: string[];
}
