# Usage Guide

Complete documentation on using Hammurabi for accounting operations.

## Table of Contents

1. [TransactionHelper (Recommended)](#transactionhelper-recommended)
2. [Example: Product Sale](#example-product-sale)
3. [Error Handling](#error-handling)
4. [Manual Entry Creation (Advanced)](#manual-entry-creation-advanced)
5. [API Reference](#api-reference)

## TransactionHelper (Recommended)

The `TransactionHelper` is the recommended way to record transactions. It generates balanced entry pairs automatically, handling the accounting nature of each account type.

### Method: transfer()

Creates a balanced pair of entries for transferring value between two accounts.

**Signature:**
```typescript
transfer({
  FromId: number,           // Source account
  ToId: number,             // Destination account  
  amount: number,           // Amount to transfer
  conceptId?: number,       // Optional: category/concept
  quantity?: number         // Optional: quantity
}): Promise<[Entry, Entry]>
```

Returns a promise with a tuple of two balanced entries: `[fromEntry, toEntry]`

### Basic Usage

```typescript
import Hammurabi from "hammurabi";

// Initialize once at app startup
Hammurabi.configure(dbContext);

// Later, when recording a transaction
const helper = Hammurabi.getTransactionHelper();
const ledger = Hammurabi.getLedger();

// Create balanced entries
const [fromEntry, toEntry] = await helper.transfer({
  FromId: 101,        // Source account
  ToId: 401,          // Destination account
  amount: 1000,
  conceptId: 1        // Optional category
});

// Start transaction
ledger.startTransaction("Customer payment received", [fromEntry, toEntry]);

// Commit to database
const saved = await ledger.commit();
console.log("✓ Transaction saved:", saved.uuid);
```

### How It Works

The `transfer()` method:
1. Looks up both accounts from the repository
2. Determines the accounting nature of each (debit vs credit)
3. Generates entries with correct signs (positive/negative)
4. Returns entries that balance to zero

**Example:**
```typescript
// Account 101: Cash (ASSET type - debit nature)
// Account 401: Revenue (INCOME type - credit nature)

const [cashEntry, revenueEntry] = await helper.transfer({
  FromId: 401,     // Revenue (credit nature)
  ToId: 101,       // Cash (debit nature)
  amount: 1000
});

// Generates:
// revenueEntry: { accountId: 401, amount: 1000 }   (records revenue)
// cashEntry:    { accountId: 101, amount: 1000 }   (records cash in)
```

### Multiple Transfers in One Transaction

You can chain multiple `transfer()` calls to record complex transactions:

```typescript
const helper = Hammurabi.getTransactionHelper();
const ledger = Hammurabi.getLedger();
const entries = [];

// Transfer 1: Inventory → COGS
const [invOut, cogsIn] = await helper.transfer({
  FromId: 102,      // Inventory
  ToId: 201,        // Cost of Goods Sold
  amount: 375,
  quantity: 5
});
entries.push(invOut, cogsIn);

// Transfer 2: Revenue → Cash
const [revOut, cashIn] = await helper.transfer({
  FromId: 301,      // Revenue
  ToId: 101,        // Cash
  amount: 500,
  quantity: 5
});
entries.push(revOut, cashIn);

// All entries are balanced
ledger.startTransaction("Sale: 5x Product ABC", entries);
await ledger.commit();
```

---

## Example: Product Sale

A complete, practical example showing how to record a product sale with inventory and revenue.

### Scenario

Customer purchases 5 units of Product ABC for $500 total:
- **Revenue**: $500 (selling price)
- **Cost**: $375 (5 units × $75 each)
- **Profit**: $125

**Accounts used:**
- Account 101: Cash (ASSET)
- Account 102: Inventory (ASSET)
- Account 201: Cost of Goods Sold (EXPENSE)
- Account 301: Revenue (INCOME)

### Implementation

```typescript
import Hammurabi from "hammurabi";

// 1. Initialize (once at app startup)
Hammurabi.configure(dbContext);

// 2. Get helper and ledger
const helper = Hammurabi.getTransactionHelper();
const ledger = Hammurabi.getLedger();

const entries = [];

// 3. Transfer 1: Move inventory to COGS
// Inventory (102) decreases → COGS (201) increases
const [invOut, cogsIn] = await helper.transfer({
  FromId: 102,        // Inventory (source)
  ToId: 201,          // COGS (destination)
  amount: 375,        // Cost of goods
  conceptId: 1,       // Product category
  quantity: 5         // 5 units sold
});

entries.push(invOut, cogsIn);

// 4. Transfer 2: Record revenue and cash
// Revenue (301) is recorded → Cash (101) increases
const [revOut, cashIn] = await helper.transfer({
  FromId: 301,        // Revenue (source - credit nature)
  ToId: 101,          // Cash (destination - debit nature)
  amount: 500,        // Revenue amount
  conceptId: 1,       // Sales category
  quantity: 5         // 5 units sold
});

entries.push(revOut, cashIn);

// 5. Verify balance
const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
console.log(`Total entries: ${entries.length}`);      // 4
console.log(`Sum of amounts: ${totalAmount}`);        // 0 ✓ (balanced)

// 6. Create and commit the transaction
ledger.startTransaction(
  "Sale: 5x Product ABC - Invoice #INV-2024-001",
  entries
);

const saved = await ledger.commit();
console.log(`✓ Sale recorded: ${saved.uuid}`);
```

### Entry Breakdown

```
Inventory      (102): -375    (decreases)
COGS           (201): +375    (increases)
Revenue        (301): +500    (recorded)
Cash           (101): +500    (increases)

Total: 0 ✓ (balanced)
```

---

## Error Handling

### Automatic Rollback

If any error occurs during transaction creation or verification, `rollback()` is automatically called:

```typescript
try {
  const entries = [
    new Entry({ accountId: 101, amount: 100 })
    // Missing second entry for balance
  ];
  
  ledger.startTransaction("Bad transaction", entries);
} catch (error) {
  console.error("Failed:", error.message);
  // Transaction is automatically rolled back
}

// You can now start a new transaction
ledger.startTransaction("New transaction", newEntries);
```

### Common Errors

| Error | Cause |
|-------|-------|
| `No transaction to verify` | DbContext not configured |
| `Transaction is unbalanced` | Entries don't sum to zero |
| `No transaction to commit` | commit() called without startTransaction() |
| `Entries are required` | Empty entries array |

### Manual Rollback

Discard a transaction without committing:

```typescript
const ledger = Hammurabi.getLedger();
ledger.startTransaction("Test transaction", entries);

// Change your mind
ledger.rollback();

// No transaction is active
```

---

## Manual Entry Creation (Advanced)

For cases where `TransactionHelper` doesn't fit your use case, you can create entries manually.

### When to Use Manual Entries

Use `Entry` directly when:
- You need fine-grained control over debit/credit signs
- Dealing with complex multi-entry transactions not suited to transfer()
- Working with legacy accounting systems
- Custom business logic requires specific entry patterns

### Creating Entries Manually

```typescript
import { Entry } from "hammurabi";

const entry = new Entry({
  accountId: 101,        // Required: account ID
  amount: 1000,          // Required: amount (positive = debit, negative = credit)
  conceptId: 1,          // Optional: category
  quantity: 5            // Optional: quantity
});
```

### Debit vs Credit Signs

- **Debit**: Positive amount (e.g., `amount: 100`)
- **Credit**: Negative amount (e.g., `amount: -100`)

```typescript
// Cash outflow (credit)
const creditEntry = new Entry({
  accountId: 101,
  amount: -500      // Negative = credit
});

// Cash inflow (debit)
const debitEntry = new Entry({
  accountId: 101,
  amount: 500       // Positive = debit
});
```

### Example: Complex Multi-Entry Transaction

```typescript
import Hammurabi, { Entry } from "hammurabi";

const ledger = Hammurabi.getLedger();

const entries = [
  // Record revenue
  new Entry({ accountId: 401, amount: 1000 }),      // Debit revenue
  // Record payment received
  new Entry({ accountId: 101, amount: 1000 }),      // Debit cash
  // Record discount given
  new Entry({ accountId: 101, amount: -100 }),      // Credit cash
  // Record discount expense
  new Entry({ accountId: 501, amount: 100 })        // Debit discount expense
];

ledger.startTransaction("Sale with discount", entries);
await ledger.commit();
```

### Entry Parameters Reference

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountId` | number | Yes | The account affected |
| `amount` | number | Yes | Amount (positive=debit, negative=credit) |
| `conceptId` | number | No | Category/classification |
| `quantity` | number | No | Quantity for inventory tracking |

---

## API Reference

### Hammurabi (Singleton Engine)

#### configure(dbContext: IDbContext): void

Configures the engine with your database context. **Call once at application startup.**

```typescript
import Hammurabi from "hammurabi";

Hammurabi.configure(new MyDbContext());
```

---

#### getLedger(): Ledger

Returns a new Ledger instance for managing a transaction.

```typescript
const ledger = Hammurabi.getLedger();
```

---

#### getTransactionHelper(): TransactionHelper

Returns a new TransactionHelper instance.

```typescript
const helper = Hammurabi.getTransactionHelper();
const [fromEntry, toEntry] = await helper.transfer({...});
```

---

### Ledger Class

#### startTransaction(description: string, entries: Entry[]): void

Starts a transaction with description and entries.

```typescript
ledger.startTransaction("Payment received", entries);
```

**Throws:** Error if entries don't balance or are invalid

---

#### startTransaction(transaction: Transaction): void

Starts a transaction using a Transaction instance (for custom subclasses).

```typescript
const customTx = new CustomTransaction(...);
ledger.startTransaction(customTx);
```

See [CUSTOM_TRANSACTIONS.md](./CUSTOM_TRANSACTIONS.md) for details.

---

#### commit(): Promise<Transaction>

Persists the current transaction to the database.

```typescript
const saved = await ledger.commit();
console.log(saved.uuid);
```

**Returns:** Promise resolving to the saved Transaction

**Throws:** Error if no active transaction

---

#### rollback(): void

Discards the current transaction without persisting.

```typescript
ledger.rollback();
```

---

### Entry Class

```typescript
new Entry({
  accountId: number,        // Required
  amount: number,           // Required
  conceptId?: number,       // Optional
  quantity?: number,        // Optional
  id?: number              // Optional (database-generated)
})
```

---

### Transaction Class

```typescript
new Transaction(
  description: string,
  entries: Entry[],
  uuid?: string,            // Auto-generated if not provided
  timestamp?: Date          // Auto-set to now if not provided
)
```

**Properties (all readonly):**
- `uuid`: Unique identifier
- `timestamp`: When the transaction occurred
- `description`: Transaction description
- `entries`: Array of Entry objects

**Important:** Transaction instances are frozen (immutable) after construction.

---

### Account Class

```typescript
new Account(
  id: number,
  parentId: number,
  name: string,
  type: AccountType
)
```

**AccountType Enum:**
```typescript
enum AccountType {
  ASSET = "ASSET",
  EXPENSE = "EXPENSE",
  LIABILITY = "LIABILITY",
  EQUITY = "EQUITY",
  INCOME = "INCOME"
}
```

---

## Tips & Best Practices

1. **Use TransactionHelper**: It's the recommended way to record transactions
2. **Set conceptId for categorization**: Makes reporting and queries easier
3. **Handle errors gracefully**: Transactions auto-rollback on error
4. **Configure once**: Call `Hammurabi.configure()` at app initialization
5. **One transaction at a time**: Get a new Ledger for each transaction
6. **Use meaningful descriptions**: Helps with audit trails and reconciliation
