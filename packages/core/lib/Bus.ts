import * as _ from "lodash";
import {Actor, IAction, IActorOutput, IActorTest} from "./Actor";

/**
 * A publish-subscribe bus for sending actions to actors
 * to test whether or not they can run an action.
 *
 * This bus does not run the action itself,
 * for that a {@link Mediator} can be used.
 *
 * @see Actor
 * @see Mediator
 *
 * @template A The actor type that can subscribe to the sub.
 * @template I The input type of an actor.
 * @template T The test type of an actor.
 * @template O The output type of an actor.
 */
export class Bus<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest, O extends IActorOutput>
    implements IBusArgs {

    public readonly name: string;
    protected readonly actors: A[] = [];

    /**
     * All enumerable properties from the `args` object are inherited to this bus.
     *
     * @param {IBusArgs} args Arguments object
     * @param {string} args.name The name for the bus
     * @throws When required arguments are missing.
     */
    constructor(args: IBusArgs) {
        _.assign(this, args);
        if (!this.name) {
            throw new Error('A valid "name" argument must be provided.');
        }
    }

    /**
     * Subscribe the given actor to the bus.
     * After this, the given actor can be unsubscribed from the bus by calling {@link Bus#unsubscribe}.
     *
     * An actor that is subscribed multiple times will exist that amount of times in the bus.
     *
     * @param {A} actor The actor to subscribe.
     */
    public subscribe(actor: A) {
        this.actors.push(actor);
    }

    /**
     * Unsubscribe the given actor from the bus.
     *
     * An actor that is subscribed multiple times will be unsubscribed only once.
     *
     * @param {A} actor The actor to unsubscribe
     * @return {boolean} If the given actor was successfully unsubscribed,
     *         otherwise it was not subscribed before.
     */
    public unsubscribe(actor: A) {
        const index: number = this.actors.indexOf(actor);
        if (index >= 0) {
            this.actors.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Publish an action to all actors in the bus to test if they can run the action.
     *
     * @param {I} action An action to publish
     * @return {IActorReply<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest,
     *         O extends IActorOutput>[]}
     *         An array of reply objects. Each object contains a reference to the actor,
     *         and a promise to its {@link Actor#test} result.
     */
    public publish(action: I): IActorReply<A, I, T, O>[] {
        return this.actors.map((actor: A) => {
            return { actor, reply: actor.test(action) };
        });
    }

}

export interface IBusArgs {
    name: string;
}

/**
 * Data interface for holding an actor and a promise to a reply from that actor.
 */
export interface IActorReply<A extends Actor<I, T, O>,
    I extends IAction, T extends IActorTest, O extends IActorOutput> {
    actor: A;
    reply: Promise<T>;
}
