import {AbstractMediatypeUtilities} from "@comunica/actor-abstract-mediatype-utilities";
import {KEY_CONTEXT_TREE_FILTER} from "@comunica/actor-query-operation-filter-tree";
import {ActorQueryOperation, ActorQueryOperationTypedMediated, Bindings,
  IActorQueryOperationOutputBindings, IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {DataSources, IDataSource,
  KEY_CONTEXT_SOURCE, KEY_CONTEXT_SOURCES} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, IActorTest} from "@comunica/core";
import {Algebra} from "sparqlalgebrajs";
import {SparqlExpressionEvaluator} from "./SparqlExpressionEvaluator";

/**
 * A comunica Filter Direct Query Operation Actor.
 */
export class ActorQueryOperationFilterDirect extends ActorQueryOperationTypedMediated<Algebra.Filter> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'filter');
  }

  public async testOperation(pattern: Algebra.Filter, context: ActionContext): Promise<IActorTest> {
    // will throw error for unsupported operators
    SparqlExpressionEvaluator.createEvaluator(pattern.expression);

    // Check if the source is a hypermedia tree, because this filter can't handle that
    const isTree: boolean = await AbstractMediatypeUtilities.singleSourceHasFlag(context, "isTree", true);

    // If the type of the source is a tree we are only able to go on when the filter is already pushed
    // to the context
    if (isTree && !context.has(KEY_CONTEXT_TREE_FILTER)) {
      throw new Error(this.name
        + ` if type of the source is \'hypermedia-tree\',
        the \'$(KEY_CONTEXT_TREE_FILTER)\' context variable should be set first.`);
    }

    return true;
  }

  public async runOperation(pattern: Algebra.Filter, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {

    const output: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pattern.input, context }));
    ActorQueryOperation.validateQueryOutput(output, 'bindings');

    const exprFunc = SparqlExpressionEvaluator.createEvaluator(pattern.expression);
    const filter = (bindings: Bindings) => {
      try {
        const term = exprFunc(bindings);
        return term && term.value !== 'false' && term.value !== '0';
      } catch (e) {
        bindingsStream.emit('error', e);
        return false;
      }
    };

    const bindingsStream = output.bindingsStream.filter(filter);

    return { type: 'bindings', bindingsStream, metadata: output.metadata, variables: output.variables };
  }
}
