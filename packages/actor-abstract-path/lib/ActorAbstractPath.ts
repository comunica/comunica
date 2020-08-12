import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
  IActorQueryOperationTypedMediatedArgs,
  IActorQueryOperationOutputBindings,
  Bindings,
} from '@comunica/bus-query-operation';
import { ActionContext, IActorTest } from '@comunica/core';
import { variable } from '@rdfjs/data-model';
import { AsyncIterator, BufferedIterator } from 'asynciterator';
import { Term, Variable } from 'rdf-js';
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

  public static isPathArbitraryLengthDistinctKey = 'isPathArbitraryLengthDistinct';

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

  // Generates a variable that does not yet occur in the path
  public generateVariable(path?: Algebra.Path, name?: string): Variable {
    if (!name) {
      return this.generateVariable(path, 'b');
    }

    // Path predicates can't contain variables
    if (path && (path.subject.value === name || path.object.value === name)) {
      return this.generateVariable(path, `${name}b`);
    }

    return variable(name);
  }

  // Such connectivity matching does not introduce duplicates (it does not incorporate any count of the number
  // of ways the connection can be made) even if the repeated path itself would otherwise result in duplicates.
  // https://www.w3.org/TR/sparql11-query/#propertypaths
  public async isPathArbitraryLengthDistinct(context: ActionContext, path: Algebra.Path):
  Promise<{context: ActionContext; operation: IActorQueryOperationOutputBindings | undefined}> {
    if (!context || !context.get(ActorAbstractPath.isPathArbitraryLengthDistinctKey)) {
      context = context ?
        context.set(ActorAbstractPath.isPathArbitraryLengthDistinctKey, true) :
        ActionContext({ [ActorAbstractPath.isPathArbitraryLengthDistinctKey]: true });
      return { context,
        operation: ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation.mediate({
          operation: ActorAbstractPath.FACTORY.createDistinct(path),
          context,
        })) };
    }

    context = context.set(ActorAbstractPath.isPathArbitraryLengthDistinctKey, false);
    return { context, operation: undefined };
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
    counter.count++;

    const thisVariable = this.generateVariable();
    const vString = termToString(thisVariable);
    const path = ActorAbstractPath.FACTORY.createPath(x, predicate, thisVariable);
    const results = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: path, context }),
    );
    results.bindingsStream.on('data', async bindings => {
      const result = bindings.get(vString);
      await this.ALP(result, predicate, context, termHashes, it, counter);
    });
    results.bindingsStream.on('end', () => {
      if (--counter.count === 0) {
        it.close();
      }
    });
  }

  public async ALPTwoVariables(subjectString: string, objectString: string, subjectVal: Term,
    x: Term, predicate: Algebra.PropertyPathSymbol, context: ActionContext,
    termHashes: {[id: string]: Term}, it: BufferedIterator<Bindings>, counter: any): Promise<void> {
    const termString = termToString(subjectVal) + termToString(x);
    if (termHashes[termString]) {
      return;
    }

    (<any> it)._push(Bindings({ [subjectString]: subjectVal, [objectString]: x }));
    termHashes[termString] = x;
    counter.count++;

    const thisVariable = this.generateVariable();
    const vString = termToString(thisVariable);
    const path = ActorAbstractPath.FACTORY.createPath(x, predicate, thisVariable);
    const results = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: path, context }),
    );
    results.bindingsStream.on('data', async bindings => {
      const result = bindings.get(vString);
      await this.ALPTwoVariables(
        subjectString,
        objectString,
        subjectVal,
        result,
        predicate,
        context,
        termHashes,
        it,
        counter,
      );
    });
    results.bindingsStream.on('end', () => {
      if (--counter.count === 0) {
        it.close();
      }
    });
  }
}
