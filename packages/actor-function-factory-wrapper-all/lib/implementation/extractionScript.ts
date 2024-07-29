/* eslint-disable no-console,import/no-nodejs-modules */

import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

async function main(): Promise<void> {
  // Read the RegularFunctions.
  const regFunctions =
    (await readFile('packages/actor-function-factory-wrapper-all/lib/implementation/RegularFunctions.ts'))
      .toString();
  // Match all functions.
  const matches = regFunctions.matchAll(/class ([^ ]+)(([^}][^\n]*)?\n)*\}\n/ug);
  let match = matches.next().value;
  while (match[1] !== 'Abs') {
    match = matches.next().value;
  }

  {
    const camelCaseName: string = match[1];
    const functionBody: string = match[0];
    const snakeCaseName = camelCaseName.replaceAll(/([A-Z])/gu, '-$1').toLowerCase()
      .replaceAll(/^-/gu, '');
    const capitalizedSnakeCaseName = snakeCaseName.toUpperCase().replaceAll('-', '_');
    // Execute command.
    execSync(`yes "" | yo comunica:actor "${snakeCaseName}" "function-factory"`);
    console.log(snakeCaseName);
    console.log(functionBody);

    const actorFilePath = `packages/actor-function-factory-${snakeCaseName}/lib/ActorFunctionFactory${camelCaseName}.ts`;
    const actorFile = `
import type {
  IActionFunctionFactory,
  IActorFunctionFactoryArgs,
  IActorFunctionFactoryOutput,
  IActorFunctionFactoryOutputTerm,
} from '@comunica/bus-function-factory';
import {
  ActorFunctionFactory,
} from '@comunica/bus-function-factory';
import type { IActorTest } from '@comunica/core';
import * as C from '@comunica/expression-evaluator/lib/util/Consts';
import { ${camelCaseName} } from './AbsFunction';

/**
 * A comunica ${camelCaseName} Function Factory Actor.
 */
export class ActorFunctionFactory${camelCaseName} extends ActorFunctionFactory {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args);
  }

  public async test(action: IActionFunctionFactory): Promise<IActorTest> {
    // Does support action.requireTermExpression, so no need to check for that.
    if (action.functionName === C.RegularOperator.${capitalizedSnakeCaseName}) {
      return true;
    }
    throw new Error(\`Actor \${this.name} can only test for \${C.RegularOperator.${capitalizedSnakeCaseName}}\`);
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new ${camelCaseName}();
  }
}
    `.trim();

    const bodyFile = `packages/actor-function-factory-${snakeCaseName}/lib/${camelCaseName}Function.ts`;

    const bodyFileContent = `
import { RegularFunction } from '@comunica/bus-function-factory/lib/implementation';
import { bool, declare } from '@comunica/expression-evaluator/lib/functions/Helpers';
import * as C from '@comunica/expression-evaluator/lib/util/Consts';

export ${functionBody}
`.trimStart();

    // Write the updated actor file.
    await Promise.all([
      writeFile(actorFilePath, actorFile),
      writeFile(bodyFile, bodyFileContent),
    ]);
  }
}

main().catch(console.error);
