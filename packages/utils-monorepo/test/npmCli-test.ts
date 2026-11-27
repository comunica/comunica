import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { createInterface } from 'node:readline';
import {
  assertNpmStageSupport,
  getPublicPackages,
  isOtpError,
  isRateLimitError,
  listStaged,
  npmErrorMessage,
  parseConcurrency,
  promptTerminal,
  RateLimitBackoff,
  runNpm,
  sleep,
} from '../lib/npmCli';

jest.mock<typeof import('node:child_process')>('node:child_process', () => <any> ({ spawn: jest.fn() }));
jest.mock<typeof import('node:readline')>('node:readline', () => <any> ({
  createInterface: jest.fn(),
}));
jest.mock<{ getPackages: () => Promise<any> }>('@manypkg/get-packages', () => ({
  getPackages: jest.fn(async() => ({
    packages: [
      { dir: '/repo/packages/a', packageJson: { name: '@comunica/a', version: '1.0.0' }},
      { dir: '/repo/packages/private', packageJson: { name: '@comunica/private', version: '1.0.0', private: true }},
    ],
  })),
}));

const EOTP = 'npm error code EOTP\nnpm error This operation requires a one-time password.\n';
const E429 = 'npm error code E429\nnpm error 429 Too Many Requests - POST https://registry.npmjs.org/-/stage/package/x\n';

