import {ActorInitSparql} from "..";
import {newEngineDynamic} from "../__mocks__/index";
import {HttpServiceSparqlEndpoint} from "../lib/HttpServiceSparqlEndpoint";
const stringToStream = require('streamify-string');

jest.mock('../index', () => {
  return {
    newEngineDynamic,
  };
});

describe('ActorInitSparql', () => {
  let testVariable;
  beforeEach(() => {
    testVariable = 10;
  });

  describe('A test describe', () => {
    const testVariable2 = 20;
    let testVariable3;
    beforeEach(() => {
      testVariable3 = 30;
    });

    it('should test', () => {
      expect(testVariable).toEqual(10);
      expect(testVariable2).toEqual(20);
      expect(testVariable3).toEqual(30);
    });

    it('should return input body if content-type is not application/[sparql-query|x-www-form-urlencoded]', async () => {
      const instance = new HttpServiceSparqlEndpoint({});
      const bodyString = "Real world request body";
      const httpRequestMock = stringToStream(bodyString);
      httpRequestMock.headers = {'content-type': "acontenttypethatdefinitelydoesnotexist"};

      return expect(instance.parseBody(httpRequestMock)).resolves.toBe(bodyString);
    });
  });
});
