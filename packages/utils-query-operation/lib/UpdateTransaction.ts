import { KeysRdfUpdateQuads } from '@comunica/context-entries';
import type { IActionContext, IDestinationTransaction, IUpdateTransaction } from '@comunica/types';

/**
 * The transactions of the destinations that an update request changes, which are committed together.
 */
export class UpdateTransaction implements IUpdateTransaction {
  private readonly transactions = new Map<unknown, IDestinationTransaction>();

  public get<T extends IDestinationTransaction>(key: unknown, begin: () => T): T {
    let transaction = <T | undefined> this.transactions.get(key);
    if (!transaction) {
      transaction = begin();
      this.transactions.set(key, transaction);
    }
    return transaction;
  }

  public find(key: unknown): IDestinationTransaction | undefined {
    return this.transactions.get(key);
  }

  /**
   * Commit the transactions of all destinations, in the order in which they were begun.
   * If one of them fails, those that were not committed yet are rolled back.
   * Destinations of which the transactions were committed before keep their changes,
   * since transactions of different destinations can not be committed atomically together.
   */
  public async commit(): Promise<void> {
    const transactions = [ ...this.transactions.values() ];
    this.transactions.clear();
    for (const [ index, transaction ] of transactions.entries()) {
      try {
        await transaction.commit();
      } catch (error: unknown) {
        await Promise.allSettled(transactions.slice(index + 1).map(remaining => remaining.rollback()));
        throw error;
      }
    }
  }

  /**
   * Roll back the transactions of all destinations.
   * If one of them fails, the others are still rolled back, after which the first error is thrown.
   */
  public async rollback(): Promise<void> {
    const transactions = [ ...this.transactions.values() ];
    this.transactions.clear();
    const results = await Promise.allSettled(transactions.map(transaction => transaction.rollback()));
    const failure = results.find(result => result.status === 'rejected');
    if (failure) {
      throw failure.reason;
    }
  }
}

/**
 * Run a task of an update request within the transaction of the request.
 * If the context has no transaction yet, the task runs in a new one,
 * which is committed if the task succeeds, and rolled back if it fails.
 * @param context The context of the task.
 * @param task The task, which receives a context with the transaction.
 */
export async function runInTransaction<T>(
  context: IActionContext,
  task: (context: IActionContext) => Promise<T>,
): Promise<T> {
  if (context.has(KeysRdfUpdateQuads.transaction)) {
    return task(context);
  }
  const transaction = new UpdateTransaction();
  let result: T;
  try {
    result = await task(context.set(KeysRdfUpdateQuads.transaction, transaction));
  } catch (error: unknown) {
    // The error of the task is passed on, rather than one of rolling back, as it explains why the request failed
    await transaction.rollback().catch(() => {});
    throw error;
  }
  await transaction.commit();
  return result;
}
