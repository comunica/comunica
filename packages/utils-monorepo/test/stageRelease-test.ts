import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { createInterface } from 'node:readline';
import { readJson } from 'fs-extra';
import type { INpmResult, IStagedVersion } from '../lib/npmCli';
import { RateLimitBackoff } from '../lib/npmCli';
import type { IStageReleaseOptions } from '../lib/stageRelease';
import { isAlreadyStagedError, stageRelease, stageReleaseCli } from '../lib/stageRelease';

jest.mock<typeof import('node:child_process')>('node:child_process', () => <any> ({ spawn: jest.fn() }));
jest.mock<typeof import('node:readline')>('node:readline', () => <any> ({
  createInterface: jest.fn(),
}));
jest.mock<typeof import('fs-extra')>('fs-extra', () => <any> ({
  readJson: jest.fn(async() => ({ version: '1.0.0' })),
}));
jest.mock<{ getPackages: () => Promise<any> }>('@manypkg/get-packages', () => ({
  getPackages: jest.fn(async() => ({
    packages: [
      { dir: '/repo/packages/a', packageJson: { name: '@comunica/a', version: '1.0.0' }},
      { dir: '/repo/packages/b', packageJson: { name: '@comunica/b', version: '1.0.0' }},
      { dir: '/repo/packages/old', packageJson: { name: '@comunica/old', version: '0.9.0' }},
      { dir: '/repo/packages/private', packageJson: { name: '@comunica/private', version: '1.0.0', private: true }},
    ],
  })),
}));

const OK: INpmResult = { code: 0, stdout: '', stderr: '' };
const E429: INpmResult = {
  code: 1,
  stdout: '',
  stderr: 'npm error code E429\nnpm error 429 Too Many Requests - POST https://registry.npmjs.org/-/stage/package/x\n',
};
const E409: INpmResult = {
  code: 1,
  stdout: '',
  stderr: 'npm error code E409\nnpm error @comunica/a@1.0.0 is already staged\n',
};
const E500: INpmResult = { code: 1, stdout: '', stderr: 'npm error code E500\nnpm error Internal Server Error\n' };

function staged(packageName: string, version = '1.0.0'): IStagedVersion {
  return { id: `id-${packageName}`, packageName, version, status: 'pending' };
}

/**
 * Create a fake npm runner.
 * @param list The staged versions that `npm stage list` returns.
 * @param stage Called for each `npm stage publish`, with the package directory.
 */
function fakeNpm(
  list: IStagedVersion[],
  stage: (dir: string) => INpmResult | Promise<INpmResult> = () => OK,
): jest.Mock<Promise<INpmResult>, [string[], string?]> {
  return jest.fn(async(args: string[], cwd?: string) => {
    if (args[0] === '--version') {
      return { code: 0, stdout: '11.15.0\n', stderr: '' };
    }
    if (args[1] === 'list') {
      return { code: 0, stdout: JSON.stringify(list), stderr: '' };
    }
    return stage(cwd!);
  });
}

