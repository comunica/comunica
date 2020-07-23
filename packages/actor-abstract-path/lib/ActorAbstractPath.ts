import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
  IActorQueryOperationTypedMediatedArgs,
} from '@comunica/bus-query-operation';
import { ActionContext, IActorTest } from '@comunica/core';
import { blankNode } from '@rdfjs/data-model';
import { AsyncIterator, BufferedIterator } from 'asynciterator';
import { BlankNode, Term } from 'rdf-js';
import { termToString } from 'rdf-string';
import { Algebra, Factory } from 'sparqlalgebrajs';

/**
 * An abstract actor that handles Path operations.
 *
 * Provides multiple helper functions used by the Path operation actors.
 */
export abstract class ActorAbstractPath extends ActorQueryOperationTypedMediated<Algebra.Path> {
  protected static readonly FACTORY: Factory = new Factory();

  protected readonly predicateType: string;

  protected constructor(args: IActorQueryOperationTypedMediatedArgs, predicateType: string) {
    super(args, 'path');
    this.predicateType = predicateType;
  }

  public async testOperation(pattern: Algebra.Path, context: ActionContext): Promise<IActorTest> {
    if (pattern.predicate.type !== this.predicateType) {
      throw new Error(`This Actor only supports ${this.predicateType} Path operations.`);
    }

    return true;
  }

  // Generates a blank node that does not yet occur in the path
  public generateBlankNode(path?: Algebra.Path, name?: string): BlankNode {
    if (!name) {
      return this.generateBlankNode(path, 'b');
    }

    // Path predicates can't contain variables/blank nodes
    if (path && (path.subject.value === name || path.object.value === name)) {
      return this.generateBlankNode(path, `${name}b`);
    }

    return blankNode(name);
  }

  // Based on definition in spec https://www.w3.org/TR/sparql11-query/
  // returns all nodes visited by infinitely repeating the given predicate, starting from x
  public async ALPeval(x: Term, predicate: Algebra.PropertyPathSymbol, context: ActionContext):
  Promise<AsyncIterator<Term>> {
    const it = new BufferedIterator<Term>();
    await this.ALP(x, predicate, context, {}, it, { count: 0 });

    return it;
  }

  public async ALP(x: Term, predicate: Algebra.PropertyPathSymbol, context: ActionContext,
    termHashes: {[id: string]: Term}, it: BufferedIterator<Term>, counter: any): Promise<void> {
    const termString = termToString(x);
    if (termHashes[termString]) {
      return;
    }

    (<any> it)._push(x);
    termHashes[termString] = x;

    const thisBlankNode = this.generateBlankNode();
    const bString = termToString(thisBlankNode);
    const path = ActorAbstractPath.FACTORY.createPath(x, predicate, thisBlankNode);
    const results = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: path, context }),
    );
    counter.count++;
    results.bindingsStream.on('data', async bindings => {
      const result = bindings.get(bString);
      await this.ALP(result, predicate, context, termHashes, it, counter);
    });
    results.bindingsStream.on('end', () => {
      if (--counter.count === 0) {
        it.close();
      }
    });
  }
}
