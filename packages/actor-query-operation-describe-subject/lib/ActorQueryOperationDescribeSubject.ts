import {ActorQueryOperationTypedMediated, IActorQueryOperationOutput,
  IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {IActorTest} from "@comunica/core";
import {triple, variable} from "rdf-data-model";
import * as RDF from "rdf-js";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Describe Subject Query Operation Actor.
 */
export class ActorQueryOperationDescribeSubject extends ActorQueryOperationTypedMediated<Algebra.Describe> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'describe');
  }

  public async testOperation(pattern: Algebra.Describe, context?: {[id: string]: any}): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Describe, context?: {[id: string]: any})
    : Promise<IActorQueryOperationOutput> {
    // Transform to a construct operation with S ?p ?o patterns for all terms
    const template: RDF.Quad[] = pattern.terms.map(
      (term: RDF.Term, i: number) => triple(term, variable('__predicate' + i), variable('__object' + i)));

    // Make a BGP pattern for the template
    template.forEach((templatePattern: any) => templatePattern.type = 'pattern');
    const templateOperation: Algebra.Bgp = { type: 'bgp', patterns: <Algebra.Pattern[]> template };

    // Delegate the BGP pattern (together with Describe's input operation) as a construct operation.
    const operation: Algebra.Operation = {
      input: { type: 'join', left: pattern.input, right: templateOperation },
      template,
      type: 'construct',
    };
    return this.mediatorQueryOperation.mediate({ operation, context });
  }

}
