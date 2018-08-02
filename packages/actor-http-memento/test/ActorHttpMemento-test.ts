import { ActorHttp, IActionHttp } from "@comunica/bus-http";
import { ActionContext, Bus } from "@comunica/core";
import { ActorHttpMemento } from "../lib/ActorHttpMemento";

describe('ActorHttpMemento', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorHttpMemento module', () => {
    it('should be a function', () => {
      expect(ActorHttpMemento).toBeInstanceOf(Function);
    });

    it('should be a ActorHttpMemento constructor', () => {
      expect(new (<any> ActorHttpMemento)({ name: 'actor', bus })).toBeInstanceOf(ActorHttpMemento);
      expect(new (<any> ActorHttpMemento)({ name: 'actor', bus })).toBeInstanceOf(ActorHttp);
    });

    it('should not be able to create new ActorHttpMemento objects without \'new\'', () => {
      expect(() => { (<any> ActorHttpMemento)(); }).toThrow();
    });
  });

  describe('An ActorHttpMemento instance', () => {
    let actor: ActorHttpMemento;

    const mediatorHttp: any = {
      mediate: (action: IActionHttp) => {
        // tslint:disable: no-trailing-whitespace
        const requestUrl: string = action.input.url ? action.input.url : <string> action.input;
        const requestHeaders: Headers = action.init ? new Headers(action.init.headers) : new Headers();

        const headers = new Headers();
        let status = 200;
        let body;

        switch (requestUrl) {
        case "http://example.com/or":
          headers.set('link', '<http://example.com/tg/http%3A%2F%2Fexample.com%2For>; rel="timegate"');
          body = 'original';
          break;
      
        case "http://example.com/tg/http%3A%2F%2Fexample.com%2For":
        
          if (requestHeaders.has("accept-datetime") && 
          new Date(requestHeaders.get("accept-datetime")) > new Date(2018, 6)) {
            body = 'memento1';
            headers.set('memento-datetime', new Date(2018, 7).toUTCString());
          } else {
            body = 'memento2';
            headers.set('memento-datetime', new Date(2018, 1).toUTCString());
          }
          break;

        default:
          status = 404;

        }

        return Promise.resolve({
          body,
          headers,
          ok: true,
          status,
        });
      },
    };

    beforeEach(() => {
      actor = new ActorHttpMemento({ name: 'actor', bus, mediatorHttp });
    });

    it('should test', () => {
      const action: IActionHttp = {
        context: ActionContext({ datetime: new Date() }),
        input: new Request('https://www.google.com/'),
      };
      return expect(actor.test(action)).resolves.toEqual(true);
    });

    it('should not test without datetime', () => {
      const action: IActionHttp = { input: new Request('https://www.google.com/') };
      return expect(actor.test(action)).rejects.toBeTruthy();
    });

    it('should run with new memento', () => {
      const action: IActionHttp = {
        context: ActionContext({ datetime: new Date() }),
        input: new Request('http://example.com/or'),
      };

      return expect(actor.run(action)).resolves
        .toMatchObject({ status: 200, body: "memento1" });
    });

    it('should run with old memento', () => {
      const action: IActionHttp = {
        context: ActionContext({ datetime: new Date(2018, 1) }),
        input: new Request('http://example.com/or'),
      };

      return expect(actor.run(action)).resolves
        .toMatchObject({ status: 200, body: "memento2" });
    });
  });
});
