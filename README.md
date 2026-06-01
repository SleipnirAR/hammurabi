# Hammurabi - Accounting Engine

A TypeScript-based double-entry bookkeeping accounting engine. Hammurabi enforces the fundamental accounting principle that debits must equal credits, ensuring data integrity at the core of your financial system.

## Key Features

- **Double-Entry Bookkeeping**: Automatic verification that all transactions balance (debits = credits)
- **Immutable Transactions**: Once created and verified, transactions cannot be modified
- **Type-Safe**: Built with TypeScript for complete type safety
- **Extensible**: Create custom Transaction subclasses to add metadata (user info, location, custom fields, etc.)
- **Repository Pattern**: Works with any database through simple interface implementations
- **Singleton Pattern**: Global, configured-once engine instance for easy access throughout your app

## Quick Start

### 1. Set Up Your Database Context

Implement the `IDbContext` interface with repositories for transactions and accounts:

```typescript
import { IDbContext } from "hammurabi";

class MyDbContext implements IDbContext {
  ledgerRepository: ILedgerRepository;
  accountRepository: IAccountRepository;

  constructor() {
    this.ledgerRepository = new MyLedgerRepository();
    this.accountRepository = new MyAccountRepository();
  }
}
```

See [REPOSITORY_IMPLEMENTATION.md](./docs/REPOSITORY_IMPLEMENTATION.md) for implementation details.

### 2. Configure Hammurabi at Startup

```typescript
import Hammurabi from "hammurabi";

const dbContext = new MyDbContext();
Hammurabi.configure(dbContext);  // Call once at app startup
```

### 3. Record Transactions Using TransactionHelper

```typescript
import Hammurabi from "hammurabi";

const helper = Hammurabi.getTransactionHelper();
const ledger = Hammurabi.getLedger();

// Transfer money between accounts (most common operation)
const [fromEntry, toEntry] = await helper.transfer({
  FromId: 101,      // Cash account
  ToId: 401,        // Revenue account
  amount: 1000,
  conceptId: 1
});

// Start transaction
ledger.startTransaction("Customer payment received", [fromEntry, toEntry]);

// Save to database
await ledger.commit();
```

**Note**: `TransactionHelper.transfer()` is the recommended way to record transactions. It handles accounting logic automatically based on account types.

## Core Concepts

### Transaction
An immutable record of a complete business event. Contains:
- **Description**: Human-readable summary
- **Entries**: Array of debits and credits that balance to zero
- **UUID & Timestamp**: Unique identifier and when it occurred

Transactions are **frozen** after creation - they cannot be modified. This ensures audit trail integrity.

### Entry
A single debit or credit in a transaction:
- **AccountId**: Which account this affects
- **Amount**: Positive for debits, negative for credits
- **ConceptId** (optional): Category/classification
- **Quantity** (optional): For inventory tracking

### Account
Represents an account in the chart of accounts. The system uses a hierarchical structure:

**5 Main Account Types:**
- `ASSET`: What you own (cash, inventory, receivables)
- `LIABILITY`: What you owe (payables, loans)
- `EQUITY`: Owner's stake
- `INCOME`: Revenue
- `EXPENSE`: Costs

**Sub-Accounts** inherit their parent's type. For example:
```
ASSET (main, id: 1)
├─ Cash (sub, id: 101)
└─ Inventory (sub, id: 102)

EXPENSE (main, id: 2)
├─ Rent (sub, id: 201)
└─ Utilities (sub, id: 202)
```

### TransactionHelper
Utility for creating balanced entry pairs. Automatically handles the accounting nature of each account type.

**Main method: `transfer()`**
```typescript
// Returns [fromEntry, toEntry] - automatically balanced
const [fromEntry, toEntry] = await helper.transfer({
  FromId: 101,          // Source account
  ToId: 401,            // Destination account
  amount: 1000,
  conceptId?: number,   // Optional category
  quantity?: number     // Optional quantity
});
```

### Ledger
Manages a single transaction lifecycle:
1. **Start**: Create transaction with balanced entries
2. **Verify**: Ensure debits = credits (automatic)
3. **Commit**: Save to database
4. **Rollback**: Discard if verification fails

## Next Steps

- **Complete Guide**: See [USAGE.md](./docs/USAGE.md) - full API documentation and examples
- **Set Up Repositories**: See [REPOSITORY_IMPLEMENTATION.md](./docs/REPOSITORY_IMPLEMENTATION.md) - database integration
- **Custom Transactions**: See [CUSTOM_TRANSACTIONS.md](./docs/CUSTOM_TRANSACTIONS.md) - add metadata (user, location, invoice number, etc.)

## Architecture Overview

```
Application
    ↓
Hammurabi (Singleton Engine)
    ├─ configure(dbContext) → Call once at startup
    ├─ getLedger() → Get transaction manager
    └─ getTransactionHelper() → Get helper utilities
    ↓
DbContext (Your Implementation)
    ├─ ILedgerRepository → Save transactions
    └─ IAccountRepository → Query accounts
    ↓
Your Database
```

## Error Handling

Transactions automatically rollback if they don't balance or encounter errors:

```typescript
try {
  const [fromEntry, toEntry] = await helper.transfer({
    FromId: 101,
    ToId: 401,
    amount: 1000
  });
  
  ledger.startTransaction("Payment", [fromEntry, toEntry]);
  await ledger.commit();
} catch (error) {
  console.error("Transaction failed:", error.message);
  // Transaction is automatically rolled back
  // You can start a new transaction with a fresh ledger
}
```

## Advanced Features

For advanced use cases:
- **Custom Transactions**: Add metadata fields (user, location, invoice number) - see [CUSTOM_TRANSACTIONS.md](./docs/CUSTOM_TRANSACTIONS.md)
- **Manual Entry Creation**: For fine-grained control when TransactionHelper doesn't fit your use case - see [USAGE.md - Advanced](./docs/USAGE.md#manual-entry-creation-advanced)
