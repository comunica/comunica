import {ActorHttp, IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {Request} from "node-fetch";

/**
 * A comunica Memento Http Actor.
 */
export class ActorHttpMemento extends ActorHttp {

  public readonly mediator: Mediator<ActorHttp,
  IActionHttp, IActorTest, IActorHttpOutput>;

  constructor(args: IActorArgs<IActionHttp, IActorTest, IActorHttpOutput>) {
    super(args);
  }

  public async test(action: IActionHttp): Promise<IActorTest> {
    return true; // TODO implement
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {

    if ((<any> action.input).headers) {
      options.url = (<Request> action.input).headers;
      Object.assign(options, action.input);
    } else {
      options.url = action.input;
    }

    // 1. Create ActionHttp
    const httpAction: IActionHttp = {
      input: new Request()
    };

    // 2. Add datetime

    // 3. call mediator
    mediator.mediate(new IActionHttp());

    // 4. follow timegate

    // 5. Create IActorHttpOutput
    return IActorHttpOutput;
  }

}
