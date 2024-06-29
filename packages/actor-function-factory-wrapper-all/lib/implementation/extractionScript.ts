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

  {
    const match = matches.next().value;
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
    const actorFile = (await readFile(actorFilePath)).toString();
    // Replace test method.
    let updatedActor = actorFile.replaceAll(/(public async test[^\n]*)(\n[^\n]*){2}/gu, `
$1
    // Does support action.requireTermExpression, so no need to check for that.
    return action.functionName === C.RegularOperator.${capitalizedSnakeCaseName};
  }\n
`.trim());
    updatedActor = updatedActor.replaceAll(/(public async run[^\n]*)(\n[^\n]*){2}/gu, `
$1
    return new ${camelCaseName}();
  }
    `.trim());
    updatedActor = `
import * as C from '@comunica/expression-evaluator/lib/util/Consts';
import { ${camelCaseName} } from './${camelCaseName}Function';
${updatedActor}
    `.trim();
    updatedActor = `${updatedActor}\n`;
    console.log(updatedActor);

    const bodyFile = `packages/actor-function-factory-${snakeCaseName}/lib/${camelCaseName}Function.ts`;
    const bodyFileContent = `
import { RegularFunction } from '@comunica/bus-function-factory/lib/implementation';
import { bool, declare } from '@comunica/expression-evaluator/lib/functions/Helpers';
import * as C from '@comunica/expression-evaluator/lib/util/Consts';

export ${functionBody}
`.trimStart();

    // Write the updated actor file.
    await Promise.all([
      writeFile(actorFilePath, updatedActor),
      writeFile(bodyFile, bodyFileContent),
    ]);
  }
}

main().catch(console.error);
