import { ActorHttp, IActionHttp } from "@comunica/bus-http";
import { ActionContext, Bus } from "@comunica/core";
import { ActorHttpMemento, KEY_CONTEXT_DATETIME } from "../lib/ActorHttpMemento";

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
        const requestUrl: string = action.input instanceof Request ? 
                                  (<Request> action.input).url : <string> action.input;
        const requestHeaders: Headers = action.init ? new Headers(action.init.headers) : new Headers();

        const headers = new Headers();
        let status = 200;
        let bodyText;

        switch (requestUrl) {
        case "http://example.com/or":
          headers.set('link', '<http://example.com/tg/http%3A%2F%2Fexample.com%2For>; rel="timegate"');
          bodyText = 'original';
          break;
      
        case "http://example.com/or2":
          headers.set('link', '<http://example.com/tg/http%3A%2F%2Fexample.com%2For>; rel="something"');
          bodyText = 'nolink';
          break;

        case "http://example.com/tg/http%3A%2F%2Fexample.com%2For":
        
          if (requestHeaders.has("accept-datetime") && 
          new Date(requestHeaders.get("accept-datetime")) > new Date(2018, 6)) {
            bodyText = 'memento1';
            headers.set('memento-datetime', new Date(2018, 7).toUTCString());
            headers.set('content-location', 'http://example.com/m1/http%3A%2F%2Fexample.com%2For');
          } else {
            bodyText = 'memento2';
            headers.set('memento-datetime', new Date(2018, 1).toUTCString());
            headers.set('content-location', 'http://example.com/m2/http%3A%2F%2Fexample.com%2For');
          }
          break;
        
        case "http://example.com/m1/http%3A%2F%2Fexample.com%2For":
          bodyText = 'memento1';
          headers.set('memento-datetime', new Date(2018, 7).toUTCString());
          break;

        case "http://example.com/m2/http%3A%2F%2Fexample.com%2For":
          bodyText = 'memento2';
          headers.set('memento-datetime', new Date(2018, 1).toUTCString());
          break;
          
        default:
          status = 404;

        }

        return Promise.resolve({
          body: {
            getReader() {
              return {
                read() {
                  return bodyText;
                },
              };
            },
            cancel() {
              return;
            },
          },
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
        context: ActionContext({ [KEY_CONTEXT_DATETIME]: new Date() }),
        input: new Request('https://www.google.com/'),
      };
      return expect(actor.test(action)).resolves.toEqual(true);
    });

    it('should test with empty headers', () => {
      const action: IActionHttp = {
        context: ActionContext({ [KEY_CONTEXT_DATETIME]: new Date() }),
        init: { headers: new Headers()}, 
        input: new Request('https://www.google.com/'), 
      };
      return expect(actor.test(action)).resolves.toBeTruthy();
    });

    it('should not test without datetime', () => {
      const action: IActionHttp = { input: new Request('https://www.google.com/') };
      return expect(actor.test(action)).rejects.toBeTruthy();
    });

    it('should test without init', () => {
      const action: IActionHttp = {
        context: ActionContext({ [KEY_CONTEXT_DATETIME]: new Date() }),
        init: {}, 
        input: new Request('https://www.google.com/'), 
      };
      return expect(actor.test(action)).resolves.toBeTruthy();
    });

    it('should not test with Accept-Datetime header', () => {
      const action: IActionHttp = { 
        context: ActionContext({ [KEY_CONTEXT_DATETIME]: new Date() }),
        init: { headers: new Headers({ 'Accept-Datetime': new Date().toUTCString() })}, 
        input: new Request('https://www.google.com/'), 
      };
      return expect(actor.test(action)).rejects.toMatchObject(new Error('The request already has a set datetime.'));
    });

    it('should run with new memento', async () => {
      const action: IActionHttp = {
        context: ActionContext({ [KEY_CONTEXT_DATETIME]: new Date() }),
        input: new Request('http://example.com/or'),
      };
      const result = await actor.run(action);
      expect(result.status).toEqual(200);

      const body = result.body;
      expect(body.getReader().read()).toEqual("memento1");
      return;
    });

    it('should run with old memento', async () => {
      const action: IActionHttp = {
        context: ActionContext({ [KEY_CONTEXT_DATETIME]: new Date(2018, 1) }),
        input: new Request('http://example.com/or'),
      };

      const result = await actor.run(action);
      expect(result.status).toEqual(200);

      const body = result.body;
      expect(body.getReader().read()).toEqual("memento2");
      return;
    });

    it('should not follow other link header', async () => {
      const action: IActionHttp = {
        context: ActionContext({ [KEY_CONTEXT_DATETIME]: new Date(2018, 1) }),
        input: new Request('http://example.com/or2'),
      };

      const result = await actor.run(action);
      expect(result.status).toEqual(200);

      const body = result.body;
      expect(body.getReader().read()).toEqual("nolink");
      return;
    });

    it('should proxy request when memento', async () => {
      const action: IActionHttp = { 
        init: { headers: new Headers({ 'Accept-Datetime': new Date().toUTCString() })}, 
        input: new Request('http://example.com/m1/http%3A%2F%2Fexample.com%2For'), 
      };

      const result = await actor.run(action);
      expect(result.status).toEqual(200);

      const body = result.body;
      expect(body.getReader().read()).toEqual("memento1");
      return;
    });
  });
});
