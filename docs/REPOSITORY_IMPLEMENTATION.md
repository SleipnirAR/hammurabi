# Repository Implementation Guide

This guide explains how to implement the required repository interfaces to persist Hammurabi transactions and accounts to your database.

## Table of Contents

1. [Overview](#overview)
2. [Interface Requirements](#interface-requirements)
3. [IDbContext](#idbcontext)
4. [ILedgerRepository](#iledgerrepository)
5. [IAccountRepository](#iaccountrepository)
6. [Account Hierarchy & Type Assignment](#account-hierarchy--type-assignment)
7. [ORM Examples](#orm-examples)
8. [Data Mapping](#data-mapping)

## Overview

Hammurabi uses the Repository Pattern to decouple business logic from data access. You must implement three interfaces:

```
Your Application
        ↓
   Hammurabi Engine
        ↓
   Your DbContext (implements IDbContext)
        ├─ ILedgerRepository (save transactions)
        └─ IAccountRepository (query accounts)
        ↓
   Your Database
```

## Interface Requirements

### Quick Summary

| Interface | Responsibility | Methods |
|-----------|-----------------|---------|
| `IDbContext` | Provide repository instances | `ledgerRepository`, `accountRepository` |
| `ILedgerRepository` | Persist transactions and entries | `saveTransactional(transaction)` |
| `IAccountRepository` | Query and manage accounts | Up to your implementation |

## IDbContext

The DbContext is your dependency injection point - it provides Hammurabi with access to your repositories.

### Interface Definition

```typescript
interface IDbContext {
  ledgerRepository: ILedgerRepository;
  accountRepository: IAccountRepository;
}
```

### Implementation Example

```typescript
import { IDbContext, ILedgerRepository, IAccountRepository } from "hammurabi";
import { MyLedgerRepository } from "./repositories/MyLedgerRepository";
import { MyAccountRepository } from "./repositories/MyAccountRepository";

export class MyDbContext implements IDbContext {
  ledgerRepository: ILedgerRepository;
  accountRepository: IAccountRepository;

  constructor() {
    this.ledgerRepository = new MyLedgerRepository();
    this.accountRepository = new MyAccountRepository();
  }
}
```

### With Database Connection

```typescript
export class MyDbContext implements IDbContext {
  ledgerRepository: ILedgerRepository;
  accountRepository: IAccountRepository;

  constructor(databaseConnection: Connection) {
    this.ledgerRepository = new MyLedgerRepository(databaseConnection);
    this.accountRepository = new MyAccountRepository(databaseConnection);
  }
}

// In your app startup
const dbContext = new MyDbContext(myDatabaseConnection);
Hammurabi.configure(dbContext);
```

## ILedgerRepository

Handles persistence of transactions and their entries.

### Interface Definition

```typescript
interface ILedgerRepository {
  /**
   * Persist a transaction and its entries atomically.
   * Returns the saved transaction with any database-generated fields (id, etc).
   */
  saveTransactional(transaction: Transaction): Promise<Transaction>;
}
```

### Key Responsibilities

1. **Save the Transaction**: Store the transaction header (description, uuid, timestamp)
2. **Save Entries**: Store all entries with their account and amount
3. **Atomic Operation**: Use a database transaction so either ALL or NOTHING is saved
4. **Preserve All Fields**: Make sure to save:
   - Transaction: `uuid`, `timestamp`, `description`
   - Entry: `accountId`, `amount`, `conceptId`, `quantity`

### Important: Field Mapping

Hammurabi uses these Transaction fields - **all must be persisted**:

```typescript
Transaction {
  uuid: string;              // Unique identifier (v7 UUID)
  timestamp: Date;           // When it occurred
  description: string;       // Human-readable summary
  entries: Entry[]
}

Entry {
  id?: number;              // Database ID (generated)
  accountId: number;        // Required: which account
  amount: number;           // Required: debit (+) or credit (-)
  conceptId?: number;       // Optional: category/concept
  quantity?: number;        // Optional: quantity for the entry
}
```

## IAccountRepository

Handles querying and managing the chart of accounts.

### Interface Definition

```typescript
interface IAccountRepository {
  // Methods depend on your needs
  // Common operations:
  // - findById(id: number): Promise<Account>
  // - findAll(): Promise<Account[]>
  // - create(account: Account): Promise<Account>
}
```

You define what methods you need. No specific methods are required by Hammurabi core.

### Account Hierarchy & Type Assignment

The account system uses a hierarchical structure:

**Main Accounts** (5 types):
```
ASSET (id: 1)
EXPENSE (id: 2)
LIABILITY (id: 3)
EQUITY (id: 4)
INCOME (id: 5)
```

**Sub-Accounts** (children of main accounts):
```
ASSET (id: 1)
├─ Cash (id: 101, parentId: 1, type: ASSET)
├─ Checking (id: 102, parentId: 1, type: ASSET)
└─ Accounts Receivable (id: 103, parentId: 1, type: ASSET)

EXPENSE (id: 2)
├─ Rent (id: 201, parentId: 2, type: EXPENSE)
└─ Utilities (id: 202, parentId: 2, type: EXPENSE)
```

### Type Assignment Rule

When creating or querying an account:
1. **Main Account**: Has no parent, type is explicit (ASSET, EXPENSE, etc.)
2. **Sub-Account**: Must assign the parent's type to the sub-account

**Example:**
```typescript
// Creating a sub-account
const mainAccount = await accountRepository.findById(1); // ASSET
const subAccount = new Account(
  101,
  1,                    // parentId
  "Cash",
  mainAccount.type      // Copy type from parent (ASSET)
);
await accountRepository.create(subAccount);
```

### Query Optimization

Use `parentId` and `type` for faster queries:

```typescript
// Find all ASSET accounts
const assets = await query()
  .where("type", "=", AccountType.ASSET)
  .getAll();

// Find sub-accounts of a main account
const subAccounts = await query()
  .where("parentId", "=", 1)
  .getAll();
```

## ORM Examples

### Example 1: TypeORM (SQL-based)

```typescript
import { DataSource, Repository, Entity, Column, PrimaryColumn } from "typeorm";
import { Transaction, Entry, ILedgerRepository } from "hammurabi";

// Define your entities
@Entity("transactions")
class TransactionEntity {
  @PrimaryColumn("uuid")
  uuid: string;

  @Column("text")
  description: string;

  @Column("timestamp")
  timestamp: Date;
}

@Entity("entries")
class EntryEntity {
  @PrimaryColumn("integer")
  id: number;

  @Column("integer")
  transactionId: string;  // Foreign key to transaction uuid

  @Column("integer")
  accountId: number;

  @Column("decimal")
  amount: number;

  @Column("integer", { nullable: true })
  conceptId?: number;

  @Column("integer", { nullable: true })
  quantity?: number;
}

// Implement repository
export class TypeOrmLedgerRepository implements ILedgerRepository {
  constructor(
    private transactionRepo: Repository<TransactionEntity>,
    private entryRepo: Repository<EntryEntity>,
  ) {}

  async saveTransactional(transaction: Transaction): Promise<Transaction> {
    return this.transactionRepo.manager.transaction(async (txn) => {
      // Save transaction
      const txnEntity = new TransactionEntity();
      txnEntity.uuid = transaction.uuid;
      txnEntity.description = transaction.description;
      txnEntity.timestamp = transaction.timestamp;
      await txn.save(txnEntity);

      // Save entries
      for (const entry of transaction.entries) {
        const entryEntity = new EntryEntity();
        entryEntity.transactionId = transaction.uuid;
        entryEntity.accountId = entry.accountId;
        entryEntity.amount = entry.amount;
        entryEntity.conceptId = entry.conceptId;
        entryEntity.quantity = entry.quantity;
        await txn.save(entryEntity);
      }

      // Return the saved transaction
      return transaction;
    });
  }
}

// DbContext setup
export class TypeOrmDbContext implements IDbContext {
  ledgerRepository: ILedgerRepository;
  accountRepository: IAccountRepository;

  constructor(dataSource: DataSource) {
    const transactionRepo = dataSource.getRepository(TransactionEntity);
    const entryRepo = dataSource.getRepository(EntryEntity);
    
    this.ledgerRepository = new TypeOrmLedgerRepository(transactionRepo, entryRepo);
    this.accountRepository = new TypeOrmAccountRepository(dataSource);
  }
}
```

### Example 2: Prisma (Schema-based)

```typescript
// prisma/schema.prisma
model Transaction {
  uuid          String    @id @default(uuid())
  description   String
  timestamp     DateTime
  entries       Entry[]

  @@map("transactions")
}

model Entry {
  id              Int      @id @default(autoincrement())
  transactionUuid String
  transaction     Transaction @relation(fields: [transactionUuid], references: [uuid], onDelete: Cascade)
  accountId       Int
  amount          Decimal
  conceptId       Int?
  quantity        Int?

  @@map("entries")
}
```

```typescript
import { PrismaClient } from "@prisma/client";
import { Transaction, Entry, ILedgerRepository } from "hammurabi";

export class PrismaLedgerRepository implements ILedgerRepository {
  constructor(private prisma: PrismaClient) {}

  async saveTransactional(transaction: Transaction): Promise<Transaction> {
    // Use Prisma transaction for atomicity
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

// DbContext setup
export class PrismaDbContext implements IDbContext {
  ledgerRepository: ILedgerRepository;
  accountRepository: IAccountRepository;

  constructor(prisma: PrismaClient) {
    this.ledgerRepository = new PrismaLedgerRepository(prisma);
    this.accountRepository = new PrismaAccountRepository(prisma);
  }
}
```

### Example 3: Raw SQL (Query Builder)

```typescript
import { Database } from "better-sqlite3";
import { Transaction, Entry, ILedgerRepository } from "hammurabi";

export class SqliteLedgerRepository implements ILedgerRepository {
  constructor(private db: Database) {}

  async saveTransactional(transaction: Transaction): Promise<Transaction> {
    return new Promise((resolve, reject) => {
      try {
        // Start transaction
        const txn = this.db.transaction(() => {
          // Insert transaction
          this.db
            .prepare(
              `INSERT INTO transactions (uuid, description, timestamp)
               VALUES (?, ?, ?)`
            )
            .run(transaction.uuid, transaction.description, transaction.timestamp);

          // Insert entries
          const stmt = this.db.prepare(
            `INSERT INTO entries (transactionUuid, accountId, amount, conceptId, quantity)
             VALUES (?, ?, ?, ?, ?)`
          );

          for (const entry of transaction.entries) {
            stmt.run(
              transaction.uuid,
              entry.accountId,
              entry.amount,
              entry.conceptId || null,
              entry.quantity || null
            );
          }
        });

        // Execute transaction
        txn();
        resolve(transaction);
      } catch (error) {
        reject(error);
      }
    });
  }
}
```

## Data Mapping

### Transaction Mapping

| Hammurabi Field | Database Column | Type | Notes |
|-----------------|-----------------|------|-------|
| `uuid` | `uuid` | UUID/String | Primary key, v7 format |
| `description` | `description` | Text | Human-readable summary |
| `timestamp` | `timestamp` | DateTime | ISO 8601 format |

### Entry Mapping

| Hammurabi Field | Database Column | Type | Notes |
|-----------------|-----------------|------|-------|
| `id` | `id` | Integer | Auto-increment, optional |
| `accountId` | `account_id` | Integer | Foreign key to accounts |
| `amount` | `amount` | Decimal | Debit: positive, Credit: negative |
| `conceptId` | `concept_id` | Integer | Optional category/concept |
| `quantity` | `quantity` | Integer | Optional quantity tracking |

### Account Mapping

| Hammurabi Field | Database Column | Type | Notes |
|-----------------|-----------------|------|-------|
| `id` | `id` | Integer | Primary key |
| `parentId` | `parent_id` | Integer | Foreign key to parent account, null for main |
| `name` | `name` | Text | Account name |
| `type` | `type` | Enum/Text | ASSET, LIABILITY, EQUITY, INCOME, EXPENSE |

### Important: Preserve Precision

When storing amounts, use appropriate data types:
- **Decimal/Numeric**: Best for financial data (preserves precision)
- **Float/Double**: ⚠️ Avoid - precision loss with large numbers
- **Integer**: Only if storing cents/smallest unit

```typescript
// Good
amount: Decimal(15, 2)  // $999,999,999,999.99

// Risky
amount: Float64  // Can lose precision

// Alternative
amount: BigInt  // Store in cents as integers
```

## Testing Your Implementation

Verify your repository works correctly:

```typescript
import Hammurabi, { Entry } from "hammurabi";

// 1. Configure
const dbContext = new MyDbContext();
Hammurabi.configure(dbContext);

// 2. Create and commit a transaction
const ledger = Hammurabi.getLedger();
const entries = [
  new Entry({ accountId: 101, amount: 1000 }),
  new Entry({ accountId: 201, amount: -1000 })
];

ledger.startTransaction("Test transaction", entries);
const saved = await ledger.commit();

console.log("✓ Saved transaction:", saved.uuid);

// 3. Verify data in database
const queryResult = await db.query(
  "SELECT * FROM transactions WHERE uuid = ?",
  [saved.uuid]
);

console.log("✓ Found in database:", queryResult.rows.length > 0);
```

## Next Steps

- See [USAGE.md](./USAGE.md) for how to use Hammurabi
- See [CUSTOM_TRANSACTIONS.md](./CUSTOM_TRANSACTIONS.md) for handling custom transaction types
- Implement your repositories following the patterns above
- Run tests to verify data persistence
