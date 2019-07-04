import * as querystring from "querystring";
import {newEngineDynamic} from "../__mocks__/index";
import {HttpServiceSparqlEndpoint} from "../lib/HttpServiceSparqlEndpoint";
const stringToStream = require('streamify-string');

jest.mock('../index', () => {
  return {
    newEngineDynamic,
  };
});

describe('HttpServiceSparqlEndpoint', () => {
  describe('An HttpServiceSparqlEndpoint instance', () => {
    describe('The parseBody method', () => {
      it('should reject if the stream emits an error', async () => {
        const instance = new HttpServiceSparqlEndpoint({});
        const httpRequestMock = stringToStream("helloworld");
        httpRequestMock.headers = {'content-type': "contenttypewhichdefinitelydoesnotexist"};
        httpRequestMock._read = () => httpRequestMock.emit('error', new Error('error'));

        return expect(instance.parseBody(httpRequestMock)).rejects.toBeTruthy();
      });

      it('should set encoding of the request to utf8', async () => {
        const instance = new HttpServiceSparqlEndpoint({});
        const httpRequestMock = stringToStream("anystring");
        httpRequestMock.headers = {'content-type': "acontenttypethatdefinitelydoesnotexist"};
        httpRequestMock.setEncoding(null);

        instance.parseBody(httpRequestMock);
        return expect(httpRequestMock._readableState.encoding).toEqual('utf8');
      });

      // tslint:disable-next-line:max-line-length
      it('should return the empty string if the query is invalid and the content-type is application/x-www-form-urlencoded',
          async () => {
            const instance = new HttpServiceSparqlEndpoint({});
            const exampleQueryString = "invalidquery";
            const httpRequestMock = stringToStream(exampleQueryString);
            httpRequestMock.headers = {'content-type': "application/x-www-form-urlencoded"};

            return expect(instance.parseBody(httpRequestMock))
            .resolves.toBe('');
          });

      it('should parse query from url if the content-type is application/x-www-form-urlencoded', async () => {
        const instance = new HttpServiceSparqlEndpoint({});
        const exampleQueryString = "query=SELECT%20*%20WHERE%20%7B%3Fs%20%3Fp%20%3Fo%7D";
        const httpRequestMock = stringToStream(exampleQueryString);
        httpRequestMock.headers = {'content-type': "application/x-www-form-urlencoded"};

        return expect(instance.parseBody(httpRequestMock))
            .resolves.toBe(querystring.parse(exampleQueryString).query);
      });

      it('should return input body if content-type is not application/[sparql-query|x-www-form-urlencoded]',
          async () => {
            const instance = new HttpServiceSparqlEndpoint({});
            const bodyString = "Real world request body";
            const httpRequestMock = stringToStream(bodyString);
            httpRequestMock.headers = {'content-type': "acontenttypethatdefinitelydoesnotexist"};

            return expect(instance.parseBody(httpRequestMock)).resolves.toBe(bodyString);
          });

      it('should return input body if content-type is application/sparql-query', async () => {
        const instance = new HttpServiceSparqlEndpoint({});
        const bodyString = "Real world request body";
        const httpRequestMock = stringToStream(bodyString);
        httpRequestMock.headers = {'content-type': "application/sparql-query"};

        return expect(instance.parseBody(httpRequestMock)).resolves.toBe(bodyString);
      });
    });
  });
});
