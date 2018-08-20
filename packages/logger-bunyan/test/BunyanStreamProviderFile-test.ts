import {URL} from "url";
import {BunyanStreamProviderFile} from "../lib/stream/BunyanStreamProviderFile";

describe('BunyanStreamProviderFile', () => {
  it('should create a file stream', () => {
    const myProvider = new BunyanStreamProviderFile({ name: 'bla', level: 'warn', path: 'file:////abc' });
    expect(myProvider.createStream()).toEqual(
      { type: 'file', name: 'bla', path: new URL('file:////abc'), level: 'warn' });
  });
});
