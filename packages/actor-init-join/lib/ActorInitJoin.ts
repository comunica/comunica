import {ActorInit, IActionInit, IActorOutputInit} from "@comunica/bus-init";
import {
  ActorQueryOperation, Bindings,
  IActionQueryOperation, IActorQueryOperationOutput,
} from "@comunica/bus-query-operation";
import {ActorRdfJoin, IActionRdfJoin} from "@comunica/bus-rdf-join";
import {IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {Readable} from "stream";

/**
 * A comunica Join Init Actor.
 */
export class ActorInitJoin extends ActorInit implements IActorInitJoinArgs {

  public readonly operationMediator: Mediator<ActorQueryOperation, IActionQueryOperation,
    IActorTest, IActorQueryOperationOutput>;
  public readonly joinMediator: Mediator<ActorRdfJoin, IActionRdfJoin, IActorTest, IActorQueryOperationOutput>;

  public readonly leftPattern: string;
  public readonly rightPattern: string;
  public readonly context: string;

  constructor(args: IActorInitJoinArgs) {
    super(args);
  }

  public async test(action: IActionInit): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    if (!this.leftPattern || !this.rightPattern) {
      throw new Error("Both patterns need to be provided.");
    }

    const leftInput: IActionQueryOperation = {
      context: this.context ? JSON.parse(this.context) : undefined,
      operation: JSON.parse(this.leftPattern),
    };
    const leftOutput = await this.operationMediator.mediate(leftInput);
    const rightInput: IActionQueryOperation = {
      context: this.context ? JSON.parse(this.context) : undefined,
      operation: JSON.parse(this.rightPattern),
    };
    const rightOutput = await this.operationMediator.mediate(rightInput);

    const joinInput: IActionRdfJoin = { entries: [leftOutput, rightOutput] };
    const joinOutput = await this.joinMediator.mediate(joinInput);

    const readable = new Readable();
    readable._read = () => {
      return;
    };

    joinOutput.bindingsStream.on('data', (binding: Bindings) => readable.push(JSON.stringify(binding) + '\n'));
    joinOutput.bindingsStream.on('end', () => readable.push(null));

    readable.push('Metadata: ' + JSON.stringify(joinOutput.metadata, null, '  ') + '\n');
    readable.push('Variables: ' + JSON.stringify(joinOutput.variables, null, '  ') + '\n');

    return { stdout: readable };
  }

}

export interface IActorInitJoinArgs extends IActorArgs<IActionInit, IActorTest, IActorOutputInit> {
  operationMediator: Mediator<ActorQueryOperation, IActionQueryOperation,
    IActorTest, IActorQueryOperationOutput>;
  joinMediator: Mediator<ActorRdfJoin, IActionRdfJoin, IActorTest, IActorQueryOperationOutput>;

  leftPattern: string;
  rightPattern: string;
  context: string;
}
