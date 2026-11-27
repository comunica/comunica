import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { createInterface } from 'node:readline';
import type { IApproveStagedOptions } from '../lib/approveStaged';
import { approveStaged, approveStagedCli, MAX_OTP_ATTEMPTS } from '../lib/approveStaged';
import type { INpmResult, IStagedVersion } from '../lib/npmCli';
import { RateLimitBackoff } from '../lib/npmCli';

jest.mock<typeof import('node:child_process')>('node:child_process', () => <any> ({ spawn: jest.fn() }));
jest.mock<typeof import('node:readline')>('node:readline', () => <any> ({
  createInterface: jest.fn(),
}));
jest.mock<{ getPackages: () => Promise<any> }>('@manypkg/get-packages', () => ({
  getPackages: jest.fn(async() => ({
    packages: [
      { dir: '/repo/packages/a', packageJson: { name: '@comunica/a', version: '1.0.0' }},
      { dir: '/repo/packages/b', packageJson: { name: '@comunica/b', version: '1.0.0' }},
      { dir: '/repo/packages/private', packageJson: { name: '@comunica/private', version: '1.0.0', private: true }},
    ],
  })),
}));

const OK: INpmResult = { code: 0, stdout: '', stderr: '' };
const EOTP: INpmResult = {
  code: 1,
  stdout: '',
  stderr: 'npm error code EOTP\nnpm error This operation requires a one-time password.\n',
};
const E429: INpmResult = { code: 1, stdout: '', stderr: 'npm error code E429\nnpm error 429 Too Many Requests\n' };
const E404: INpmResult = { code: 1, stdout: '', stderr: 'npm error code E404\nnpm error Not found\n' };

function staged(packageName: string, version = '1.0.0'): IStagedVersion {
  return { id: `id-${packageName}-${version}`, packageName, version, status: 'pending' };
}

/**
 * Create a fake npm runner.
 * @param list The staged versions that `npm stage list` returns.
 * @param approve Called for each `npm stage approve`, with the stage id and the OTP.
 */
function fakeNpm(
  list: IStagedVersion[],
  approve: (id: string, otp: string) => INpmResult | Promise<INpmResult> = () => OK,
): jest.Mock<Promise<INpmResult>, [string[]]> {
  return jest.fn(async(args: string[]) => {
    if (args[0] === '--version') {
      return { code: 0, stdout: '11.15.0\n', stderr: '' };
    }
    if (args[1] === 'list') {
      return { code: 0, stdout: JSON.stringify(list), stderr: '' };
    }
    return approve(args[2], args[3].slice('--otp='.length));
  });
}

