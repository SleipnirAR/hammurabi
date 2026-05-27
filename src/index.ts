// Default export: Global singleton engine instance
export { default } from "./engine-singleton.ts";

// Interfaces - needed for implementing repositories
export type { default as IDbContext } from "./domain/interfaces/IDbContext.ts";
export type { default as ILedgerRepository } from "./domain/interfaces/ILedgerRepository.ts";
export type { default as IAccountRepository } from "./domain/interfaces/IAccountRepository.ts";

// Entities - needed for type definitions and custom implementations
export { default as Transaction } from "./domain/entities/Transaction.ts";
export { default as Entry } from "./domain/entities/Entry.ts";
export { Account, AccountType } from "./domain/entities/Account.ts";
export { Ledger } from "./domain/entities/Ledger.ts";

// Services - in case user needs to instantiate manually
export { default as HammurabiEngine } from "./domain/services/engine.ts";
export { default as TransactionHelper } from "./domain/services/transactionHelper.ts";
