import {AbstractFilterHash, IActorInitRdfDereferencePagedArgs} from "@comunica/actor-abstract-bindings-hash";
import {
    ActorQueryOperation, Bindings,
    IActorQueryOperationOutputBindings,
} from "@comunica/bus-query-operation";
import {ActionContext} from "@comunica/core";
import {PromiseProxyIterator} from "asynciterator-promiseproxy";
import * as RDF from "rdf-js";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Minus Query Operation Actor.
 */
export class ActorQueryOperationMinus extends AbstractFilterHash<Algebra.Minus> {

  constructor(args: IActorInitRdfDereferencePagedArgs) {
    super(args, 'minus');
  }

  public newHashFilter(hashAlgorithm: string, digestAlgorithm: string, commons: {[variableName: string]: boolean},
                       hashes: {[id: string]: boolean})
        : (bindings: Bindings) => boolean {
    return (bindings: Bindings) => {
      const hash: string = ActorQueryOperationMinus.hash(hashAlgorithm, digestAlgorithm,
          <Bindings> bindings.filter((v: RDF.Term, k: string) => commons[k]));
      return !(hash in hashes);
    };
  }

  public async runOperation(pattern: Algebra.Minus, context: ActionContext)
        : Promise<IActorQueryOperationOutputBindings> {
    const buffer = ActorQueryOperation.getSafeBindings(
            await this.mediatorQueryOperation.mediate({ operation: pattern.right, context }));
    const output = ActorQueryOperation.getSafeBindings(
            await this.mediatorQueryOperation.mediate({ operation: pattern.left, context }));

    const commons: {[variableName: string]: boolean} = this.getCommonVariables(buffer.variables, output.variables);
    if (Object.keys(commons).length !== 0) {
      const hashes: {[id: string]: boolean} = {};
      /**
       * To assure we've filtered all B (`buffer`) values from A (`output`) we wait until we've fetched all values of B.
       * Then we save these triples in a hashmap `hashes` and use the map to filter our A-stream.
       */
      const bindingsStream = new PromiseProxyIterator(async () => {
        await new Promise((resolve) => {
          buffer.bindingsStream.on('data', (data) => {
            const hash = ActorQueryOperationMinus.hash(this.hashAlgorithm, this.digestAlgorithm,
                    data.filter((v: RDF.Term, k: string) => commons[k]));
            hashes[hash] = true;
          });
          buffer.bindingsStream.on('end', () => {
            resolve();
          });
        });
        return output.bindingsStream.filter(
                this.newHashFilter(this.hashAlgorithm, this.digestAlgorithm, commons, hashes));
      });
      return { type: 'bindings', bindingsStream, variables: output.variables, metadata: output.metadata};
    } else {
      return output;
    }
  }

  /**
   * This function puts all common values between 2 arrays in a map with `value` : true
   */
  private getCommonVariables(array1: string[], array2: string[]): {[variableName: string]: boolean } {
    return array1.filter(
        (n: string) => -1 !== array2.indexOf(n))
        .reduce((m: {[variableName: string]: boolean}, key: string) => {m[key] = true; return m; }, {});
  }
}
