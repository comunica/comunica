import {AbstractBindingHash, IActorInitRdfDereferencePagedArgs} from "@comunica/actor-abstract-bindings-hash";
import {
    ActorQueryOperation, Bindings, BindingsStream,
    IActorQueryOperationOutputBindings,
} from "@comunica/bus-query-operation";
import {ActionContext} from "@comunica/core";
import * as RDF from "rdf-js";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Minus Query Operation Actor.
 */
export class ActorQueryOperationMinus extends AbstractBindingHash<Algebra.Minus> {

  private hashes: {[id: string]: boolean} = {};
  private commons: string[];

  constructor(args: IActorInitRdfDereferencePagedArgs) {
    super(args, 'minus');
  }

  public newHashFilter(hashAlgorithm: string, digestAlgorithm: string)
        : (bindings: Bindings) => boolean {
    return (bindings: Bindings) => {
      const hash: string = ActorQueryOperationMinus.hash(hashAlgorithm, digestAlgorithm,
          bindings.filter((v: RDF.Term, k: string) => -1 !== this.commons.indexOf(k)));

      return !(hash in this.hashes);
    };
  }

  public async runOperation(pattern: Algebra.Minus, context: ActionContext)
      : Promise<IActorQueryOperationOutputBindings> {

    const buffer = ActorQueryOperation.getSafeBindings(
          await this.mediatorQueryOperation.mediate({ operation: pattern.right, context }));
    const output = ActorQueryOperation.getSafeBindings(
          await this.mediatorQueryOperation.mediate({ operation: pattern.left, context }));

    this.commons = buffer.variables.filter((n: string) => -1 !== output.variables.indexOf(n));
    if (this.commons.length > 0) {
      let bindingsStream: BindingsStream = null;
      const prom = new Promise((resolve) => {
        bindingsStream = buffer.bindingsStream;
        bindingsStream.on('data', (data) => {
          const hash = ActorQueryOperationMinus.hash(this.hashAlgorithm, this.digestAlgorithm,
              data.filter((v: RDF.Term, k: string) => -1 !== this.commons.indexOf(k)));
          this.hashes[hash] = true;
        });
        bindingsStream.on('end', () => {
          resolve();
        });
      });
      await prom;

      bindingsStream = output.bindingsStream.filter(
              this.newHashFilter(this.hashAlgorithm, this.digestAlgorithm));
      return { type: 'bindings', bindingsStream, variables: output.variables, metadata: output.metadata};
    } else {
      return output;
    }

  }
}
