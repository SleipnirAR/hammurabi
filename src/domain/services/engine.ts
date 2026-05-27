import type IDbContext from "../interfaces/IDbContext.ts";
import { Ledger } from "../entities/Ledger.ts";
import TransactionHelper from "./transactionHelper.ts";

/**
 * Entry point for the accounting engine.
 * Provides access to ledger and transaction helper services.
 *
 * @example
 * ```ts
 * const engine = new HammurabiEngine(myDbContext);
 * const ledger = engine.getLedger();
 * ```
 */
export default class HammurabiEngine {
  /**
   * @param DbContext - Your implementation of {@link IDbContext}, which must
   * provide a `ledgerRepository` and an `accountRepository`.
   */
  constructor(DbContext: IDbContext) {
    this.dbContext = DbContext;
  }
  dbContext: IDbContext;

  /** Returns a new Ledger instance bound to the configured repository. */
  getLedger() {
    return new Ledger(this.dbContext.ledgerRepository);
  }

  /** Returns a new TransactionHelper instance bound to the configured account repository. */
  getTransactionHelper() {
    return new TransactionHelper(this.dbContext.accountRepository);
  }
}
