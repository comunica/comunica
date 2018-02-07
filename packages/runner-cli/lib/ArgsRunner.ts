import {IActorOutputInit} from "@comunica/bus-init";
import {ISetupProperties, Setup} from "@comunica/runner";

export function runArgs(configResourceUrl: string, argv: string[], stdin: NodeJS.ReadStream,
                        stdout: NodeJS.WriteStream, stderr: NodeJS.WriteStream, env: NodeJS.ProcessEnv,
                        runnerUri?: string, properties?: ISetupProperties) {
  Setup.run(configResourceUrl, { argv, env, stdin }, runnerUri, properties)
    .then((results: IActorOutputInit[]) => {
      results.forEach((result: IActorOutputInit) => {
        if (result.stdout) {
          result.stdout.pipe(stdout);
        }
        if (result.stderr) {
          result.stderr.pipe(stderr);
        }
      });
    })
    .catch(console.error);
}