describe('stageRelease', () => {
  let log: jest.Mock;
  let prompt: jest.Mock;
  let clock: number;
  let wait: jest.Mock;

  function options(npm: IStageReleaseOptions['npm'], overrides: Partial<IStageReleaseOptions> = {}):
  IStageReleaseOptions {
    const backoff = new RateLimitBackoff(1000, 4000, wait, () => clock);
    return { cwd: '/repo', version: '1.0.0', concurrency: 1, yes: true, npm, prompt, log, backoff, ...overrides };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    log = jest.fn();
    prompt = jest.fn(async() => 'y');
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

  describe('isAlreadyStagedError', () => {
    it('should detect versions that are already staged or published', () => {
      expect(isAlreadyStagedError(E409.stderr)).toBe(true);
      const e403 = 'npm error code E403\nnpm error You cannot publish over the previously published versions: 1.0.0.';
      expect(isAlreadyStagedError(e403)).toBe(true);
      expect(isAlreadyStagedError(E429.stderr)).toBe(false);
      expect(isAlreadyStagedError(E500.stderr)).toBe(false);
    });
  });

  describe('stageRelease', () => {
    it('should reject npm versions without npm stage', async() => {
      const npm = jest.fn(async() => ({ code: 0, stdout: '11.14.9\n', stderr: '' }));
      await expect(stageRelease(options(npm))).rejects.toThrow('npm stage requires npm 11.15.0 or later');
    });

    it('should do nothing without packages at the version', async() => {
      const npm = fakeNpm([]);
      await expect(stageRelease(options(npm, { version: '9.9.9' }))).resolves.toBe(true);
      expect(log).toHaveBeenCalledWith('No packages found at version 9.9.9.');
      expect(npm).toHaveBeenCalledTimes(1);
    });

    it('should do nothing when all packages are already staged', async() => {
      const npm = fakeNpm([ staged('@comunica/a'), staged('@comunica/b') ]);
      await expect(stageRelease(options(npm))).resolves.toBe(true);
      expect(log).toHaveBeenLastCalledWith('Found 2 packages at version 1.0.0, of which 2 are already staged.');
      expect(npm).toHaveBeenCalledTimes(2);
    });

    it('should stage the public packages at the version in their directories', async() => {
      const npm = fakeNpm([ staged('@comunica/a', '0.1.0'), staged('other') ]);
      await expect(stageRelease(options(npm))).resolves.toBe(true);
      expect(log).toHaveBeenCalledWith('Found 2 packages at version 1.0.0.');
      expect(npm).toHaveBeenCalledWith([ 'stage', 'publish', '--workspaces=false' ], '/repo/packages/a');
      expect(npm).toHaveBeenCalledWith([ 'stage', 'publish', '--workspaces=false' ], '/repo/packages/b');
      expect(npm).toHaveBeenCalledTimes(4);
      expect(log).toHaveBeenCalledWith('[1/2] Staged @comunica/a@1.0.0');
      expect(log).toHaveBeenCalledWith('[2/2] Staged @comunica/b@1.0.0');
      expect(log).toHaveBeenLastCalledWith('Staged 2 of 2 packages.');
      expect(prompt).not.toHaveBeenCalled();
    });

    it('should skip packages that are already staged', async() => {
      const npm = fakeNpm([ staged('@comunica/a') ]);
      await expect(stageRelease(options(npm))).resolves.toBe(true);
      expect(log).toHaveBeenCalledWith('Found 2 packages at version 1.0.0, of which 1 are already staged.');
      expect(npm).not.toHaveBeenCalledWith([ 'stage', 'publish', '--workspaces=false' ], '/repo/packages/a');
      expect(log).toHaveBeenLastCalledWith('Staged 1 of 1 packages.');
    });

    it('should stage with a tag after confirmation', async() => {
      const npm = fakeNpm([]);
      await expect(stageRelease(options(npm, { tag: 'next', yes: false }))).resolves.toBe(true);
      expect(prompt).toHaveBeenCalledWith('Stage 2 with tag next? [y/N] ');
      expect(npm)
        .toHaveBeenCalledWith([ 'stage', 'publish', '--workspaces=false', '--tag', 'next' ], '/repo/packages/a');
      expect(log).toHaveBeenLastCalledWith('Staged 2 of 2 packages.');
    });

    it('should abort without confirmation', async() => {
      prompt.mockResolvedValueOnce('n');
      const npm = fakeNpm([]);
      await expect(stageRelease(options(npm, { yes: false }))).resolves.toBe(true);
      expect(prompt).toHaveBeenCalledWith('Stage 2? [y/N] ');
      expect(log).toHaveBeenLastCalledWith('Aborted.');
      expect(npm).toHaveBeenCalledTimes(2);
    });

    it('should wait and retry when rate limited', async() => {
      let calls = 0;
      const npm = fakeNpm([], () => ++calls === 1 ? E429 : OK);
      await expect(stageRelease(options(npm))).resolves.toBe(true);
      expect(log).toHaveBeenCalledWith('npm is rate limiting, so waiting 1s before continuing (0/2 staged).');
      expect(wait).toHaveBeenCalledWith(1000);
      expect(npm).toHaveBeenCalledTimes(5);
      expect(log).toHaveBeenLastCalledWith('Staged 2 of 2 packages.');
    });

    it('should pause once when parallel requests are rate limited', async() => {
      let calls = 0;
      const npm = fakeNpm([], () => ++calls <= 2 ? E429 : OK);
      await expect(stageRelease(options(npm, { concurrency: 2 }))).resolves.toBe(true);
      expect(log.mock.calls.filter(([ message ]) => message.startsWith('npm is rate limiting'))).toHaveLength(1);
      expect(log).toHaveBeenLastCalledWith('Staged 2 of 2 packages.');
    });

    it('should report versions that turn out to be staged or published already', async() => {
      const npm = fakeNpm([], dir => dir === '/repo/packages/a' ? E409 : OK);
      await expect(stageRelease(options(npm))).resolves.toBe(true);
      expect(log).toHaveBeenCalledWith('Staged 1 of 2 packages.');
      expect(log).toHaveBeenLastCalledWith(`Skipped 1 that were already staged or published:
  @comunica/a@1.0.0`);
    });

    it('should continue after other errors', async() => {
      const npm = fakeNpm([], dir => dir === '/repo/packages/a' ? E500 : OK);
      await expect(stageRelease(options(npm))).resolves.toBe(false);
      expect(log).toHaveBeenCalledWith('[1/2] Staged @comunica/b@1.0.0');
      expect(log).toHaveBeenLastCalledWith(`Failed to stage 1:
  @comunica/a@1.0.0: code E500 Internal Server Error`);
    });
  });

  describe('stageReleaseCli', () => {
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
            child.stdout.emit('data', '[]');
          }
          child.emit('close', 0);
        });
        return child;
      }));
      jest.mocked(createInterface).mockImplementation(() => {
        const readline: any = Object.assign(new EventEmitter(), {
          question: (question: string, callback: (answer: string) => void) => callback('n'),
          close: () => readline.emit('close'),
        });
        return readline;
      });
    });

    afterEach(() => {
      consoleLog.mockRestore();
    });

    it('should stage the version from lerna.json', async() => {
      await expect(stageReleaseCli([ '--yes', '--tag', 'next', '--concurrency', '2' ], '/repo')).resolves.toBe(true);
      expect(readJson).toHaveBeenCalledWith('/repo/lerna.json');
      const args = [ 'stage', 'publish', '--workspaces=false', '--tag', 'next' ];
      expect(spawn).toHaveBeenCalledWith('npm', args, expect.objectContaining({ cwd: '/repo/packages/b' }));
      expect(consoleLog).toHaveBeenLastCalledWith('Staged 2 of 2 packages.');
    });

    it('should stage the given version after confirmation', async() => {
      await expect(stageReleaseCli([ '--version', '0.9.0' ], '/repo')).resolves.toBe(true);
      expect(readJson).not.toHaveBeenCalled();
      expect(consoleLog).toHaveBeenCalledWith('Found 1 packages at version 0.9.0.');
      expect(consoleLog).toHaveBeenLastCalledWith('Aborted.');
    });

    it('should reject an invalid concurrency', async() => {
      await expect(stageReleaseCli([ '--concurrency', '0' ], '/repo')).rejects
        .toThrow('--concurrency must be a positive integer, but got "0"');
    });

    it('should reject unknown options', async() => {
      await expect(stageReleaseCli([ '--unknown' ], '/repo')).rejects.toThrow('Unknown option');
    });
  });
});
