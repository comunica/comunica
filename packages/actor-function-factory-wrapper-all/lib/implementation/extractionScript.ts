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
    const allCapsSnakeCaseName = snakeCaseName.toUpperCase().replaceAll('-', '_');
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
    if (action.functionName === RegularOperator.${allCapsSnakeCaseName}) {
      return true;
    }
    throw new Error(\`Actor \${this.name} can only test for \${RegularOperator.${allCapsSnakeCaseName}}\`);
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new ${camelCaseName}();
  }
}
    `.trim();

    const bodyFile = `packages/actor-function-factory-${snakeCaseName}/lib/${camelCaseName}.ts`;
    const updatedFunctionBody = functionBody.replaceAll(/(\s+)C\./gu, '$1');

    // The excessive importing gets fixed by using yarn lint-fix
    const bodyFileContent = `
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
import { hash as md5 } from 'spark-md5';
import * as uuid from 'uuid';

export ${updatedFunctionBody}
`.trimStart();

    const actorConfigFile = `engines/config-query-sparql/config/function-factory/actors/${snakeCaseName}.json`;
    const actorConfig = `
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

    // Add actor to the actors list
    const configListFile = `engines/config-query-sparql/config/function-factory/actors.json`;
    const configList = (await readFile(configListFile)).toString();
    const updatedConfigList = configList.replaceAll(
      /("import": \[\n)/gu,
      `$1    "ccqs:config/function-factory/actors/${snakeCaseName}.json",\n`,
    );

    const packageJsonFile = `packages/actor-function-factory-${snakeCaseName}/package.json`;
    const packageJsonContent = (await readFile(packageJsonFile)).toString();
    const updatedPackageJsonContent = packageJsonContent.replaceAll(
      /("dependencies":[^\n]*\n)/gu,
      `$1    "@comunica/expression-evaluator": "^3.0.1",\n`,
    );

    // Write the updated actor file.
    await Promise.all([
      writeFile(actorFilePath, actorFile),
      writeFile(bodyFile, bodyFileContent),
      writeFile(actorConfigFile, actorConfig),
      writeFile(configListFile, updatedConfigList),
      writeFile(packageJsonFile, updatedPackageJsonContent),
    ]);
  }
}

main().catch(console.error);

// [camelCase, snake-case, ALL_CAPS_SNAKE_CASE]
// const nameMap: Record<string, [string, string, string]> = {
//   Not: [ 'Not', 'not', 'NOT' ],
//   UnaryPlus: [ 'UnaryPlus', 'unary-plus', 'UNARY_PLUS' ],
//   UnaryMinus: [ 'UnaryMinus', 'unary-minus', 'UNARY_MINUS' ],
//   Multiplication: [ 'Multiplication', 'multiplication', 'MULTIPLICATION' ],
//   Division: [ 'Division', 'division', 'DIVISION' ],
//   Addition: [ 'Addition', 'addition', 'ADDITION' ],
//   Subtraction: [ 'Subtraction', 'subtraction', 'SUBTRACTION' ],
//   Equality: [ 'Equality', 'equality', 'EQUALITY' ],
//   Inequality: [ 'Inequality', 'inequality', 'INEQUALITY' ],
//   LesserThan: [ 'LesserThan', 'lesser-than', 'LESSER_THAN' ],
//   GreaterThan: [ 'GreaterThan', 'greater-than', 'GREATER_THAN' ],
//   LesserThanEqual: [ 'LesserThanEqual', 'lesser-than-equal', 'LESSER_THAN_EQUAL' ],
//   GreaterThanEqual: [ 'GreaterThanEqual', 'greater-than-equal', 'GREATER_THAN_EQUAL' ],
//   IsIRI: [ 'IsIRI', 'is-iri', 'IS_IRI' ],
//   IsBlank: [ 'IsBlank', 'is-blank', 'IS_BLANK' ],
//   IsLiteral: [ 'IsLiteral', 'is-literal', 'IS_LITERAL' ],
//   IsNumeric: [ 'IsNumeric', 'is-numeric', 'IS_NUMERIC' ],
//   STR: [ 'STR', 'str', 'STR' ],
//   Lang: [ 'Lang', 'lang', 'LANG' ],
//   Datatype: [ 'Datatype', 'datatype', 'DATATYPE' ],
//   IRI: [ 'IRI', 'iri', 'IRI' ],
//   STRDT: [ 'STRDT', 'strdt', 'STRDT' ],
//   STRLANG: [ 'STRLANG', 'strlang', 'STRLANG' ],
//   UUID: [ 'UUID', 'uuid', 'UUID' ],
//   STRUUID: [ 'STRUUID', 'struuid', 'STRUUID' ],
//   STRLEN: [ 'STRLEN', 'strlen', 'STRLEN' ],
//   SUBSTR: [ 'SUBSTR', 'substr', 'SUBSTR' ],
//   UCASE: [ 'UCASE', 'ucase', 'UCASE' ],
//   LCASE: [ 'LCASE', 'lcase', 'LCASE' ],
//   STRSTARTS: [ 'STRSTARTS', 'strstarts', 'STRSTARTS' ],
//   STRENDS: [ 'STRENDS', 'strends', 'STRENDS' ],
//   CONTAINS: [ 'CONTAINS', 'contains', 'CONTAINS' ],
//   STRBEFORE: [ 'STRBEFORE', 'strbefore', 'STRBEFORE' ],
//   STRAFTER: [ 'STRAFTER', 'strafter', 'STRAFTER' ],
//   ENCODE_FOR_URI: [ 'ENCODE_FOR_URI', 'encode-for-uri', 'ENCODE_FOR_URI' ],
//   Langmatches: [ 'Langmatches', 'langmatches', 'LANGMATCHES' ],
//   REGEX: [ 'REGEX', 'regex', 'REGEX' ],
//   REPLACE: [ 'REPLACE', 'replace', 'REPLACE' ],
//   Abs: [ 'Abs', 'abs', 'ABS' ],
//   Round: [ 'Round', 'round', 'ROUND' ],
//   Ceil: [ 'Ceil', 'ceil', 'CEIL' ],
//   Floor: [ 'Floor', 'floor', 'FLOOR' ],
//   Rand: [ 'Rand', 'rand', 'RAND' ],
//   Now: [ 'Now', 'now', 'NOW' ],
//   Year: [ 'Year', 'year', 'YEAR' ],
//   Month: [ 'Month', 'month', 'MONTH' ],
//   Day: [ 'Day', 'day', 'DAY' ],
//   Hours: [ 'Hours', 'hours', 'HOURS' ],
//   Minutes: [ 'Minutes', 'minutes', 'MINUTES' ],
//   Seconds: [ 'Seconds', 'seconds', 'SECONDS' ],
//   Timezone: [ 'Timezone', 'timezone', 'TIMEZONE' ],
//   TZ: [ 'TZ', 'tz', 'TZ' ],
//   MD5: [ 'Md5', 'md5', 'MD5' ],
//   SHA1: [ 'Sha1', 'sha1', 'SHA1' ],
//   SHA256: [ 'Sha256', 'sha256', 'SHA256' ],
//   SHA384: [ 'Sha384', 'sha384', 'SHA384' ],
//   SHA512: [ 'Sha512', 'sha512', 'SHA512' ],
//   Triple: [ 'Triple', 'triple', 'TRIPLE' ],
//   Subject: [ 'Subject', 'subject', 'SUBJECT' ],
//   Predicate: [ 'Predicate', 'predicate', 'PREDICATE' ],
//   ObjectSparqlFunction: [ 'ObjectSparqlFunction', 'object-sparql-function', 'OBJECT_SPARQL_FUNCTION' ],
//   IsTriple: [ 'IsTriple', 'is-triple', 'IS_TRIPLE' ],
// };
