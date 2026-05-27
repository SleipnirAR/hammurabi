# Hammurabi - Accounting Engine

A TypeScript-based double-entry bookkeeping accounting engine. Hammurabi enforces the fundamental accounting principle that debits must equal credits, ensuring data integrity at the core of your financial system.

## Key Features

- **Double-Entry Bookkeeping**: Automatic verification that all transactions balance (debits = credits)
- **Immutable Transactions**: Once created and verified, transactions cannot be modified
- **Type-Safe**: Built with TypeScript for complete type safety
- **Extensible**: Create custom Transaction subclasses to add metadata (user info, location, custom fields, etc.)
- **Repository Pattern**: Works with any database through simple interface implementations
- **Singleton Pattern**: Global, configured-once engine instance for easy access throughout your app

## Installation

```bash
npm install hammurabi
```

## Quick Start

### 1. Set Up Your Database Context

First, implement the `IDbContext` interface with your database repositories:

```typescript
import { IDbContext, ILedgerRepository, IAccountRepository } from "hammurabi";

class MyDbContext implements IDbContext {
  ledgerRepository: ILedgerRepository;
  accountRepository: IAccountRepository;

  constructor() {
    this.ledgerRepository = new MyLedgerRepository();
    this.accountRepository = new MyAccountRepository();
  }
}
```

See [REPOSITORY_IMPLEMENTATION.md](./docs/REPOSITORY_IMPLEMENTATION.md) for complete implementation details.

### 2. Configure the Engine at App Startup

```typescript
import Hammurabi from "hammurabi";

// In your main application file (e.g., main.ts, app.ts, or index.ts)
const dbContext = new MyDbContext();
Hammurabi.configure(dbContext);
```

**Important**: Call `configure()` once at application startup, before any other code uses Hammurabi.

### 3. Use the Engine

```typescript
import Hammurabi, { Entry } from "hammurabi";

// Get a ledger instance
const ledger = Hammurabi.getLedger();

// Create entries (debits and credits)
const entries = [
  new Entry({
    accountId: 1,        // Debit account
    amount: 100,
    conceptId: 1         // Optional: transaction category
  }),
  new Entry({
    accountId: 2,        // Credit account
    amount: -100,        // Credit amounts are negative
    conceptId: 1
  })
];

// Start the transaction (automatically verifies balance)
ledger.startTransaction("Monthly rent payment", entries);

// Commit to database
await ledger.commit();
```

## Core Concepts

### Transaction
An immutable record representing a complete business event. Contains:
- **Description**: Human-readable summary of the transaction
- **Entries**: Array of debits and credits
- **UUID**: Unique identifier
- **Timestamp**: When the transaction occurred

Transactions are **frozen** after creation - they cannot be modified. This ensures audit trail integrity.

### Entry
A single debit or credit line within a transaction. Contains:
- **AccountId**: Which account this entry affects
- **Amount**: The amount (negative for credits, positive for debits)
- **ConceptId**: Optional category/classification for the entry

### Account
Represents an account in the chart of accounts. The system uses a hierarchical structure:

**Main Accounts** (5 types defined in AccountType enum):
- `ASSET`: What you own
- `LIABILITY`: What you owe
- `EQUITY`: Owner's stake
- `INCOME`: Revenue
- `EXPENSE`: Costs

**Sub-Accounts**: Any account under a main account inherits its type. For example:
```
├─ ASSET (main, id: 1)
│  ├─ Cash (sub, id: 101, type: ASSET)
│  └─ Accounts Receivable (sub, id: 102, type: ASSET)
├─ LIABILITY (main, id: 2)
│  └─ Accounts Payable (sub, id: 201, type: LIABILITY)
```

Sub-accounts reference their parent account. The repository automatically copies the parent's type.

### Ledger
Manages the lifecycle of a single transaction:
1. **Start**: Create a new transaction
2. **Verify**: Ensure debits = credits
3. **Commit**: Save to the database
4. **Rollback**: Discard if verification fails

## Next Steps

- **Standard Usage**: See [USAGE.md](./docs/USAGE.md) for detailed API documentation
- **Implement Repositories**: See [REPOSITORY_IMPLEMENTATION.md](./docs/REPOSITORY_IMPLEMENTATION.md) for database integration patterns
- **Custom Transactions**: See [CUSTOM_TRANSACTIONS.md](./docs/CUSTOM_TRANSACTIONS.md) to add metadata like user info or location

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

## Common Workflow

```typescript
// 1. Initialize (app startup)
Hammurabi.configure(dbContext);

// 2. Create entries for your business event
const entries = [
  new Entry({ accountId: 101, amount: 1000 }),      // Debit
  new Entry({ accountId: 201, amount: -1000 })      // Credit
];

// 3. Start a transaction (auto-verified)
const ledger = Hammurabi.getLedger();
ledger.startTransaction("Invoice payment", entries);

// 4. Commit to database
await ledger.commit();

// 5. Transaction is now persisted and immutable
```

## Error Handling

Transactions automatically rollback if they don't balance:

```typescript
try {
  const entries = [
    new Entry({ accountId: 1, amount: 100 }),
    new Entry({ accountId: 2, amount: -50 })  // Unbalanced!
  ];
  
  ledger.startTransaction("Bad transaction", entries);
  // This throws an error and rollback() is called automatically
} catch (error) {
  console.error("Transaction failed:", error.message);
  // "Transaction is unbalanced: entries do not sum to zero"
}
```

## Advanced Features

For more advanced usage, see the documentation:
- **Custom Transactions**: Add metadata fields (user, location, etc.) - see [CUSTOM_TRANSACTIONS.md](./docs/CUSTOM_TRANSACTIONS.md)
- **Repository Patterns**: Database integration examples - see [REPOSITORY_IMPLEMENTATION.md](./docs/REPOSITORY_IMPLEMENTATION.md)
