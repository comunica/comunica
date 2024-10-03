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
import { BlankNodeBindingsScoped } from '@comunica/utils-data-factory';
import { getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Project Query Operation Actor.
 */
export class ActorQueryOperationProject extends ActorQueryOperationTypedMediated<Algebra.Project> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'project');
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

    return {
      type: 'bindings',
      bindingsStream,
      metadata: async() => ({ ...outputMetadata, variables: variablesOutput }),
    };
  }
}
