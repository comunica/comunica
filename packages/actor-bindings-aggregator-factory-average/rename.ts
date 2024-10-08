// // get name of all directories in the current directory
// import { readdirSync } from 'fs';
// import { join } from 'path';
// import * as path from "node:path";
// import {exec} from "node:child_process";
// import * as process from "node:process";
//
// const workingDir = process.cwd();
// const dirs = readdirSync(workingDir).filter(file => !file.includes('.'));
// const functionFactoryDirs = dirs.filter(dir => dir.includes('actor-function-factory-'));
// for (const dir of functionFactoryDirs) {
//     const functionName = dir.replace('actor-function-factory-', '');
//     const camelCaseFunctionName = functionName
//         .replace(/-([a-z])/, (g) => 'Function' + g[1].toUpperCase())
//         .replace(/-([a-z])/g, (g) => g[1].toUpperCase())
//         .replace(/^[a-z]/, (g) => g.toUpperCase());
//     const newCamelCaseFunctionName = functionName
//         .replace(/-([a-z])/g, (g) => g[1].toUpperCase())
//         .replace(/^[a-z]/, (g) => g.toUpperCase());
//
//     const originalActorName = join(dir, 'lib', `ActorFunctionFactory${camelCaseFunctionName}.ts`);
//     const newActorName = join(dir, 'lib', `ActorFunctionFactory${newCamelCaseFunctionName}.ts`);
//     console.log(originalActorName + ' -> ' + newActorName);
//     exec(`mv ${originalActorName} ${newActorName}`);
// }