describe('npmCli', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('npmErrorMessage', () => {
    it('should join npm error lines without the log file line', () => {
      const stderr = 'npm warn x\nnpm error code E404\nnpm error Not found\n' +
        'npm error A complete log of this run can be found in: x\n';
      expect(npmErrorMessage(stderr)).toBe('code E404 Not found');
    });

    it('should fall back to the full stderr', () => {
      expect(npmErrorMessage('  something broke \n')).toBe('something broke');
    });
  });

  describe('isRateLimitError', () => {
    it('should detect rate limiting', () => {
      expect(isRateLimitError(E429)).toBe(true);
      expect(isRateLimitError('Could not authenticate x: rate limited otp')).toBe(true);
      expect(isRateLimitError(EOTP)).toBe(false);
    });
  });

  describe('isOtpError', () => {
    it('should detect OTP errors', () => {
      expect(isOtpError(EOTP)).toBe(true);
      expect(isOtpError('npm error code E401\nnpm error This operation requires a one-time password')).toBe(true);
      expect(isOtpError(E429)).toBe(false);
    });
  });

  describe('parseConcurrency', () => {
    it('should accept positive integers', () => {
      expect(parseConcurrency('8')).toBe(8);
    });

    it('should reject other values', () => {
      expect(() => parseConcurrency('0')).toThrow('--concurrency must be a positive integer, but got "0"');
      expect(() => parseConcurrency('1.5')).toThrow('--concurrency must be a positive integer, but got "1.5"');
    });
  });

  describe('runNpm', () => {
    let child: any;

    beforeEach(() => {
      child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      jest.mocked(spawn).mockReturnValue(child);
    });

    it('should capture the output of npm without stdin', async() => {
      const result = runNpm([ 'stage', 'publish' ], '/repo/packages/a');
      child.stdout.emit('data', 'out1');
      child.stdout.emit('data', 'out2');
      child.stderr.emit('data', 'err');
      child.emit('close', 1);
      await expect(result).resolves.toEqual({ code: 1, stdout: 'out1out2', stderr: 'err' });
      expect(spawn).toHaveBeenCalledWith(
        'npm',
        [ 'stage', 'publish' ],
        { cwd: '/repo/packages/a', stdio: [ 'ignore', 'pipe', 'pipe' ]},
      );
    });

    it('should reject when npm cannot be started', async() => {
      const result = runNpm([ '--version' ]);
      child.emit('error', new Error('spawn npm ENOENT'));
      await expect(result).rejects.toThrow('spawn npm ENOENT');
    });
  });

  describe('promptTerminal', () => {
    let readline: any;

    beforeEach(() => {
      readline = Object.assign(new EventEmitter(), {
        question: jest.fn(),
        close: jest.fn(() => readline.emit('close')),
      });
      jest.mocked(createInterface).mockReturnValue(readline);
    });

    it('should return the trimmed answer and close the interface', async() => {
      readline.question
        .mockImplementation((question: string, callback: (answer: string) => void) => callback(' 123456 '));
      await expect(promptTerminal('Enter OTP: ')).resolves.toBe('123456');
      expect(readline.question).toHaveBeenCalledWith('Enter OTP: ', expect.any(Function));
      expect(readline.close).toHaveBeenCalledTimes(1);
    });

    it('should reject when the interface closes before an answer', async() => {
      const answer = promptTerminal('Enter OTP: ');
      readline.close();
      await expect(answer).rejects.toThrow('Aborted');
    });
  });

  describe('sleep', () => {
    it('should resolve after the given time', async() => {
      jest.useFakeTimers();
      const done = jest.fn();
      const promise = sleep(1000).then(done);
      await jest.advanceTimersByTimeAsync(999);
      expect(done).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1);
      await promise;
      expect(done).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });
  });

  describe('assertNpmStageSupport', () => {
    it('should accept npm versions with npm stage', async() => {
      await expect(assertNpmStageSupport(async() => ({ code: 0, stdout: '11.15.0\n', stderr: '' })))
        .resolves.toBeUndefined();
    });

    it('should reject older npm versions', async() => {
      await expect(assertNpmStageSupport(async() => ({ code: 0, stdout: '11.14.9\n', stderr: '' }))).rejects
        .toThrow('npm stage requires npm 11.15.0 or later, but found "11.14.9"');
    });

    it('should reject when the npm version cannot be determined', async() => {
      await expect(assertNpmStageSupport(async() => ({ code: 1, stdout: '', stderr: 'not found' }))).rejects
        .toThrow('but found ""');
    });
  });

  describe('getPublicPackages', () => {
    it('should return the non-private packages', async() => {
      await expect(getPublicPackages('/repo')).resolves.toEqual([
        { name: '@comunica/a', version: '1.0.0', dir: '/repo/packages/a' },
      ]);
    });
  });

  describe('listStaged', () => {
    it('should parse the staged versions', async() => {
      const list = [{ id: 'x', packageName: '@comunica/a', version: '1.0.0', status: 'pending' }];
      const npm = jest.fn(async() => ({ code: 0, stdout: JSON.stringify(list), stderr: '' }));
      await expect(listStaged(npm)).resolves.toEqual(list);
      expect(npm).toHaveBeenCalledWith([ 'stage', 'list', '--json' ]);
    });

    it('should throw when npm fails', async() => {
      const npm = async(): Promise<any> => ({
        code: 1,
        stdout: '',
        stderr: 'npm error code E401\nnpm error Unauthorized\n',
      });
      await expect(listStaged(npm)).rejects.toThrow('Failed to list staged versions: code E401 Unauthorized');
    });
  });

  describe('RateLimitBackoff', () => {
    let clock: number;
    let wait: jest.Mock;
    let backoff: RateLimitBackoff;

    beforeEach(() => {
      clock = 0;
      wait = jest.fn(async(ms: number) => {
        clock += ms;
      });
      backoff = new RateLimitBackoff(1000, 3000, wait, () => clock);
    });

    it('should not wait without rate limits', async() => {
      await backoff.waitIfPaused();
      expect(wait).not.toHaveBeenCalled();
    });

    it('should pause once for parallel rate limits', async() => {
      expect(backoff.hit()).toBe(1000);
      clock += 200;
      expect(backoff.hit()).toBeUndefined();
      await backoff.waitIfPaused();
      expect(wait).toHaveBeenCalledWith(800);
      expect(clock).toBe(1000);
    });

    it('should double the pause up to the maximum on consecutive rate limits', async() => {
      expect(backoff.hit()).toBe(1000);
      await backoff.waitIfPaused();
      expect(backoff.hit()).toBe(2000);
      await backoff.waitIfPaused();
      expect(backoff.hit()).toBe(3000);
      await backoff.waitIfPaused();
      expect(backoff.hit()).toBe(3000);
    });

    it('should reset the pause after a success', async() => {
      expect(backoff.hit()).toBe(1000);
      await backoff.waitIfPaused();
      backoff.success();
      expect(backoff.hit()).toBe(1000);
    });

    it('should not reset the pause for a success during a pause', async() => {
      expect(backoff.hit()).toBe(1000);
      backoff.success();
      await backoff.waitIfPaused();
      expect(backoff.hit()).toBe(2000);
    });
  });
});
