/* eslint-disable no-console,import/no-nodejs-modules */

import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

function getRegularFunctionBody(functionBody: string): string {
  const updatedFunctionBody = functionBody.trim().replace('class', 'export class');
  const dataFactoryCreation = '\nconst DF = new DataFactory<RDF.BaseQuad>();\n';

  // The excessive importing gets fixed by using yarn lint-fix
  return `
import { RegularFunction } from '@comunica/bus-function-factory';
import type {
  IInternalEvaluator,
  DurationLiteral,
  Term,
  YearMonthDurationLiteral,
  NumericLiteral,
  BooleanLiteral,
  StringLiteral,
} from '@comunica/expression-evaluator';
import {
  RegularOperator,
  TypeAlias,
  TypeURL,
  bool,
  decimal,
  declare,
  double,
  integer,
  langString,
  string,
  dayTimeDurationsToSeconds,
  defaultedDateTimeRepresentation,
  defaultedDayTimeDurationRepresentation,
  defaultedDurationRepresentation,
  defaultedYearMonthDurationRepresentation,
  extractRawTimeZone,
  negateDuration,
  toDateTimeRepresentation,
  toUTCDate,
  yearMonthDurationsToMonths,
  ExpressionError,
  RDFEqualTypeError,
  IncompatibleLanguageOperation,
  InvalidTimezoneCall,
  DateTimeLiteral,
  DayTimeDurationLiteral,
  DateLiteral,
  TimeLiteral,
  LangStringLiteral,
  Quad,
  NamedNode,
  DefaultGraph,
  TermTransformer,
  addDurationToDateTime,
  elapsedDuration,
} from '@comunica/expression-evaluator';
import type { IDayTimeDurationRepresentation } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { BigNumber } from 'bignumber.js';
import { sha1, sha256, sha384, sha512 } from 'hash.js';
import { DataFactory } from 'rdf-data-factory';
import { resolve as resolveRelativeIri } from 'relative-to-absolute-iri';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import { hash as md5 } from 'spark-md5';
import * as uuid from 'uuid';
${/[ <(\[]DF\./u.test(functionBody) ? dataFactoryCreation : ''}
${updatedFunctionBody}
`.trimStart();
}

function toSnakeCaseName(camelCaseName: string): string {
  return camelCaseName.replaceAll(/([A-Z])/gu, '-$1').toLowerCase()
    .replaceAll(/^-/gu, '');
}

function getFunctionConfig(camelCaseName: string): string {
  const snakeCaseName = toSnakeCaseName(camelCaseName);
  return `
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/runner/^3.0.0/components/context.jsonld",

    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-function-factory-${snakeCaseName}/^1.0.0/components/context.jsonld"
  ],
  "@id": "urn:comunica:default:Runner",
  "@type": "Runner",
  "actors": [
    {
      "@id": "urn:comunica:default:function-factory/actors#${snakeCaseName}",
      "@type": "ActorFunctionFactory${camelCaseName}"
    }
  ]
}
    `.trim();
}

function getRegularActorBody(camelCaseName: string, operatorName: string): string {
  return `
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
import { RegularOperator } from '@comunica/expression-evaluator';
import { ${camelCaseName} } from './${camelCaseName}';

/**
 * A comunica ${camelCaseName} Function Factory Actor.
 */
export class ActorFunctionFactory${camelCaseName} extends ActorFunctionFactory {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args);
  }

  public async test(action: IActionFunctionFactory): Promise<IActorTest> {
    // Does support action.requireTermExpression, so no need to check for that.
    if (action.functionName === RegularOperator.${operatorName}) {
      return true;
    }
    throw new Error(\`Actor \${this.name} can only test for \${RegularOperator.${operatorName}}\`);
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new ${camelCaseName}();
  }
}
    `.trim();
}

async function updateEngineConfig(camelCaseName: string): Promise<void> {
  const snakeCaseName = toSnakeCaseName(camelCaseName);

  const actorConfigFile = `engines/config-query-sparql/config/function-factory/actors/${snakeCaseName}.json`;
  const configBody = getFunctionConfig(camelCaseName);

  // Add actor to the actors list
  const configListFile = `engines/config-query-sparql/config/function-factory/actors.json`;
  const configList = (await readFile(configListFile)).toString();
  const updatedConfigList = configList.replaceAll(
    /("import": \[\n)/gu,
    `$1    "ccqs:config/function-factory/actors/${snakeCaseName}.json",\n`,
  );

  await Promise.all([
    writeFile(actorConfigFile, configBody),
    writeFile(configListFile, updatedConfigList),
  ]);
}

async function createActorPackage(camelCaseName: string, functionBody: string): Promise<void> {
  const snakeCaseName = toSnakeCaseName(camelCaseName);
  const operatorName = /public operator = RegularOperator.([^; ]+);/u.exec(functionBody)![1];

  // Execute command.
  execSync(`yes "" | yo comunica:actor "${snakeCaseName}" "function-factory"`);

  const actorFilePath = `packages/actor-function-factory-${snakeCaseName}/lib/ActorFunctionFactory${camelCaseName}.ts`;
  const actorBody = getRegularActorBody(camelCaseName, operatorName);

  const bodyFile = `packages/actor-function-factory-${snakeCaseName}/lib/${camelCaseName}.ts`;
  const updatedFunctionBody = getRegularFunctionBody(functionBody);

  const packageJsonFile = `packages/actor-function-factory-${snakeCaseName}/package.json`;
  const packageJsonContent = (await readFile(packageJsonFile)).toString();
  const updatedPackageJsonContent = packageJsonContent.replaceAll(
    /("dependencies":[^\n]*\n)/gu,
    `$1    "@comunica/expression-evaluator": "^3.0.1",\n`,
  );

  await Promise.all([
    writeFile(actorFilePath, actorBody),
    writeFile(bodyFile, updatedFunctionBody),
    writeFile(packageJsonFile, updatedPackageJsonContent),
  ]);
}

async function main(): Promise<void> {
  // Read the RegularFunctions.
  const regFunctions =
    (await readFile('packages/actor-function-factory-wrapper-all/lib/implementation/RegularFunctions.ts'))
      .toString();
  // Match all functions.
  const matches = regFunctions.matchAll(/\n(\/\*\*\n( \*.*\n)* \*\/\n)?class ([^ ]+)(([^}][^\n]*)?\n)*\}\n/ug);
  for (const match of matches) {
    const camelCaseName: string = match[3];
    const functionBody: string = match[0];

    // Write the updated actor file.
    await Promise.all([
      createActorPackage(camelCaseName, functionBody),
      updateEngineConfig(camelCaseName),
    ]);
    break;
  }
}

main().catch(console.error);
