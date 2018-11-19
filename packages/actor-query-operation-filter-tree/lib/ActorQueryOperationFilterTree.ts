import {AbstractMediatypeUtilities} from "@comunica/actor-abstract-mediatype-utilities";
import {ActorQueryOperation, ActorQueryOperationTypedMediated,
  IActorQueryOperationOutputBindings, IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {KEY_CONTEXT_SOURCE, KEY_CONTEXT_SOURCES} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, IActorTest} from "@comunica/core";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Filter Tree Query Operation Actor.
 */
export class ActorQueryOperationFilterTree extends ActorQueryOperationTypedMediated<Algebra.Filter> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'filter');
  }

  public async testOperation(pattern: Algebra.Filter, context: ActionContext): Promise<IActorTest> {
    // Check if the source is a hypermedia tree, because this filter can't handle that
    const sourceIsTree: boolean = await AbstractMediatypeUtilities.singleSourceHasFlag(context, "isTree", true);
    const sourceType: boolean = await AbstractMediatypeUtilities.singleSourceHasType(context, "hypermedia");

    if (!sourceIsTree || !sourceType) {
      throw new Error(this.name + ' type of the source must be \'hypermedia\' and should be a tree.');
    }
    if (context.has(KEY_CONTEXT_TREE_FILTER)) {
      throw new Error(this.name + ' already a filter in the context.');
    }

    return true;
  }

  public async runOperation(pattern: Algebra.Filter, context: ActionContext)
  : Promise<IActorQueryOperationOutputBindings> {

    // Push filter on the context
    context = context.set(KEY_CONTEXT_TREE_FILTER, pattern.expression);

    // Mediate further
    const output: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pattern, context }));
    ActorQueryOperation.validateQueryOutput(output, 'bindings');

    return output;
  }
}

/**
 * @type {string} Context entry for tree ontology filter
 * @value {Algebra.Filter}
 */
export const KEY_CONTEXT_TREE_FILTER: string = '@comunica/actor-query-operation-filter-tree:filter';
