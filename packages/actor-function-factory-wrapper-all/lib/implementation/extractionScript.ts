/* eslint-disable import/no-nodejs-modules */

import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';

function getSparqlFunctionBody(functionBody: string): string {
  const updatedFunctionBody = functionBody.trim().replace('class', 'export class');
  const dataFactoryCreation = '\nconst DF = new DataFactory<RDF.BaseQuad>();\n';

  // The excessive importing gets fixed by using yarn lint-fix
  return `
import { ExpressionFunctionBase, TermFunctionBase } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import { BlankNodeBindingsScoped } from '@comunica/data-factory';
import type {
  BooleanLiteral,
  Expression,
  IEvalContext,
  IInternalEvaluator,
  Literal,
  NamedOperator,
  NumericLiteral,
  OverloadTree,
  StringLiteral,
  Term,
  TermExpression,
  VariableExpression,
} from '@comunica/expression-evaluator';
import {
  addDurationToDateTime,
  BlankNode,
  bool,
  CastError,
  CoalesceError,
  DateLiteral,
  dateTime,
  DateTimeLiteral,
  DayTimeDurationLiteral,
  dayTimeDurationsToSeconds,
  decimal,
  declare,
  defaultedDateTimeRepresentation,
  defaultedDayTimeDurationRepresentation,
  defaultedDurationRepresentation,
  defaultedYearMonthDurationRepresentation,
  DefaultGraph,
  double,
  DurationLiteral,
  elapsedDuration,
  ExpressionError,
  expressionToVar,
  ExpressionType,
  extractRawTimeZone,
  float,
  IncompatibleLanguageOperation,
  InError,
  integer,
  InvalidArgumentTypes,
  InvalidTimezoneCall,
  langString,
  LangStringLiteral,
  NamedNode,
  negateDuration,
  parseDate,
  parseDateTime,
  parseDayTimeDuration,
  parseDuration,
  parseTime,
  parseXSDDecimal,
  parseXSDFloat,
  parseXSDInteger,
  parseYearMonthDuration,
  Quad,
  RDFEqualTypeError,
  SparqlOperator,
  string,
  TermTransformer,
  TimeLiteral,
  toDateTimeRepresentation,
  toUTCDate,
  trimToDayTimeDuration,
  trimToYearMonthDuration,
  TypeAlias,
  TypeURL,
  YearMonthDurationLiteral,
  yearMonthDurationsToMonths,
} from '@comunica/expression-evaluator';
import type { ComunicaDataFactory, IDayTimeDurationRepresentation } from '@comunica/types';
import { BigNumber } from 'bignumber.js';
import { sha1, sha256, sha384, sha512 } from 'hash.js';
import { resolve as resolveRelativeIri } from 'relative-to-absolute-iri';
import { hash as md5 } from 'spark-md5';
import * as uuid from 'uuid';

${/[ <([]DF\./u.test(functionBody) ? dataFactoryCreation : ''}
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

    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-function-factory-${snakeCaseName}/^3.0.0/components/context.jsonld"
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

function getSparqlActorBody(camelCaseName: string, operatorName: string, isSpecial: boolean): string {
  const testCase: string = isSpecial ?
    `action.functionName === SparqlOperator.${operatorName} || action.requireTermExpression` :
    `action.functionName === SparqlOperator.${operatorName}`;
  const testError = isSpecial ?
    `Actor \${this.name} can only provide non-termExpression implementations for \${SparqlOperator.${operatorName}}` :
    `Actor \${this.name} can only provide implementations for \${SparqlOperator.${operatorName}}`;
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
import { SparqlOperator } from '@comunica/expression-evaluator';
import { ${camelCaseName} } from './${camelCaseName}';

/**
 * A comunica ${camelCaseName} Function Factory Actor.
 */
export class ActorFunctionFactory${camelCaseName} extends ActorFunctionFactory {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args);
  }

  public async test(action: IActionFunctionFactory): Promise<IActorTest> {
    if (${testCase}) {
      return true;
    }
    throw new Error(\`${testError}\`);
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new ${camelCaseName}();
  }
}
    `.trim();
}

