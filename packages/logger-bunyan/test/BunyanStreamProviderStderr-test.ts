import {BunyanStreamProviderStderr} from "../lib/stream/BunyanStreamProviderStderr";

describe('BunyanStreamProviderStderr', () => {
  it('should create a stderr stream', () => {
    const myProvider = new BunyanStreamProviderStderr({ name: 'bla', level: 'warn' });
    expect(myProvider.createStream()).toEqual({ name: 'bla', stream: process.stderr, level: 'warn' });
  });
});
