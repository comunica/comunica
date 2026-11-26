import { KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IActionContext, IDestinationTransaction } from '@comunica/types';
import { runInTransaction, UpdateTransaction } from '../lib/UpdateTransaction';

// A transaction that records when it is committed or rolled back
function transaction(log: string[], name: string, fail?: 'commit' | 'rollback'): IDestinationTransaction {
  return {
    async commit() {
      log.push(`commit ${name}`);
      if (fail === 'commit') {
        throw new Error(`commit ${name} failed`);
      }
    },
    async rollback() {
      log.push(`rollback ${name}`);
      if (fail === 'rollback') {
        throw new Error(`rollback ${name} failed`);
      }
    },
  };
}

describe('UpdateTransaction', () => {
  let log: string[];
  let updateTransaction: UpdateTransaction;

  beforeEach(() => {
    log = [];
    updateTransaction = new UpdateTransaction();
  });

  it('begins one transaction per key', () => {
    const begin = jest.fn(() => transaction(log, 'a'));
    const first = updateTransaction.get('a', begin);
    expect(updateTransaction.get('a', begin)).toBe(first);
    expect(begin).toHaveBeenCalledTimes(1);
    expect(updateTransaction.find('a')).toBe(first);
    expect(updateTransaction.find('b')).toBeUndefined();
  });

  it('commits transactions in the order in which they were begun', async() => {
    updateTransaction.get('a', () => transaction(log, 'a'));
    updateTransaction.get('b', () => transaction(log, 'b'));
    await updateTransaction.commit();
    expect(log).toEqual([ 'commit a', 'commit b' ]);
    expect(updateTransaction.find('a')).toBeUndefined();
  });

  it('rolls back the remaining transactions if a commit fails', async() => {
    updateTransaction.get('a', () => transaction(log, 'a', 'commit'));
    updateTransaction.get('b', () => transaction(log, 'b'));
    await expect(updateTransaction.commit()).rejects.toThrow('commit a failed');
    expect(log).toEqual([ 'commit a', 'rollback b' ]);
  });

  it('rolls back all transactions, and passes on the first error', async() => {
    updateTransaction.get('a', () => transaction(log, 'a', 'rollback'));
    updateTransaction.get('b', () => transaction(log, 'b'));
    await expect(updateTransaction.rollback()).rejects.toThrow('rollback a failed');
    expect(log).toEqual([ 'rollback a', 'rollback b' ]);
    expect(updateTransaction.find('b')).toBeUndefined();
    await expect(updateTransaction.rollback()).resolves.toBeUndefined();
  });
});

describe('runInTransaction', () => {
  let log: string[];
  let context: IActionContext;

  beforeEach(() => {
    log = [];
    context = new ActionContext();
  });

  it('commits a new transaction once the task succeeds', async() => {
    await expect(runInTransaction(context, async(taskContext) => {
      taskContext.getSafe(KeysRdfUpdateQuads.transaction).get('a', () => transaction(log, 'a'));
      log.push('task');
      return 'result';
    })).resolves.toBe('result');
    expect(log).toEqual([ 'task', 'commit a' ]);
  });

  it('rolls back a new transaction if the task fails, and passes on its error', async() => {
    await expect(runInTransaction(context, async(taskContext) => {
      taskContext.getSafe(KeysRdfUpdateQuads.transaction).get('a', () => transaction(log, 'a', 'rollback'));
      throw new Error('task failed');
    })).rejects.toThrow('task failed');
    expect(log).toEqual([ 'rollback a' ]);
  });

  it('runs a task within the transaction of the context, without committing it', async() => {
    const updateTransaction = new UpdateTransaction();
    const outer = context.set(KeysRdfUpdateQuads.transaction, updateTransaction);
    await runInTransaction(outer, async(taskContext) => {
      expect(taskContext).toBe(outer);
      taskContext.getSafe(KeysRdfUpdateQuads.transaction).get('a', () => transaction(log, 'a'));
    });
    expect(log).toEqual([]);
    expect(updateTransaction.find('a')).toBeDefined();
  });
});
