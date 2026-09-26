// eslint-disable-next-line import/no-nodejs-modules
import { existsSync, readdirSync, readFileSync } from 'node:fs';

// eslint-disable-next-line import/no-nodejs-modules
import * as Path from 'node:path';

/**
 * Matches the description of an actor in its README.
 * This must remain in sync with the regex used on https://comunica.dev/docs/modify/advanced/buses/,
 * which is defined in https://github.com/comunica/website/blob/master/pages/docs/modify/advanced/buses.js
 */
export const ACTOR_DESCRIPTION_REGEX =
  /^An? \[([^\]]*)\]\([^)]*\)[ \n]actor((([^.]*\.[^ \n])*[^.]*)*)\.[ \n]/miu;

/**
 * Validate the README of an actor package.
 * @param readme The README contents.
 * @param busExists Callback to check if a bus package with the given name exists.
 * @return An error message, or undefined if valid.
 */
export function validateActorReadme(readme: string, busExists: (busName: string) => boolean): string | undefined {
  const match = ACTOR_DESCRIPTION_REGEX.exec(readme);
  if (!match) {
    return 'README must contain a description of the form "An [Bus Name](link-to-bus) actor that ...".';
  }
  const busName = match[1].toLowerCase().replaceAll(' ', '-');
  if (!busExists(busName)) {
    return `README refers to bus "${match[1]}", but no package "bus-${busName}" exists.`;
  }
}

/**
 * Validate the READMEs of all (non-abstract) actor packages in the given monorepo.
 * @param monorepoDir A monorepo directory.
 * @return A list of failure messages.
 */
export function readmeCheck(monorepoDir: string): string[] {
  const packagesDir = Path.join(monorepoDir, 'packages');
  const busExists = (busName: string): boolean => existsSync(Path.join(packagesDir, `bus-${busName}`, 'package.json'));
  const failures: string[] = [];
  for (const name of readdirSync(packagesDir).sort()) {
    // Skip abstract actors, and removed packages of which only a README remains
    if (!name.startsWith('actor-') || name.startsWith('actor-abstract-') ||
      !existsSync(Path.join(packagesDir, name, 'package.json'))) {
      continue;
    }
    const readmePath = Path.join(packagesDir, name, 'README.md');
    const error = existsSync(readmePath) ?
      validateActorReadme(readFileSync(readmePath, 'utf8'), busExists) :
      'README is missing.';
    if (error) {
      failures.push(`${name}: ${error}`);
    }
  }
  return failures;
}