function updateEngineDependencies(camelCaseName: string): void {
  for (const engineName of [ 'query-sparql', 'query-sparql-file', 'query-sparql-rdfjs', 'query-sparql-rdfjs-lite' ]) {
    const enginePackageFile = `engines/${engineName}/package.json`;
    const enginePackage = readFileSync(enginePackageFile).toString();
    const updateEnginePackage = enginePackage.replaceAll(
      /("dependencies": \{)/gu,
      `$1
    "@comunica/actor-function-factory-${toSnakeCaseName(camelCaseName)}": "^3.2.1",`,
    );

    writeFileSync(enginePackageFile, updateEnginePackage);
  }
}

function updateEngineConfig(camelCaseName: string): void {
  const snakeCaseName = toSnakeCaseName(camelCaseName);

  const actorConfigFile = `engines/config-query-sparql/config/function-factory/actors/${snakeCaseName}.json`;
  const configBody = getFunctionConfig(camelCaseName);

  // Add actor to the actors list
  const configListFile = `engines/config-query-sparql/config/function-factory/actors.json`;
  const configList = readFileSync(configListFile).toString();
  const updatedConfigList = configList.replaceAll(
    /("import": \[\n)/gu,
    `$1    "ccqs:config/function-factory/actors/${snakeCaseName}.json",\n`,
  );

  updateEngineDependencies(camelCaseName);

  writeFileSync(actorConfigFile, configBody);
  writeFileSync(configListFile, updatedConfigList);
}

function createActorPackage(camelCaseName: string, functionBody: string): void {
  const snakeCaseName = toSnakeCaseName(camelCaseName);
  const operatorName = /operator: .*\.([^; ]+),/u.exec(functionBody)![1];

  // Execute command.
  execSync(`yes "" | yo comunica:actor "${snakeCaseName}" "function-factory"`);

  const actorFilePath = `packages/actor-function-factory-${snakeCaseName}/lib/ActorFunctionFactory${camelCaseName}.ts`;
  const actorBody = getSparqlActorBody(
    camelCaseName,
    operatorName,
    /class [^ ]+ extends ExpressionFunctionBase/gu.test(functionBody),
  );

  const bodyFile = `packages/actor-function-factory-${snakeCaseName}/lib/${camelCaseName}.ts`;
  const updatedFunctionBody = getSparqlFunctionBody(functionBody);

  const packageJsonFile = `packages/actor-function-factory-${snakeCaseName}/package.json`;
  const packageJsonContent = readFileSync(packageJsonFile).toString();
  const updatedPackageJsonContent = packageJsonContent.replaceAll(
    /("dependencies":[^\n]*\n)/gu,
    `$1    "@comunica/expression-evaluator": "^3.2.1",\n`,
  ).replaceAll('"version": "1.0.0"', '"version": "3.2.1"');

  const readmeFile = `packages/actor-function-factory-${snakeCaseName}/README.md`;
  const readmeContent = readFileSync(readmeFile).toString();
  const updatedReadmeContent = readmeContent.replaceAll(
    /### Config Parameters(.|\n)*/gu,
    `\n`,
  ).replaceAll(/\n{3}/gu, '\n');

  writeFileSync(actorFilePath, actorBody);
  writeFileSync(bodyFile, updatedFunctionBody);
  writeFileSync(packageJsonFile, updatedPackageJsonContent);
  writeFileSync(readmeFile, updatedReadmeContent);
}

function parseFunctionClasses(body: string): { camelCaseName: string; functionBody: string }[] {
  return [
    ...body.matchAll(/\n(\/\*\*\n( \*.*\n)* \*\/\n)?class ([^ ]+)(([^}][^\n]*)?\n)*\}\n/ug),
  ].map(x => ({ camelCaseName: x[3], functionBody: x[0] }));
}

function extractFunctions(functionsFileLocation: string): void {
  const regularFunctions = readFileSync(functionsFileLocation).toString();
  const matches = parseFunctionClasses(regularFunctions);

  for (const match of matches) {
    const { camelCaseName, functionBody } = match;
    createActorPackage(camelCaseName, functionBody);
    updateEngineConfig(camelCaseName);

    break;
  }
}

function main(): void {
  extractFunctions('packages/actor-function-factory-wrapper-all/lib/implementation/SparqlFunctions.ts');
}

main();
