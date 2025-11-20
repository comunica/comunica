import type {
  IActionQuerySerialize,
  IActorQuerySerializeOutput,
  IActorQuerySerializeArgs,
} from '@comunica/bus-query-serialize';
import { ActorQuerySerialize } from '@comunica/bus-query-serialize';
import type { TestResult, IActorTest } from '@comunica/core';
import { passTestVoid, failTest } from '@comunica/core';
import { toAst } from '@traqula/algebra-sparql-1-2';
import type { Algebra as TraqualAlgebra } from '@traqula/algebra-transformations-1-2';
import { traqulaIndentation } from '@traqula/core';
import { Generator } from '@traqula/generator-sparql-1-2';

/**
 * A comunica SPARQL Query Serialize Actor.
 */
export class ActorQuerySerializeSparql extends ActorQuerySerialize {
  public constructor(args: IActorQuerySerializeArgs) {
    super(args);
  }

  public async test(action: IActionQuerySerialize): Promise<TestResult<IActorTest>> {
    if (action.queryFormat.language !== 'sparql') {
      return failTest('This actor can only serialize SPARQL queries');
    }
    return passTestVoid();
  }

  public async run(action: IActionQuerySerialize): Promise<IActorQuerySerializeOutput> {
    const generator = new Generator({
      [traqulaIndentation]: action.newlines === false ? -1 : 0,
      indentInc: action.indentWidth ?? 2,
    });

    // This query source only handles the Known Algebra from @comunica/utils-algebra.
    // It will likely throw when unknown algebra operations are being translated
    // or the translation will not happen correctly.
    const ast = toAst(<TraqualAlgebra.Operation> action.operation);
    const query = generator.generate(ast).trim();

    return { query };
  }
}
