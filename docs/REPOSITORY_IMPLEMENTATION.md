# Repository Implementation Guide

Implement the required repository interfaces to persist Hammurabi transactions and accounts to your database.

## Overview

Hammurabi uses the Repository Pattern to decouple business logic from data access. You must implement:

```
Your Application
     ↓
Hammurabi Engine
     ↓
Your DbContext (implements IDbContext)
├─ ILedgerRepository (save transactions & entries)
└─ IAccountRepository (query accounts)
     ↓
Your Database
```

## Interfaces You Need to Implement

### IDbContext

Provides repository instances to Hammurabi:

```typescript
interface IDbContext {
  ledgerRepository: ILedgerRepository;
  accountRepository: IAccountRepository;
}
```

**Implementation:**

```typescript
import { IDbContext, ILedgerRepository, IAccountRepository } from "hammurabi";

export class MyDbContext implements IDbContext {
  ledgerRepository: ILedgerRepository;
  accountRepository: IAccountRepository;

  constructor(databaseConnection: Database) {
    this.ledgerRepository = new MyLedgerRepository(databaseConnection);
    this.accountRepository = new MyAccountRepository(databaseConnection);
  }
}

// Use at app startup
const dbContext = new MyDbContext(myDb);
Hammurabi.configure(dbContext);
```

---

### ILedgerRepository

Persists transactions and entries atomically.

```typescript
interface ILedgerRepository {
  /**
   * Persist a transaction and its entries atomically.
   * Returns the saved transaction.
   */
  saveTransactional(transaction: Transaction): Promise<Transaction>;
}
```

**Responsibilities:**

1. Save the transaction header (uuid, description, timestamp)
2. Save all entries (accountId, amount, conceptId, quantity)
3. Use database transaction for atomicity (all or nothing)
4. Preserve all fields exactly as they are

**Fields to Persist:**

```typescript
// Transaction
uuid: string                    // Unique identifier
description: string            // Human-readable summary
timestamp: Date               // When it occurred

// Entries
accountId: number             // Which account
amount: number                // Debit (+) or credit (-)
conceptId?: number            // Optional category
quantity?: number             // Optional quantity
```

---

### IAccountRepository

Your implementation defines the methods you need for querying accounts.

Common operations:
- `findById(id: number): Promise<Account>`
- `findAll(): Promise<Account[]>`
- `create(account: Account): Promise<Account>`

No specific methods are required by Hammurabi. You define what you need.

---

## Account Hierarchy & Type Assignment

Accounts use a hierarchical structure:

**Main Accounts** (5 types, no parent):
- ASSET (id: 1)
- EXPENSE (id: 2)
- LIABILITY (id: 3)
- EQUITY (id: 4)
- INCOME (id: 5)

**Sub-Accounts** (children of main accounts):
```
ASSET (id: 1)
├─ Cash (id: 101, parentId: 1, type: ASSET)
├─ Inventory (id: 102, parentId: 1, type: ASSET)

EXPENSE (id: 2)
├─ Rent (id: 201, parentId: 2, type: EXPENSE)
├─ Utilities (id: 202, parentId: 2, type: EXPENSE)
```

**Type Assignment Rule:**
- **Main Account**: Type is explicit (ASSET, EXPENSE, etc.)
- **Sub-Account**: Must inherit parent's type

**Example:**
```typescript
// When creating a sub-account, copy type from parent
const parent = await accountRepository.findById(1);  // ASSET type
const subAccount = new Account(
  101,
  1,                // parentId
  "Cash",
  parent.type       // Copy ASSET from parent
);
```

---

## Implementation Example: Prisma

Here's a complete example using Prisma ORM.

### Schema

```prisma
// prisma/schema.prisma

model Transaction {
  uuid        String   @id @default(uuid())
  description String
  timestamp   DateTime
  entries     Entry[]

  @@map("transactions")
}

model Entry {
  id              Int         @id @default(autoincrement())
  transactionUuid String
  transaction     Transaction @relation(fields: [transactionUuid], references: [uuid], onDelete: Cascade)
  accountId       Int
  amount          Decimal
  conceptId       Int?
  quantity        Int?

  @@map("entries")
}

model Account {
  id       Int     @id
  parentId Int?
  name     String
  type     String
  children Account[] @relation("AccountChildren")
  parent   Account? @relation("AccountChildren", fields: [parentId], references: [id])

  @@map("accounts")
}
```

### Implementation

