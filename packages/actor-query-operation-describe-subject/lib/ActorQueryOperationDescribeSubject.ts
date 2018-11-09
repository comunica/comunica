import {ActorQueryOperationUnion} from "@comunica/actor-query-operation-union";
import {ActorQueryOperation, ActorQueryOperationTypedMediated,
  IActorQueryOperationOutputQuads, IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {ActionContext, IActorTest} from "@comunica/core";
import {triple, variable} from "@rdfjs/data-model";
import {RoundRobinUnionIterator} from "asynciterator-union";
import * as RDF from "rdf-js";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Describe Subject Query Operation Actor.
 */
export class ActorQueryOperationDescribeSubject extends ActorQueryOperationTypedMediated<Algebra.Describe> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'describe');
  }

  public async testOperation(pattern: Algebra.Describe, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Describe, context: ActionContext)
    : Promise<IActorQueryOperationOutputQuads> {
    // Create separate construct queries for all non-variable terms
    const operations: Algebra.Construct[] = pattern.terms
      .filter((term) => term.termType !== 'Variable')
      .map((term: RDF.Term) => {
        // Transform each term to a separate construct operation with S ?p ?o patterns (BGP) for all terms
        const patterns: RDF.BaseQuad[] = [
          triple<RDF.BaseQuad>(term, variable('__predicate'), variable('__object')),
        ];
        patterns.forEach((templatePattern: any) => templatePattern.type = 'pattern');
        const templateOperation: Algebra.Operation = { type: 'bgp', patterns: <Algebra.Pattern[]> patterns };

        // Create a construct query
        return <Algebra.Construct> {
          input: templateOperation,
          template: <Algebra.Pattern[]> patterns,
          type: 'construct',
        };
      });

    // If we have variables in the term list,
    // create one separate construct operation to determine these variables using the input pattern.
    if (operations.length !== pattern.terms.length) {
      let variablePatterns: Algebra.Pattern[] = [];
      pattern.terms
        .filter((term) => term.termType === 'Variable')
        .forEach((term: RDF.Term, i: number) => {
          // Transform each term to an S ?p ?o pattern in a non-conflicting way
          const patterns: RDF.BaseQuad[] = [
            triple<RDF.BaseQuad>(term, variable('__predicate' + i), variable('__object' + i)),
          ];
          patterns.forEach((templatePattern: any) => templatePattern.type = 'pattern');
          variablePatterns = variablePatterns.concat(<Algebra.Pattern[]> patterns);
        });

      // Add a single construct for the variables
      // This requires a join between the input pattern and our variable patterns that form a simple BGP
      operations.push({
        input: { type: 'join', left: pattern.input, right: { type: 'bgp', patterns: variablePatterns } },
        template: variablePatterns,
        type: 'construct',
      });
    }

    // Evaluate the construct queries
    const outputs: IActorQueryOperationOutputQuads[] = (await Promise.all(operations.map(
      (operation) => this.mediatorQueryOperation.mediate({ operation, context }))))
      .map(ActorQueryOperation.getSafeQuads);

    // Take the union of all quad streams
    const quadStream = new RoundRobinUnionIterator(outputs.map((output) => output.quadStream));

    // Take union of metadata
    const metadata: () => Promise<{[id: string]: any}> = () => Promise.all(outputs
        .map((output) => output.metadata)
        .filter((m) => !!m)
        .map((m) => m()))
      .then(ActorQueryOperationUnion.unionMetadata);

    return { type: 'quads', quadStream, metadata };
  }

}
