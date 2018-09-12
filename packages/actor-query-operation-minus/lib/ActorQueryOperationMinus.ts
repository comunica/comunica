import {AbstractBindingHash} from "@comunica/actor-abstract-bindings-hash";
import {IActorInitRdfDereferencePagedArgs} from "@comunica/actor-query-operation-distinct-hash";
import {
    ActorQueryOperation, Bindings, BindingsStream,
    IActorQueryOperationOutputBindings,
} from "@comunica/bus-query-operation";
import {ActionContext} from "@comunica/core";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Minus Query Operation Actor.
 */
export class ActorQueryOperationMinus extends AbstractBindingHash<Algebra.Minus> {

  private hashes: {[id: string]: boolean} = {};

  constructor(args: IActorInitRdfDereferencePagedArgs) {
    super(args, 'minus');
  }

  public newHashFilter(hashAlgorithm: string, digestAlgorithm: string)
        : (bindings: Bindings) => boolean {
    return (bindings: Bindings) => {
      const hash: string = ActorQueryOperationMinus.hash(hashAlgorithm, digestAlgorithm, bindings);
      return !(hash in this.hashes);
    };
  }

  public async runOperation(pattern: Algebra.Minus, context: ActionContext)
      : Promise<IActorQueryOperationOutputBindings> {

    const buffer = ActorQueryOperation.getSafeBindings(
          await this.mediatorQueryOperation.mediate({ operation: pattern.right, context }));
    const output = ActorQueryOperation.getSafeBindings(
          await this.mediatorQueryOperation.mediate({ operation: pattern.left, context }));

    if (this.haveCommonVariables(buffer.variables, output.variables)) {
      let bindingsStream: BindingsStream = null;
      const prom = new Promise((resolve) => {
        bindingsStream = buffer.bindingsStream;
        bindingsStream.on('data', (data) => {
          const hash = ActorQueryOperationMinus.hash(this.hashAlgorithm, this.digestAlgorithm, data);
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

  private haveCommonVariables(array1: string[], array2: string[]): boolean {
    for (const element of array1) {
      if (array2.indexOf(element) > -1) {
        return true;
      }
    }
    return false;
  }
}
