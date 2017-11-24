import {ActorInit, IActionInit, IActorOutputInit} from "@comunica/bus-init";
import {
  ActorQueryOperation, Bindings,
  IActionQueryOperation, IActorQueryOperationOutput,
} from "@comunica/bus-query-operation";
import {ActorRdfJoin, IActionRdfJoin, IActorRdfJoinOutput} from "@comunica/bus-rdf-join";
import {IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {Readable} from "stream";

/**
 * A comunica Join Init Actor.
 */
export class ActorInitJoin extends ActorInit {

  private operationMediator: Mediator<ActorQueryOperation, IActionQueryOperation,
    IActorTest, IActorQueryOperationOutput>;
  private joinMediator: Mediator<ActorRdfJoin, IActionRdfJoin, IActorTest, IActorRdfJoinOutput>;

  private leftPattern: string;
  private rightPattern: string;
  private context: string;

  constructor(args: IActorArgs<IActionInit, IActorTest, IActorOutputInit>) {
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

    const joinInput: IActionRdfJoin = {
      left: leftOutput.bindingsStream,
      leftMetadata: await leftOutput.metadata,
      right: rightOutput.bindingsStream,
      rightMetadata: await rightOutput.metadata,
    };
    const joinOutput = await this.joinMediator.mediate(joinInput);

    const readable = new Readable();
    readable._read = () => {
      return;
    };

    joinOutput.bindingsStream.on('data', (binding: Bindings) => readable.push(JSON.stringify(binding) + '\n'));
    joinOutput.bindingsStream.on('end', () => readable.push(null));

    readable.push('Metadata: ' + JSON.stringify(joinOutput.metadata, null, '  ') + '\n');

    return { stdout: readable };
  }

}
