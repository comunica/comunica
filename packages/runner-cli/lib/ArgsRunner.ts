import {IActorOutputInit} from "@comunica/bus-init";
import {Setup} from "@comunica/runner";

export function runArgs(configResourceUrl: string, argv: string[], stdin: NodeJS.ReadStream,
                        stdout: NodeJS.WriteStream, stderr: NodeJS.WriteStream, env: NodeJS.ProcessEnv) {
  Setup.run(configResourceUrl, { argv, env, stdin })
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
