import type ILedgerRepository from "./ILedgerRepository.ts";
import type IAccountRepository from "./IAccountRepository.ts";

/**
 * Defines the repositories required by the engine.
 * Implement this interface with your chosen database / persistence layer
 * and pass it to the {@link HammurabiEngine} constructor.
 */
export default interface IDbContext {
  ledgerRepository: ILedgerRepository,
  accountRepository: IAccountRepository,
}
