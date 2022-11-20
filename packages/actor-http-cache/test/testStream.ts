/* istanbul ignore file */
import { ActorHttp } from '@comunica/bus-http';

/**
 * A utility to handle the asynchronous testing of streams
 */
type ExpectStreamToYeildFunction = (stream: ReadableStream | undefined, value: string) => void;
type TestExecutable = (expectStringToYeild: ExpectStreamToYeildFunction) => Promise<void>;

export function testStream(testExecutable: TestExecutable): Promise<void> {
  return new Promise(async(resolve, reject) => {
    let outstandingStreams = 0;
    let completedExecutable = false;

    function checkIfIsComplete() {
      if (outstandingStreams < 1 && completedExecutable) {
        resolve();
      }
    }

    function expectStreamToYeild(stream: ReadableStream | undefined, value: string): void {
      try {
        outstandingStreams++;
        expect(stream).toBeDefined();
        // Convert the "WebStream" to a NodeStream
        const nodeStream = ActorHttp.toNodeReadable(stream!);
        let finalValue = '';
        nodeStream.on('data', data => {
          finalValue += new TextDecoder().decode(data);
        });
        nodeStream.on('end', () => {
          try {
            expect(finalValue).toBe(value);
          } catch (error: unknown) {
            reject(error);
          }
          outstandingStreams--;
          checkIfIsComplete();
        });
      } catch (error: unknown) {
        reject(error);
      }
    }

    await testExecutable(expectStreamToYeild);
    completedExecutable = true;
    checkIfIsComplete();
  });
}
