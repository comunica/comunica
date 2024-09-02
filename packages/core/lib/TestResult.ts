/**
 * A test result represents the result of an actor test that can either be passed or failed.
 *
 * Test results are immutable.
 */
export type TestResult<T> = TestResultPassed<T> | TestResultFailed;

/**
 * Create a new test result that represents a passed value.
 * @param value The value the test passed with.
 */
export function passTest<T>(value: T): TestResultPassed<T> {
  return new TestResultPassed<T>(value);
}

/**
 * Create a new test result that represents a passed void value.
 */
export function passTestVoid(): TestResultPassed<any> {
  return new TestResultPassed<any>(true);
}

/**
 * Create a new test result that represents a test failure.
 * @param message The error message that describes the failure.
 */
export function failTest(message: () => string): TestResultFailed {
  return new TestResultFailed(message);
}

/**
 * A passed test result.
 * This should not be constructed manually.
 * Instead, `testPass` should be used.
 */
export class TestResultPassed<T> {
  protected readonly value: T;

  public constructor(passValue: T) {
    this.value = passValue;
  }

  /**
   * Check if the test has passed.
   * If true, it will contain a value.
   */
  public isPassed(): this is TestResultPassed<T> {
    return true;
  }

  /**
   * Check if the test has failed.
   * If true, it will contain a failure message.
   */
  public isFailed(): this is TestResultFailed {
    return false;
  }

  /**
   * Get the value of the passed test, or undefined if the test failed.
   */
  public get(): T {
    return this.value;
  }

  /**
   * Get the value of the passed test, or throw an error if the test failed.
   */
  public getOrThrow(): T {
    return this.value;
  }

  /**
   * Get the failure message callback of the failed test, or undefined if the test passed.
   */
  public getFailMessage(): undefined {
    return undefined;
  }

  /**
   * For passed tests, map the passed value to another value.
   * Failed tests will remain unchanged.
   *
   * This will not mutate the test result, and instead return a new test result.
   *
   * @param mapper A function that will transform the passed value.
   */
  public map<T2>(mapper: (value: T) => T2): TestResultPassed<T2> {
    return new TestResultPassed<T2>(mapper(this.value));
  }

  /**
   * For passed tests, asynchronously map the passed value to another value.
   * Failed tests will remain unchanged.
   *
   * This will not mutate the test result, and instead return a new test result.
   *
   * @param mapper A function that will transform the passed value.
   */
  public async mapAsync<T2>(mapper: (value: T) => Promise<T2>): Promise<TestResultPassed<T2>> {
    return new TestResultPassed<T2>(await mapper(this.value));
  }
}

/**
 * A failed test result.
 * This should not be constructed manually.
 * Instead, `testFail` should be used.
 */
export class TestResultFailed {
  protected readonly failMessage: () => string;

  public constructor(failMessage: () => string) {
    this.failMessage = failMessage;
  }

  /**
   * Check if the test has passed.
   * If true, it will contain a value.
   */
  public isPassed(): this is TestResultPassed<any> {
    return false;
  }

  /**
   * Check if the test has failed.
   * If true, it will contain a failure message.
   */
  public isFailed(): this is TestResultFailed {
    return true;
  }

  /**
   * Get the value of the passed test, or undefined if the test failed.
   */
  public get(): undefined {
    return undefined;
  }

  /**
   * Get the value of the passed test, or throw an error if the test failed.
   */
  public getOrThrow(): never {
    throw new Error(this.getFailMessage()());
  }

  /**
   * Get the failure message callback of the failed test, or undefined if the test passed.
   */
  public getFailMessage(): () => string {
    return this.failMessage;
  }

  /**
   * For passed tests, map the passed value to another value.
   * Failed tests will remain unchanged.
   *
   * This will not mutate the test result, and instead return a new test result.
   */
  public map(): TestResultFailed {
    return this;
  }

  /**
   * For passed tests, asynchronously map the passed value to another value.
   * Failed tests will remain unchanged.
   *
   * This will not mutate the test result, and instead return a new test result.
   */
  public async mapAsync(): Promise<TestResultFailed> {
    return this;
  }
}
