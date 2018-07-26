import {IActorOutputInit} from "@comunica/bus-init";
import {ISetupProperties, Setup} from "@comunica/runner";

export function runArgs(configResourceUrl: string, argv: string[], stdin: NodeJS.ReadStream,
                        stdout: NodeJS.WriteStream, stderr: NodeJS.WriteStream, env: NodeJS.ProcessEnv,
                        runnerUri?: string, properties?: ISetupProperties) {
  Setup.run(configResourceUrl, { argv, env, stdin }, runnerUri, properties)
    .then((results: IActorOutputInit[]) => {
      results.forEach((result: IActorOutputInit) => {
        if (result.stdout) {
          result.stdout.on('error', console.error);
          result.stdout.pipe(stdout);
        }
        if (result.stderr) {
          result.stderr.on('error', console.error);
          result.stderr.pipe(stderr);
        }
      });
    })
    .catch(console.error);
}

export function runArgsInProcess(moduleRootPath: string, defaultConfigPath: string) {
  const argv = process.argv.slice(2);
  runArgs(process.env.COMUNICA_CONFIG
    ? process.cwd() + '/' + process.env.COMUNICA_CONFIG : defaultConfigPath, argv,
    process.stdin, process.stdout, process.stderr, process.env,
    null, { mainModulePath: moduleRootPath });
}
