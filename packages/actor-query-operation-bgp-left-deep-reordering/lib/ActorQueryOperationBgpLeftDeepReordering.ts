import {
  ActorQueryOperation, ActorQueryOperationTypedMediated,
  IActorQueryOperationOutputBindings, IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import {Bindings} from "@comunica/bus-query-operation";
import {IActorTest} from "@comunica/core";
import {MultiTransformIterator} from "asynciterator";
import {PromiseProxyIterator} from "asynciterator-promiseproxy";
import * as RDF from "rdf-js";
import {termToString} from "rdf-string";
import {getTerms} from "rdf-terms";
import {Algebra, Factory} from "sparqlalgebrajs";

/**
 * A Bgp actor whose algorithm is based on the original TPF algorithm.
 */
export class ActorQueryOperationBgpLeftDeepReordering extends ActorQueryOperationTypedMediated<Algebra.Bgp> {

  private factory: Factory;

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'bgp');
    this.factory = new Factory();
  }

  /**
   * Finds connected subpatterns within the possibly disconnected graph pattern.
   * @param {Quad[]} patterns
   * @returns {Quad[][]} - Every list is a connected group of patterns.
   */
  public static findConnectedPatterns(patterns: Algebra.Pattern[]): IPatternCluster[] {

    // Initially consider all individual triple patterns as disconnected clusters
    let clusters: IPatternCluster[] = patterns.map((quad) => {
      return {
        quads:  [quad],
        variables: getTerms(quad).filter((term) => term.termType === 'BlankNode' || term.termType === 'Variable'),
      };
    });

    // Zero or single-triple patterns have exactly one cluster
    if (clusters.length <= 1) {
      return clusters;
    }

    let commonVar: RDF.Variable;
    // Continue clustering as long as different clusters have common variables
    do {
      // Find a variable that occurs in more than one subpattern
      const allVariables = Array.prototype.concat(...clusters.map((cluster) => cluster.variables));
      commonVar = allVariables.find((val, idx, arr) => {
        for (let i = idx + 1; i < arr.length; ++i) {
          if (arr[i].equals(val)) {
            return true;
          }
        }
        return false;
      });
      if (commonVar) {
        // Partition the subpatterns by whether they contain that common variable
        const match: IPatternCluster[] = [];
        const noMatch: IPatternCluster[] = [];
        clusters.forEach((cluster) => cluster.variables.findIndex((val) => val.equals(commonVar)) >= 0
          ? match.push(cluster)
          : noMatch.push(cluster));

        // Replace the subpatterns with a common variable by a subpattern that combines them
        clusters = noMatch;
        const trueCluster: IPatternCluster = { quads: [], variables: []};
        match.forEach((cluster) => {
          trueCluster.quads.push(...cluster.quads);
          trueCluster.variables.push(...cluster.variables.filter(
            (v) => trueCluster.variables.findIndex((val) => val.equals(v)) < 0));
        });
        clusters.push(trueCluster);
      }
    } while (commonVar);

    // The subpatterns consist of the triples of each cluster
    return clusters;
  }

  public static bindTerm(term: RDF.Term, bindings: Bindings): RDF.Term {
    if (term.termType !== 'BlankNode' && term.termType !== 'Variable') {
      return term;
    }
    const binding = bindings.get(termToString(term));
    return binding ? binding : term;
  }

  public bindPattern(pattern: Algebra.Pattern, bindings: Bindings): Algebra.Pattern {
    return this.factory.createPattern(
      ActorQueryOperationBgpLeftDeepReordering.bindTerm(pattern.subject, bindings),
      ActorQueryOperationBgpLeftDeepReordering.bindTerm(pattern.predicate, bindings),
      ActorQueryOperationBgpLeftDeepReordering.bindTerm(pattern.object, bindings),
      ActorQueryOperationBgpLeftDeepReordering.bindTerm(pattern.graph, bindings),
    );
  }

  public getBoundOperationIterator(op: Algebra.Operation, bindings: Bindings, context?: {[id: string]: any})
  : PromiseProxyIterator<Bindings> {
    const getStream = async () => {
      return ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({operation: op, context})).bindingsStream;
    };
    return new PromiseProxyIterator(
      async () => (await getStream()).map((subBindings: Bindings) => subBindings.merge(bindings)));
  }

  public async testOperation(pattern: Algebra.Bgp, context?: {[id: string]: any}): Promise<IActorTest> {
    if (pattern.patterns.length < 2) {
      throw new Error('Actor ' + this.name + ' can only operate on BGPs with at least two patterns.');
    }
    return true;
  }

  public async runOperation(pattern: Algebra.Bgp, context?: {[id: string]: any})
  : Promise<IActorQueryOperationOutputBindings> {
    const clusters = ActorQueryOperationBgpLeftDeepReordering.findConnectedPatterns(pattern.patterns);
    // find cluster with least unbound variables (with the least patterns in case of a tie)
    const clusterValues = clusters.map((cluster) => {
      const val = -(pattern.patterns.length * cluster.variables.length + cluster.quads.length);
      return { val, cluster };
    });

    clusterValues.sort((a, b) => {
      return a.val - b.val;
    });

    const subPattern = clusterValues.pop().cluster.quads;

    const best = {
      count: Infinity,
      index: -1 };

    const outputs = (await Promise.all(subPattern.map(
      (quad) => this.mediatorQueryOperation.mediate({ operation: quad, context }))))
      .map(ActorQueryOperation.getSafeBindings);
    const metadatas = await Promise.all(outputs.map((output) => output.metadata ? output.metadata() : <any> {}));

    for (let i = 0; i < subPattern.length; ++i) {
      const count = metadatas[i].totalItems;
      if (count < best.count) {
        if (best.index >= 0) {
          // prevent useless nextPage calls
          outputs[best.index].bindingsStream.close();
        }
        best.index = i;
        best.count = count;
      } else {
        outputs[i].bindingsStream.close();
      }
    }
    // can happen if there is not sufficient metadata
    if (best.index < 0) {
      best.index = 0;
      outputs[0] = ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({ operation: subPattern[0], context }));
    }

    subPattern.splice(best.index, 1);

    // create stream for the subPattern results
    let bindingsStream = outputs[best.index].bindingsStream;
    if (subPattern.length > 0) {
      bindingsStream = new MultiTransformIterator<Bindings, Bindings>(bindingsStream);
      (<MultiTransformIterator<Bindings, Bindings>> bindingsStream)._createTransformer = (bindings: Bindings) => {
        const bgp = this.factory.createBgp(subPattern.map((quad) => this.bindPattern(quad, bindings)));
        return this.getBoundOperationIterator(bgp, bindings, context);
      };
    }

    // join with the remaining patterns
    if (clusterValues.length > 0) {
      bindingsStream = new MultiTransformIterator<Bindings, Bindings>(bindingsStream);
      const patterns = Array.prototype.concat(...clusterValues.map((c) => c.cluster.quads));
      const bgp = this.factory.createBgp(patterns);
      (<MultiTransformIterator<Bindings, Bindings>> bindingsStream)._createTransformer = (bindings: Bindings) => {
        return this.getBoundOperationIterator(bgp, bindings, context);
      };
    }

    const variables = clusters
      .reduce((vars: RDF.Term[], cluster) => vars.concat(
        cluster.variables.filter((v) => vars.findIndex((val) => val.equals(v)) < 0)), [])
      .map((term) => termToString(term));

    return { type: 'bindings', bindingsStream, variables };
  }

}

export interface IPatternCluster {
  quads: Algebra.Pattern[];
  variables: RDF.Term[];
}
