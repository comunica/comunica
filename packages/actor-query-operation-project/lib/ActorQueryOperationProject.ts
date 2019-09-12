import {ActorQueryOperation, ActorQueryOperationTypedMediated, Bindings, IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {ActionContext, IActorTest} from "@comunica/core";
import {blankNode} from "@rdfjs/data-model";
import {termToString} from "rdf-string";
import {Algebra} from "sparqlalgebrajs";
import {BindingsStream} from "../../bus-query-operation/lib/Bindings";

/**
 * A comunica Project Query Operation Actor.
 */
export class ActorQueryOperationProject extends ActorQueryOperationTypedMediated<Algebra.Project> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'project');
  }

  public async testOperation(pattern: Algebra.Project, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Project, context: ActionContext)
  : Promise<IActorQueryOperationOutputBindings> {
    // Resolve the input
    const output: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pattern.input, context }));

    // Find all variables that should be deleted from the input stream
    // and all variables that are not bound in the input stream.
    const variables: string[] = pattern.variables.map(termToString);
    const deleteVariables = output.variables.filter((variable) => variables.indexOf(variable) < 0);
    const missingVariables = variables.filter((variable) => output.variables.indexOf(variable) < 0);

    // Make sure the project variables are the only variables that are present in the bindings.
    let bindingsStream: BindingsStream = !deleteVariables.length && !missingVariables.length
      ? output.bindingsStream : output.bindingsStream.map(
        (binding: Bindings) => {
          for (const deleteVariable of deleteVariables) {
            binding = binding.delete(deleteVariable);
          }
          for (const missingVariable of missingVariables) {
            binding = binding.set(missingVariable, null);
          }
          return binding;
        });

    // Make sure that blank nodes with same labels are not reused over different bindings, as required by SPARQL 1.1.
    // Required for the BNODE() function: https://www.w3.org/TR/sparql11-query/#func-bnode
    let blankNodeCounter: number = 0;
    bindingsStream = bindingsStream.map((bindings: Bindings) => {
      blankNodeCounter++;
      return <Bindings> bindings.map((term) => {
        if (term && term.termType === 'BlankNode') {
          return blankNode(term.value + blankNodeCounter);
        }
        return term;
      });
    });

    return { type: 'bindings', bindingsStream, metadata: output.metadata, variables };
  }

}
