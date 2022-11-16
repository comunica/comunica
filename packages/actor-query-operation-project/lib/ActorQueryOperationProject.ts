import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import { BlankNodeBindingsScoped } from '@comunica/data-factory';
import type {
  Bindings,
  BindingsStream,
  IActionContext,
  IQueryOperationResult,
  IQueryOperationResultBindings,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';

const DF = new DataFactory();

/**
 * A comunica Project Query Operation Actor.
 */
export class ActorQueryOperationProject extends ActorQueryOperationTypedMediated<Algebra.Project> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'project');
  }

  public async testOperation(operation: Algebra.Project, context: IActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(operation: Algebra.Project, context: IActionContext):
  Promise<IQueryOperationResult> {
    // Resolve the input
    const output: IQueryOperationResultBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: operation.input, context }),
    );

    // Find all variables that should be deleted from the input stream.
    const outputMetadata = await output.metadata();
    const variables = operation.variables;
    const deleteVariables = outputMetadata.variables
      .filter(variable => !variables.some(subVariable => variable.value === subVariable.value));

    // Error if there are variables that are not bound in the input stream.
    const missingVariables = variables
      .filter(variable => !outputMetadata.variables.some(subVariable => variable.value === subVariable.value));
    if (missingVariables.length > 0) {
      throw new Error(`Variables '${missingVariables.map(variable => `?${variable.value}`)}' are used in the projection result, but are not assigned.`);
    }

    // Make sure the project variables are the only variables that are present in the bindings.
    let bindingsStream: BindingsStream = deleteVariables.length === 0 ?
      output.bindingsStream :
      output.bindingsStream.transform({
        map(bindings: Bindings) {
          for (const deleteVariable of deleteVariables) {
            bindings = bindings.delete(deleteVariable);
          }
          return bindings;
        },
        autoStart: false,
      });

    // Make sure that blank nodes with same labels are not reused over different bindings, as required by SPARQL 1.1.
    // Required for the BNODE() function: https://www.w3.org/TR/sparql11-query/#func-bnode
    // When we have a scoped blank node, make sure the skolemized value is maintained.
    let blankNodeCounter = 0;
    bindingsStream = bindingsStream.transform({
      map(bindings: Bindings) {
        blankNodeCounter++;
        const scopedBlankNodesCache = new Map<string, RDF.BlankNode>();
        return bindings.map(term => {
          if (term instanceof BlankNodeBindingsScoped) {
            let scopedBlankNode = scopedBlankNodesCache.get(term.value);
            if (!scopedBlankNode) {
              scopedBlankNode = DF.blankNode(`${term.value}${blankNodeCounter}`);
              scopedBlankNodesCache.set(term.value, scopedBlankNode);
            }
            return scopedBlankNode;
          }
          return term;
        });
      },
      autoStart: false,
    });

    return {
      type: 'bindings',
      bindingsStream,
      metadata: async() => ({ ...outputMetadata, variables }),
    };
  }
}
