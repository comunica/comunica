import type { Argv } from 'yargs';

/**
 * These handlers enable manipulation of the CLI arguments and their processing.
 *
 * Implementations of this interface can be passed via the {@link KeysInitSparql.cliArgsHandlers} context entry.
 */
export interface ICliArgsHandler {
  /**
   * Add to the yargs arguments builder.
   * @param argumentsBuilder A yargs argument builder object.
   */
  populateYargs: (argumentsBuilder: Argv<any>) => Argv<any>;
  /**
   * Process the incoming arguments, and modify the context if needed.
   * @param args The parsed yargs arguments.
   * @param context The mutable context.
   */
  handleArgs: (args: Record<string, any>, context: Record<string, any>) => Promise<void>;
}
