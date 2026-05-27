import type IDbContext from "./domain/interfaces/IDbContext.ts";
import HammurabiEngine from "./domain/services/engine.ts";

/**
 * Global singleton instance of HammurabiEngine.
 * Must be configured once at application startup with a valid DbContext.
 *
 * @example
 * ```ts
 * import Hammurabi from 'hammurabi';
 *
 * // In your app initialization (e.g., main.ts or app.ts)
 * Hammurabi.configure(myDbContext);
 *
 * // Then use it anywhere in your app
 * const ledger = Hammurabi.getLedger();
 * const helper = Hammurabi.getTransactionHelper();
 * ```
 *
 * Note: This is a global singleton. Configure it once at startup.
 * Subsequent calls to configure() will replace the DbContext.
 */
class HammurabiSingleton {
  private static instance: HammurabiSingleton;
  private engine?: HammurabiEngine;

  private constructor() {}

  /**
   * Gets the singleton instance.
   * @private Use the default export instead.
   */
  static getInstance(): HammurabiSingleton {
    if (!HammurabiSingleton.instance) {
      HammurabiSingleton.instance = new HammurabiSingleton();
    }
    return HammurabiSingleton.instance;
  }

  /**
   * Configures the engine with a DbContext.
   * This must be called at application startup before using getLedger() or getTransactionHelper().
   *
   * This is a global configuration. You typically only need to call this once,
   * but you can reconfigure if needed (e.g., for testing or switching contexts).
   *
   * @param dbContext - Your implementation of IDbContext with ledgerRepository and accountRepository
   * @throws Error if dbContext is not provided
   *
   * @example
   * ```ts
   * Hammurabi.configure(myDbContext);
   * ```
   */
  configure(dbContext: IDbContext): void {
    if (!dbContext) {
      throw new Error(
        "DbContext is required to configure HammurabiEngine. Ensure your DbContext implements IDbContext with ledgerRepository and accountRepository.",
      );
    }
    this.engine = new HammurabiEngine(dbContext);
  }

  /**
   * Returns a new Ledger instance bound to the configured repository.
   * @throws Error if configure() has not been called yet
   */
  getLedger() {
    if (!this.engine) {
      throw new Error(
        "HammurabiEngine has not been configured. Call Hammurabi.configure(dbContext) at application startup.",
      );
    }
    return this.engine.getLedger();
  }

  /**
   * Returns a new TransactionHelper instance bound to the configured repository.
   * @throws Error if configure() has not been called yet
   */
  getTransactionHelper() {
    if (!this.engine) {
      throw new Error(
        "HammurabiEngine has not been configured. Call Hammurabi.configure(dbContext) at application startup.",
      );
    }
    return this.engine.getTransactionHelper();
  }
}

export default HammurabiSingleton.getInstance();
