import {BunyanStreamProviderStdout} from "../lib/stream/BunyanStreamProviderStdout";

describe('BunyanStreamProviderStdout', () => {
  it('should create a stdout stream', () => {
    const myProvider = new BunyanStreamProviderStdout({ name: 'bla', level: 'warn' });
    expect(myProvider.createStream()).toEqual({ name: 'bla', stream: process.stdout, level: 'warn' });
  });
});