describe('approveStaged', () => {
  let log: jest.Mock;
  let prompt: jest.Mock;
  let clock: number;
  let wait: jest.Mock;

  function options(npm: IApproveStagedOptions['npm'], overrides: Partial<IApproveStagedOptions> = {}):
  IApproveStagedOptions {
    const backoff = new RateLimitBackoff(1000, 4000, wait, () => clock);
    return { cwd: '/repo', concurrency: 1, yes: true, npm, prompt, log, backoff, ...overrides };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    log = jest.fn();
    prompt = jest.fn(async() => '111111');
    clock = 0;
    // Advance the fake clock on a later tick, like a real timer, so parallel requests see the same time.
    wait = jest.fn((ms: number) => {
      const target = clock + ms;
      return new Promise<void>(resolve => setImmediate(() => {
        clock = Math.max(clock, target);
        resolve();
      }));
    });
  });

  describe('approveStaged', () => {
    it('should reject npm versions without npm stage', async() => {
      const npm = jest.fn(async() => ({ code: 0, stdout: '11.14.9\n', stderr: '' }));
      await expect(approveStaged(options(npm))).rejects.toThrow('npm stage requires npm 11.15.0 or later');
    });

    it('should do nothing without staged versions of monorepo packages', async() => {
      const npm = fakeNpm([ staged('other'), staged('@comunica/private') ]);
      await expect(approveStaged(options(npm))).resolves.toBe(true);
      expect(log).toHaveBeenCalledWith('No staged versions found for the packages in this monorepo.');
      expect(npm).toHaveBeenCalledTimes(2);
    });

    it('should throw when multiple versions are staged', async() => {
      const npm = fakeNpm([ staged('@comunica/a', '1.0.0'), staged('@comunica/b', '2.0.0') ]);
      await expect(approveStaged(options(npm))).rejects
        .toThrow('Found staged versions for multiple versions (1.0.0, 2.0.0). Pick one with --version.');
    });

    it('should only approve the given version', async() => {
      const npm = fakeNpm([ staged('@comunica/a', '1.0.0'), staged('@comunica/b', '2.0.0') ]);
      await expect(approveStaged(options(npm, { version: '2.0.0' }))).resolves.toBe(true);
      expect(npm).toHaveBeenCalledWith([ 'stage', 'approve', 'id-@comunica/b-2.0.0', '--otp=111111' ]);
      expect(npm).not.toHaveBeenCalledWith(expect.arrayContaining([ 'id-@comunica/a-1.0.0' ]));
    });

    it('should approve all staged versions with one OTP', async() => {
      const npm = fakeNpm([ staged('@comunica/a'), { ...staged('@comunica/b'), status: undefined }]);
      await expect(approveStaged(options(npm))).resolves.toBe(true);
      expect(log).toHaveBeenCalledWith('Found 2 staged packages at version 1.0.0 (status: 1 pending, 1 unknown).');
      expect(log).toHaveBeenCalledWith('[1/2] Approved @comunica/a@1.0.0');
      expect(log).toHaveBeenCalledWith('[2/2] Approved @comunica/b@1.0.0');
      expect(log).toHaveBeenLastCalledWith('Approved 2 of 2 staged versions.');
      expect(prompt).toHaveBeenCalledTimes(1);
      expect(prompt).toHaveBeenCalledWith('Enter OTP: ');
    });

    it('should approve after confirmation', async() => {
      prompt.mockResolvedValueOnce('y');
      const npm = fakeNpm([ staged('@comunica/a'), staged('@comunica/b') ]);
      await expect(approveStaged(options(npm, { yes: false }))).resolves.toBe(true);
      expect(log).toHaveBeenCalledWith('Found 2 staged packages at version 1.0.0 (status: 2 pending).');
      expect(prompt).toHaveBeenNthCalledWith(1, 'Approve all 2? [y/N] ');
      expect(log).toHaveBeenLastCalledWith('Approved 2 of 2 staged versions.');
    });

    it('should abort without confirmation', async() => {
      prompt.mockResolvedValueOnce('');
      const npm = fakeNpm([ staged('@comunica/a') ]);
      await expect(approveStaged(options(npm, { yes: false }))).resolves.toBe(true);
      expect(log).toHaveBeenLastCalledWith('Aborted.');
      expect(npm).toHaveBeenCalledTimes(2);
    });

    it('should ask for a new OTP once when parallel approvals fail with an expired OTP', async() => {
      prompt.mockResolvedValueOnce('111111').mockResolvedValueOnce('222222');
      const npm = fakeNpm(
        [ staged('@comunica/a'), staged('@comunica/b') ],
        (id, otp) => otp === '222222' ? OK : EOTP,
      );
      await expect(approveStaged(options(npm, { concurrency: 2 }))).resolves.toBe(true);
      expect(prompt).toHaveBeenCalledTimes(2);
      expect(prompt).toHaveBeenNthCalledWith(2, 'The OTP was rejected or expired. Enter a new OTP: ');
      expect(log).toHaveBeenLastCalledWith('Approved 2 of 2 staged versions.');
    });

    it('should reuse an OTP that was renewed while an approval was running', async() => {
      prompt.mockResolvedValueOnce('111111').mockResolvedValueOnce('222222');
      let releaseSlow: () => void;
      const slow = new Promise<void>((resolve) => {
        releaseSlow = resolve;
      });
      const npm = fakeNpm(
        [ staged('@comunica/a'), staged('@comunica/b') ],
        async(id, otp) => {
          if (otp === '222222') {
            // The first renewal happened, so the slow approval with the old OTP can now fail.
            releaseSlow();
            return OK;
          }
          if (id === 'id-@comunica/b-1.0.0') {
            await slow;
          }
          return EOTP;
        },
      );
      await expect(approveStaged(options(npm, { concurrency: 2 }))).resolves.toBe(true);
      expect(prompt).toHaveBeenCalledTimes(2);
      expect(log).toHaveBeenLastCalledWith('Approved 2 of 2 staged versions.');
    });

    it('should give up on a version after repeated OTP errors', async() => {
      const npm = fakeNpm([ staged('@comunica/a') ], () => EOTP);
      await expect(approveStaged(options(npm))).resolves.toBe(false);
      expect(npm).toHaveBeenCalledTimes(2 + MAX_OTP_ATTEMPTS);
      expect(log).toHaveBeenLastCalledWith(`Failed to approve 1:
  @comunica/a@1.0.0: code EOTP This operation requires a one-time password.`);
    });

    it('should continue after other errors', async() => {
      const npm = fakeNpm(
        [ staged('@comunica/a'), staged('@comunica/b') ],
        id => id === 'id-@comunica/a-1.0.0' ? E404 : OK,
      );
      await expect(approveStaged(options(npm))).resolves.toBe(false);
      expect(log).toHaveBeenCalledWith('[1/2] Approved @comunica/b@1.0.0');
      expect(log).toHaveBeenCalledWith('Approved 1 of 2 staged versions.');
      expect(log).toHaveBeenLastCalledWith(`Failed to approve 1:
  @comunica/a@1.0.0: code E404 Not found`);
    });

    it('should wait and retry when rate limited', async() => {
      let calls = 0;
      const npm = fakeNpm([ staged('@comunica/a'), staged('@comunica/b') ], () => ++calls === 1 ? E429 : OK);
      await expect(approveStaged(options(npm))).resolves.toBe(true);
      expect(log).toHaveBeenCalledWith('npm is rate limiting, so waiting 1s before continuing (0/2 approved).');
      expect(wait).toHaveBeenCalledWith(1000);
      expect(log).toHaveBeenLastCalledWith('Approved 2 of 2 staged versions.');
    });

    it('should pause once when parallel approvals are rate limited', async() => {
      let calls = 0;
      const npm = fakeNpm([ staged('@comunica/a'), staged('@comunica/b') ], () => ++calls <= 2 ? E429 : OK);
      await expect(approveStaged(options(npm, { concurrency: 2 }))).resolves.toBe(true);
      expect(log.mock.calls.filter(([ message ]) => message.startsWith('npm is rate limiting'))).toHaveLength(1);
      expect(log).toHaveBeenLastCalledWith('Approved 2 of 2 staged versions.');
    });

    it('should not count rate limits as OTP attempts', async() => {
      let calls = 0;
      const npm = fakeNpm([ staged('@comunica/a') ], () => ++calls <= MAX_OTP_ATTEMPTS ? E429 : OK);
      await expect(approveStaged(options(npm))).resolves.toBe(true);
      expect(prompt).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenLastCalledWith('Approved 1 of 1 staged versions.');
    });
  });

  describe('approveStagedCli', () => {
    let consoleLog: jest.SpyInstance;

    beforeEach(() => {
      consoleLog = jest.spyOn(console, 'log').mockImplementation();
      jest.mocked(spawn).mockImplementation(<any> ((command: string, args: string[]) => {
        const child: any = new EventEmitter();
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        setImmediate(() => {
          if (args[0] === '--version') {
            child.stdout.emit('data', '11.21.3');
          } else if (args[1] === 'list') {
            const list = [ staged('@comunica/a', '1.0.0'), staged('@comunica/a', '2.0.0') ];
            child.stdout.emit('data', JSON.stringify(list));
          }
          child.emit('close', 0);
        });
        return child;
      }));
      jest.mocked(createInterface).mockImplementation(() => {
        const readline: any = Object.assign(new EventEmitter(), {
          question: (question: string, callback: (answer: string) => void) => callback('123456'),
          close: () => readline.emit('close'),
        });
        return readline;
      });
    });

    afterEach(() => {
      consoleLog.mockRestore();
    });

    it('should approve with the given options', async() => {
      const argv = [ '--version', '2.0.0', '--yes', '--concurrency', '2' ];
      await expect(approveStagedCli(argv, '/repo')).resolves.toBe(true);
      expect(spawn)
        .toHaveBeenCalledWith('npm', [ 'stage', 'approve', 'id-@comunica/a-2.0.0', '--otp=123456' ], expect.anything());
      expect(consoleLog).toHaveBeenLastCalledWith('Approved 1 of 1 staged versions.');
    });

    it('should ask for confirmation by default', async() => {
      await expect(approveStagedCli([ '--version', '1.0.0' ], '/repo')).resolves.toBe(true);
      expect(consoleLog).toHaveBeenLastCalledWith('Aborted.');
    });

    it('should reject an invalid concurrency', async() => {
      await expect(approveStagedCli([ '--concurrency', '0' ], '/repo')).rejects
        .toThrow('--concurrency must be a positive integer, but got "0"');
    });

    it('should reject unknown options', async() => {
      await expect(approveStagedCli([ '--unknown' ], '/repo')).rejects.toThrow('Unknown option');
    });
  });
});