```typescript
import { PrismaClient } from "@prisma/client";
import { Transaction, Entry, ILedgerRepository, IAccountRepository, IDbContext } from "hammurabi";

// LedgerRepository
export class PrismaLedgerRepository implements ILedgerRepository {
  constructor(private prisma: PrismaClient) {}

  async saveTransactional(transaction: Transaction): Promise<Transaction> {
    await this.prisma.$transaction(async (tx) => {
      // Create transaction record
      await tx.transaction.create({
        data: {
          uuid: transaction.uuid,
          description: transaction.description,
          timestamp: transaction.timestamp,
          entries: {
            createMany: {
              data: transaction.entries.map((entry) => ({
                accountId: entry.accountId,
                amount: entry.amount,
                conceptId: entry.conceptId,
                quantity: entry.quantity,
              })),
            },
          },
        },
      });
    });

    return transaction;
  }
}

// AccountRepository
export class PrismaAccountRepository implements IAccountRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: number) {
    return this.prisma.account.findUnique({
      where: { id },
    });
  }

  async findAll() {
    return this.prisma.account.findMany();
  }

  async create(account: Account) {
    return this.prisma.account.create({
      data: {
        id: account.id,
        parentId: account.parentId,
        name: account.name,
        type: account.type,
      },
    });
  }
}

// DbContext
export class PrismaDbContext implements IDbContext {
  ledgerRepository: ILedgerRepository;
  accountRepository: IAccountRepository;

  constructor(prisma: PrismaClient) {
    this.ledgerRepository = new PrismaLedgerRepository(prisma);
    this.accountRepository = new PrismaAccountRepository(prisma);
  }
}

// Usage
const prisma = new PrismaClient();
const dbContext = new PrismaDbContext(prisma);
Hammurabi.configure(dbContext);
```

---

## Key Implementation Details

### 1. Atomicity is Critical

Always use your database's transaction mechanism to ensure either ALL data is saved or NOTHING:

```typescript
// ✓ Correct - atomic operation
async saveTransactional(transaction: Transaction): Promise<Transaction> {
  return this.db.transaction(async (txn) => {
    // Save transaction
    // Save entries
    // If any error, everything rolls back
  });
}
```

### 2. Preserve Precision for Amounts

Use appropriate data types for financial data:

```typescript
// Good
amount: Decimal(15, 2)   // $999,999,999,999.99

// Risky
amount: Float64          // Can lose precision

// Alternative
amount: BigInt           // Store in cents
```

### 3. Account Type Inheritance

When querying sub-accounts, ensure you include parent type:

```typescript
async getSubAccountsOfType(parentId: number) {
  // Get parent
  const parent = await this.findById(parentId);
  
  // Query children - they inherit parent's type
  return this.db.query(
    "SELECT * FROM accounts WHERE parent_id = ?",
    [parentId]
  ).map(row => ({
    ...row,
    type: parent.type  // Ensure type matches parent
  }));
}
```

---

## Testing Your Implementation

Verify your repository works correctly:

```typescript
import Hammurabi, { Entry } from "hammurabi";

// 1. Configure
const dbContext = new PrismaDbContext(prisma);
Hammurabi.configure(dbContext);

// 2. Create and commit a transaction
const ledger = Hammurabi.getLedger();
const entries = [
  new Entry({ accountId: 101, amount: 1000 }),
  new Entry({ accountId: 201, amount: -1000 })
];

ledger.startTransaction("Test transaction", entries);
const saved = await ledger.commit();

console.log("✓ Transaction saved:", saved.uuid);

// 3. Verify in database
const result = await prisma.transaction.findUnique({
  where: { uuid: saved.uuid },
  include: { entries: true }
});

console.log("✓ Found in database:", result !== null);
console.log(`  Entries: ${result.entries.length}`);
```

---

## Field Mapping Reference

### Transaction → Database

| Hammurabi | Database | Type |
|-----------|----------|------|
| `uuid` | `uuid` | UUID/String |
| `description` | `description` | Text |
| `timestamp` | `timestamp` | DateTime |

### Entry → Database

| Hammurabi | Database | Type |
|-----------|----------|------|
| `accountId` | `account_id` | Integer |
| `amount` | `amount` | Decimal |
| `conceptId` | `concept_id` | Integer (nullable) |
| `quantity` | `quantity` | Integer (nullable) |

### Account → Database

| Hammurabi | Database | Type |
|-----------|----------|------|
| `id` | `id` | Integer |
| `parentId` | `parent_id` | Integer (nullable) |
| `name` | `name` | Text |
| `type` | `type` | Enum/Text |

---

## Next Steps

1. Implement your repositories following the patterns above
2. Run the testing code to verify data persistence
3. See [USAGE.md](./USAGE.md) to start recording transactions
4. See [CUSTOM_TRANSACTIONS.md](./CUSTOM_TRANSACTIONS.md) for handling custom transaction types
