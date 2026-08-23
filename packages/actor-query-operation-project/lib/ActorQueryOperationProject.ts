import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type {
  Bindings,
  BindingsStream,
  ComunicaDataFactory,
  IActionContext,
  IQueryOperationResult,
  IQueryOperationResultBindings,
  MetadataVariable,
} from '@comunica/types';
import { Algebra, algebraUtils } from '@comunica/utils-algebra';
import { BlankNodeBindingsScoped } from '@comunica/utils-data-factory';
import { getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica Project Query Operation Actor.
 */
export class ActorQueryOperationProject extends ActorQueryOperationTypedMediated<Algebra.Project> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.Types.PROJECT);
  }

  /**
   * Determine if the given operation could produce {@link BlankNodeBindingsScoped} terms.
   * These are only created by the BNODE() function, so any operation that does not contain
   * a BNODE() (or a custom, named function that could delegate to it) can never emit them.
   * @param operation The operation to inspect.
   */
  public static canCreateScopedBlankNodes(operation: Algebra.Operation): boolean {
    let possible = false;
    algebraUtils.visitOperationSub(operation, {}, {
      [Algebra.Types.EXPRESSION]: {
        [Algebra.ExpressionTypes.OPERATOR]: { preVisitor: (expression) => {
          if (expression.operator === 'bnode') {
            possible = true;
            return { shortcut: true };
          }
          return {};
        } },
        // Custom functions are opaque, so we conservatively assume they may return a scoped blank node.
        [Algebra.ExpressionTypes.NAMED]: { preVisitor: () => {
          possible = true;
          return { shortcut: true };
        } },
      },
    });
    return possible;
  }

  public async testOperation(_operation: Algebra.Project, _context: IActionContext): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async runOperation(operation: Algebra.Project, context: IActionContext):
  Promise<IQueryOperationResult> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);

    // Resolve the input
    const output: IQueryOperationResultBindings = getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: operation.input, context }),
    );

    // Index variables
    const outputMetadata = await output.metadata();
    const variablesOutputIndexed: Record<string, MetadataVariable> = Object
      .fromEntries(outputMetadata.variables.map(entry => [ entry.variable.value, entry ]));
    const variablesOperation: MetadataVariable[] = operation.variables.map(v => ({ variable: v, canBeUndef: false }));
    const variablesOperationIndexed: Record<string, MetadataVariable> = Object
      .fromEntries(variablesOperation.map(entry => [ entry.variable.value, entry ]));

    // Find all variables that should be deleted from the input stream.
    const deleteVariables = outputMetadata.variables
      .filter(variable => !(variable.variable.value in variablesOperationIndexed));

    // Determine if variables can be undef
    const variablesOutput: MetadataVariable[] = variablesOperation.map(variable => ({
      variable: variable.variable,
      canBeUndef: !(variable.variable.value in variablesOutputIndexed) ||
        variablesOutputIndexed[variable.variable.value].canBeUndef,
    }));

    // Make sure the project variables are the only variables that are present in the bindings.
    let bindingsStream: BindingsStream = deleteVariables.length === 0 ?
      output.bindingsStream :
      output.bindingsStream.map((bindings: Bindings) => {
        for (const deleteVariable of deleteVariables) {
          bindings = bindings.delete(deleteVariable.variable);
        }
        return bindings;
      });

    // Make sure that blank nodes with same labels are not reused over different bindings, as required by SPARQL 1.1.
    // Required for the BNODE() function: https://www.w3.org/TR/sparql11-query/#func-bnode
    // When we have a scoped blank node, make sure the skolemized value is maintained.
    // Only scoped blank nodes need this rewrite, and those can only originate from BNODE()
    // (or a custom function), so the whole (allocation-heavy) stage is skipped
    // for the vast majority of queries, which can not produce them.
    if (ActorQueryOperationProject.canCreateScopedBlankNodes(operation.input)) {
      let blankNodeCounter = 0;
      bindingsStream = bindingsStream.map((bindings: Bindings) => {
        blankNodeCounter++;
        const scopedBlankNodesCache = new Map<string, RDF.BlankNode>();
        return bindings.map((term) => {
          if (term instanceof BlankNodeBindingsScoped) {
            let scopedBlankNode = scopedBlankNodesCache.get(term.value);
            if (!scopedBlankNode) {
              scopedBlankNode = dataFactory.blankNode(`${term.value}${blankNodeCounter}`);
              scopedBlankNodesCache.set(term.value, scopedBlankNode);
            }
            return scopedBlankNode;
          }
          return term;
        });
      });
    }

    return {
      type: 'bindings',
      bindingsStream,
      metadata: async() => ({ ...outputMetadata, variables: variablesOutput }),
    };
  }
}
