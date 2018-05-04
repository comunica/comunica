import {ActorQueryOperation, IActionQueryOperation, IActorQueryOperationOutput,
  IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {Actor, IActorTest, Mediator} from "@comunica/core";
import {Algebra, Factory} from "sparqlalgebrajs";

/**
 * A comunica Contextify Version Query Operation Actor.
 */
export class ActorQueryOperationContextifyVersion extends ActorQueryOperation
  implements IActorQueryOperationContextifyVersionArgs {

  protected static readonly FACTORY: Factory = new Factory();

  public readonly mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
    IActionQueryOperation, IActorTest, IActorQueryOperationOutput>;
  public readonly baseGraphUri: string;
  public readonly numericalVersions: boolean;

  constructor(args: IActorQueryOperationContextifyVersionArgs) {
    super(args);
  }

  /**
   * Unwrap a project operation, and do nothing if it's any other operation.
   * @param {Operation} operation Any kind of operation.
   * @return {Operation} An operation.
   */
  public static unwrapProject(operation: Algebra.Operation): Algebra.Operation {
    if (operation.type === 'project') {
      operation = operation.input;
    }
    return operation;
  }

  /**
   * Check if the given operation is a BGP operation with a single pattern.
   * @param {Operation} operation Any kind of operation.
   * @return {boolean} If the operation was a BGP operation with a single pattern.
   */
  public static isSingularBgp(operation: Algebra.Operation): boolean {
    return operation.type === 'bgp' && operation.patterns.length === 1;
  }

  /**
   * Convert a graph to a version string or a number.
   * @param baseGraphUri The base graph URI, can be falsy.
   * @param numericalVersions If the graph should be converted to a number.
   * @param {string} graph A graph URI string.
   * @return {any} A version string or number.
   */
  public static graphToStringOrNumber(baseGraphUri: string, numericalVersions: boolean, graph: string): any {
    if (baseGraphUri && graph.startsWith(baseGraphUri)) {
      graph = graph.substr(baseGraphUri.length);
    }
    if (numericalVersions) {
      return parseInt(graph, 10);
    } else {
      return graph;
    }
  }

  /**
   * Convert a graph to a version string or a number, based on the settings of this actor.
   * @param {string} graph A graph URI string.
   * @return {any} A version string or number.
   */
  public graphToStringOrNumber(graph: string): any {
    return ActorQueryOperationContextifyVersion.graphToStringOrNumber(this.baseGraphUri, this.numericalVersions, graph);
  }

  /**
   * Rewrite the given operation to an operation with a version context.
   * @param {IActionQueryOperation} action An operation action.
   * @return {IActionQueryOperation} A version operation action or null if no rewriting could be done.
   */
  public getContextifiedVersionOperation(action: IActionQueryOperation): IActionQueryOperation {
    let operation = null;
    const versionContext: any = {};
    let valid: boolean = false;
    if (action.operation.type === 'pattern' && action.operation.graph.termType !== 'DefaultGraph') {
      // Version materialization
      valid = true;

      // Create operation
      operation = ActorQueryOperationContextifyVersion.FACTORY.createPattern(
        action.operation.subject,
        action.operation.predicate,
        action.operation.object,
      );

      // Create version context
      const version = this.graphToStringOrNumber(action.operation.graph.value);
      versionContext.type = 'version-materialization';
      versionContext.version = version;
    } else if (action.operation.type === 'filter'
      && action.operation.expression.expressionType === 'existence'
      && action.operation.expression.not) {

      // Delta materialization
      const left = action.operation.input;
      const right = action.operation.expression.input;

      // Detect not-exists filter of the same pattern over two graphs
      if (ActorQueryOperationContextifyVersion.isSingularBgp(left)
        && ActorQueryOperationContextifyVersion.isSingularBgp(right)) {
        // Remove graph from patterns
        const patterns: Algebra.Pattern[] = [
          left.patterns[0],
          right.patterns[0],
        ].map((pattern) => ActorQueryOperationContextifyVersion.FACTORY.createPattern(
          pattern.subject, pattern.predicate, pattern.object));

        // Check if patterns are equal
        if (patterns[0].equals(patterns[1])) {
          valid = true;
          // Sort start and end graph lexicographically
          let [ versionStart, versionEnd ] = [
            left.patterns[0].graph.value,
            right.patterns[0].graph.value,
          ];
          const queryAdditions: boolean = versionStart > versionEnd;
          if (queryAdditions) {
            [ versionStart, versionEnd ] = [ versionEnd, versionStart ];
          }

          // Create operation
          operation = patterns[0];

          // Create version context
          versionContext.type = 'delta-materialization';
          versionContext.versionStart = this.graphToStringOrNumber(versionStart);
          versionContext.versionEnd = this.graphToStringOrNumber(versionEnd);
          versionContext.queryAdditions = queryAdditions;
        }
      }
    }

    if (!valid) {
      return null;
    }

    const context = Object.assign({ version: versionContext }, action.context);

    return { operation, context };
  }

  public async test(action: IActionQueryOperation): Promise<IActorTest> {
    if (action.context && !action.context.version) {
      if (this.getContextifiedVersionOperation(action)) {
        return true;
      }
    }
    throw new Error('Version contextification is not applicable for this context.');
  }

  public async run(action: IActionQueryOperation): Promise<IActorQueryOperationOutput> {
    return await this.mediatorQueryOperation.mediate(this.getContextifiedVersionOperation(action));
  }

}

export interface IActorQueryOperationContextifyVersionArgs extends IActorQueryOperationTypedMediatedArgs {
  baseGraphUri: string;
  numericalVersions: boolean;
}
