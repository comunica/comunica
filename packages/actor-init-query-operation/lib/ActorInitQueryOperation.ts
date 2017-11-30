import {ActorInit, IActionInit, IActorOutputInit} from "@comunica/bus-init";
import {IActionQueryOperation, IActorQueryOperationOutput} from "@comunica/bus-query-operation";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {Readable} from "stream";

/**
 * A comunica Query Operation Init Actor.
 */
export class ActorInitQueryOperation extends ActorInit implements IActorInitQueryOperationArgs {

  public readonly mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
    IActionQueryOperation, IActorTest, IActorQueryOperationOutput>;
  public readonly operation?: string;
  public readonly context?: string;

  constructor(args: IActorInitQueryOperationArgs) {
    super(args);
  }

  public async test(action: IActionInit): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    const operation: string = action.argv.length > 0 ? action.argv[0] : this.operation;
    const context: string = action.argv.length > 1 ? action.argv[1] : this.context;
    if (!operation) {
      throw new Error('An operation must be defined in the config file or passed via the command line.');
    }
    const resolve: IActionQueryOperation = {
      context: context ? this.parseJson(context) : null,
      operation: this.parseJson(operation),
    };
    const result: IActorQueryOperationOutput = await this.mediatorQueryOperation.mediate(resolve);

    result.bindingsStream.on('data', (binding) => readable.push(JSON.stringify(binding) + '\n'));
    result.bindingsStream.on('end', () => readable.push(null));
    const readable = new Readable();
    readable._read = () => {
      return;
    };

    readable.push('Metadata: ' + JSON.stringify(await result.metadata, null, '  ') + '\n');
    readable.push('Variables: ' + JSON.stringify(result.variables, null, '  ') + '\n');

    return { stdout: readable };
  }

  protected parseJson(json: string): any {
    try {
      return JSON.parse(json);
    } catch (e) {
      throw new Error(e.toString() + ' in string ' + json);
    }
  }

}

export interface IActorInitQueryOperationArgs extends IActorArgs<IActionInit, IActorTest, IActorOutputInit> {
  mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
    IActionQueryOperation, IActorTest, IActorQueryOperationOutput>;
  operation?: string;
  context?: string;
}
