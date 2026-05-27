# Usage Guide

Complete documentation on using Hammurabi for your accounting operations.

## Table of Contents

1. [Creating Entries](#creating-entries)
2. [Starting Transactions](#starting-transactions)
3. [Committing Transactions](#committing-transactions)
4. [Transaction Verification](#transaction-verification)
5. [Error Handling](#error-handling)
6. [TransactionHelper](#transactionhelper)
7. [Use Case: Product Sale with TransactionHelper](#use-case-product-sale-with-transactionhelper)
8. [API Reference](#api-reference)

## Creating Entries

An Entry represents a single debit or credit in a transaction.

### Basic Entry Creation

```typescript
import { Entry } from "hammurabi";

const entry = new Entry({
  accountId: 101,
  amount: 500,
  conceptId: 1
});
```

### Entry Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountId` | number | Yes | The account affected by this entry |
| `amount` | number | Yes | The amount: positive for debits, negative for credits |
| `conceptId` | number | No | Optional category/classification for this entry |
| `quantity` | number | No | Optional quantity (useful for inventory tracking) |

### Debit vs Credit

- **Debit**: Positive amount (e.g., `amount: 100`)
- **Credit**: Negative amount (e.g., `amount: -100`)

```typescript
// Money coming in (debit)
const debitEntry = new Entry({
  accountId: 101,  // Cash account
  amount: 1000
});

// Money going out (credit)
const creditEntry = new Entry({
  accountId: 201,  // Payables account
  amount: -1000
});
```

## Starting Transactions

A transaction represents a complete business event with balanced debits and credits.

### Method 1: Using Description and Entries (Standard)

```typescript
import Hammurabi, { Entry } from "hammurabi";

const ledger = Hammurabi.getLedger();

const entries = [
  new Entry({ accountId: 101, amount: 5000 }),
  new Entry({ accountId: 201, amount: -5000 })
];

ledger.startTransaction("Received customer payment", entries);
```

### Method 2: Using Custom Transaction (Advanced)

For transactions with additional metadata, create a custom Transaction subclass:

```typescript
import Hammurabi, { Transaction, Entry } from "hammurabi";

class InvoiceTransaction extends Transaction {
  invoiceNumber: string;
  customerId: number;

  constructor(description: string, entries: Entry[], invoiceNumber: string, customerId: number) {
    super(description, entries);
    this.invoiceNumber = invoiceNumber;
    this.customerId = customerId;
  }
}

// Create the custom transaction
const customTx = new InvoiceTransaction(
  "Invoice #INV-001 payment",
  entries,
  "INV-001",
  42
);

// Pass it to startTransaction
const ledger = Hammurabi.getLedger();
ledger.startTransaction(customTx);
```

See [CUSTOM_TRANSACTIONS.md](./CUSTOM_TRANSACTIONS.md) for detailed examples.

## Committing Transactions

Once a transaction is started and verified, commit it to the database:

```typescript
import Hammurabi, { Entry } from "hammurabi";

const ledger = Hammurabi.getLedger();

const entries = [
  new Entry({ accountId: 101, amount: 1000 }),
  new Entry({ accountId: 201, amount: -1000 })
];

ledger.startTransaction("Monthly payment", entries);

// Commit to database (async operation)
const savedTransaction = await ledger.commit();

console.log("Transaction saved:", savedTransaction.uuid);
```

## Transaction Verification

Verification happens automatically when you call `startTransaction()`.

### Balance Check

Hammurabi verifies that all entries in a transaction sum to zero:

```typescript
const entries = [
  new Entry({ accountId: 101, amount: 100 }),
  new Entry({ accountId: 201, amount: -100 })  // Sum = 0 ✓
];

ledger.startTransaction("Valid transaction", entries); // Success
```

### Unbalanced Transaction

If entries don't sum to zero, an error is thrown and the transaction is rolled back:

```typescript
const entries = [
  new Entry({ accountId: 101, amount: 100 }),
  new Entry({ accountId: 201, amount: -50 })  // Sum = 50 ✗
];

try {
  ledger.startTransaction("Unbalanced transaction", entries);
} catch (error) {
  console.error(error.message);
  // "Transaction is unbalanced: entries do not sum to zero"
}
```

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
  // Transaction is automatically rolled back
  // The ledger's internal transaction state is cleared
  console.error("Failed:", error.message);
}

// You can now start a new transaction with a fresh ledger
ledger.startTransaction("New transaction", newEntries);
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `No transaction to verify` | startTransaction called before initialization | Ensure DbContext is configured |
| `Transaction is unbalanced` | Debits ≠ Credits | Verify entry amounts sum to zero |
| `No transaction to commit` | commit() called without startTransaction() | Start a transaction first |
| `Entries are required` | Empty entries array | Provide at least 2 entries |
| `Entry validation failed` | Invalid entry data | Check Entry parameters |

### Manual Rollback

You can manually discard a transaction without committing:

```typescript
const ledger = Hammurabi.getLedger();
ledger.startTransaction("Test transaction", entries);

// Change your mind - discard it
ledger.rollback();

// No transaction is now active
await ledger.commit(); // Throws: "No transaction to commit"
```

## TransactionHelper

The TransactionHelper provides utility methods for transaction-related operations.

```typescript
import Hammurabi from "hammurabi";

const helper = Hammurabi.getTransactionHelper();
```

### transfer() Method

The `transfer()` method generates a balanced pair of entries for transferring value between two accounts. It automatically handles the accounting nature of each account type (debits/credits).

**Signature:**
```typescript
transfer({
  FromId: number,
  ToId: number,
  amount: number,
  conceptId?: number,
  quantity?: number
}): Promise<[Entry, Entry]>
```

Returns a promise with a tuple of two entries: `[fromEntry, toEntry]`

### Available Methods

- `transfer()`: Create balanced entry pairs between accounts (see example below)

## Use Case: Product Sale with TransactionHelper

A practical example showing how to record a product sale that involves two separate transfers:
1. **Stock Movement**: Inventory decreases (COGS increases)
2. **Money Movement**: Cash increases (Revenue recorded)

### Scenario

Customer purchases 5 units of Product ABC for $500 total ($100 per unit):
- **Product ABC Cost**: $75 per unit = $375 total cost
- **Revenue**: $500
- **Profit**: $125

### Accounts Used

```
- Account 101: Cash (ASSET)
- Account 102: Inventory (ASSET) 
- Account 201: Cost of Goods Sold (EXPENSE)
- Account 301: Revenue (INCOME)
```

### Implementation

```typescript
import Hammurabi, { Entry } from "hammurabi";

// 1. Initialize
Hammurabi.configure(dbContext);

// 2. Get helper and ledger
const helper = Hammurabi.getTransactionHelper();
const ledger = Hammurabi.getLedger();

// 3. Create entries array for all transfers
const entries: Entry[] = [];

// Transfer 1: Stock Movement
// Inventory (102) → Cost of Goods Sold (201)
// Move $375 worth of inventory out
const [inventoryEntry, cogsEntry] = await helper.transfer({
  FromId: 102,        // Inventory (source)
  ToId: 201,          // COGS (destination)
  amount: 375,
  conceptId: 1,       // Product category
  quantity: 5         // 5 units sold
});

entries.push(inventoryEntry, cogsEntry);

// Transfer 2: Money Movement
// Cash (101) ← Revenue (301)
// Record $500 revenue and debit cash
const [cashEntry, revenueEntry] = await helper.transfer({
  FromId: 301,        // Revenue (source - credit nature)
  ToId: 101,          // Cash (destination - debit nature)
  amount: 500,
  conceptId: 1,       // Sales category
  quantity: 5         // 5 units sold
});

entries.push(cashEntry, revenueEntry);

// 4. All entries are now in the array
// Total: [inventoryOut, cogsIn, revenueOut, cashIn]
console.log(`Total entries: ${entries.length}`);  // 4 entries
console.log(`Sum of amounts: ${entries.reduce((sum, e) => sum + e.amount, 0)}`);  // 0 (balanced)

// 5. Create and commit the transaction
ledger.startTransaction(
  "Sale: 5x Product ABC - Invoice #INV-2024-001",
  entries
);

const savedTransaction = await ledger.commit();
console.log(`✓ Sale recorded: ${savedTransaction.uuid}`);
```

### How It Works

**Transfer 1: Stock Movement**
```
helper.transfer({
  FromId: 102 (Inventory - ASSET type),    // Debit nature
  ToId: 201 (COGS - EXPENSE type),         // Debit nature  
  amount: 375
})

Generates:
- inventoryEntry: { accountId: 102, amount: -375 }  (credit inventory)
- cogsEntry:      { accountId: 201, amount: 375 }   (debit COGS)
```

**Transfer 2: Money Movement**
```
helper.transfer({
  FromId: 301 (Revenue - INCOME type),    // Credit nature
  ToId: 101 (Cash - ASSET type),          // Debit nature
  amount: 500
})

Generates:
- revenueEntry: { accountId: 301, amount: 500 }    (debit revenue - which records it)
- cashEntry:    { accountId: 101, amount: 500 }    (debit cash)
```

### Entry Summary

```
Inventory      (102): -375    (decreases by $375)
COGS           (201): +375    (increases by $375)
Revenue        (301): +500    (recorded/increased)
Cash           (101): +500    (increases by $500)

Total: 0 ✓ (balanced)
```

### Advanced: Using with Custom Transactions

You can also use the helper with custom transactions to add metadata:

```typescript
import InvoiceTransaction from "./InvoiceTransaction";

// Get entries using helper (as above)
const entries = [];
const [invEntry, cogsEntry] = await helper.transfer({...});
const [cashEntry, revEntry] = await helper.transfer({...});
entries.push(invEntry, cogsEntry, cashEntry, revEntry);

// Create custom transaction with additional metadata
const saleTransaction = new InvoiceTransaction(
  "Sale: 5x Product ABC",
  entries,
  "INV-2024-001",
  currentUser,
  currentLocation,
  customerId,
  "approved"
);

// Commit with custom metadata preserved
ledger.startTransaction(saleTransaction);
await ledger.commit();
```

### Tips

- **Use quantity field**: The helper respects the `quantity` parameter for tracking physical units
- **Multiple transfers per transaction**: You can chain multiple `transfer()` calls in one transaction
- **Async operations**: Remember `transfer()` is async (queries account repository), so use `await`
- **Entry order doesn't matter**: Hammurabi only cares that entries balance, not their order
- **Atomic commit**: All transfers in one `startTransaction()` are committed atomically

## API Reference

### Hammurabi (Singleton Engine)

#### configure(dbContext: IDbContext): void

Configures the engine with your database context. **Call this once at application startup.**

```typescript
import Hammurabi from "hammurabi";

Hammurabi.configure(new MyDbContext());
```

**Parameters:**
- `dbContext` (IDbContext): Your implementation with ledgerRepository and accountRepository

**Throws:** Error if dbContext is null/undefined

---

#### getLedger(): Ledger

Returns a new Ledger instance for managing a transaction.

```typescript
const ledger = Hammurabi.getLedger();
ledger.startTransaction("Payment", entries);
await ledger.commit();
```

**Returns:** New Ledger instance

---

#### getTransactionHelper(): TransactionHelper

Returns a new TransactionHelper instance for utility operations.

```typescript
const helper = Hammurabi.getTransactionHelper();
```

**Returns:** New TransactionHelper instance

---

### Ledger Class

#### startTransaction(description: string, entries: Entry[]): void

Starts a new transaction with the given description and entries.

```typescript
ledger.startTransaction("Invoice payment", entries);
```

**Overload 1 - Standard:**
- `description` (string): Human-readable transaction description
- `entries` (Entry[]): Array of debits and credits

**Throws:** Error if entries don't balance or are invalid

---

#### startTransaction(transaction: Transaction): void

Starts a transaction using an existing Transaction instance (for custom subclasses).

```typescript
const customTx = new CustomTransaction(...);
ledger.startTransaction(customTx);
```

**Overload 2 - Custom Transaction:**
- `transaction` (Transaction): A Transaction or subclass instance

**Throws:** Error if entries don't balance or transaction is invalid

---

#### commit(): Promise<Transaction>

Persists the current transaction to the database.

```typescript
const savedTx = await ledger.commit();
console.log(savedTx.uuid);
```

**Returns:** Promise resolving to the saved Transaction

**Throws:** Error if no active transaction

---

#### rollback(): void

Discards the current transaction without persisting.

```typescript
ledger.rollback();
```

**Side Effect:** Clears the internal transaction state

---

### Entry Class

```typescript
new Entry({
  accountId: number,        // Required
  amount: number,           // Required
  conceptId?: number,       // Optional
  quantity?: number,        // Optional
  id?: number              // Optional (set by database)
})
```

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

## Workflow Example: Complete Invoice Payment

```typescript
import Hammurabi, { Entry } from "hammurabi";

// 1. Initialize once at app startup
Hammurabi.configure(new MyDbContext());

// 2. Later, process an invoice payment
const ledger = Hammurabi.getLedger();

const entries = [
  // Debit: Bank account (Cash goes down - credit)
  new Entry({
    accountId: 101,  // Cash account
    amount: -500     // Outflow
  }),
  // Credit: Revenue account (Revenue goes up - debit)
  new Entry({
    accountId: 401,  // Revenue account
    amount: 500      // Inflow
  })
];

// 3. Start and verify (auto-verified)
ledger.startTransaction("Customer invoice payment - Invoice #123", entries);

// 4. Save to database
try {
  const savedTx = await ledger.commit();
  console.log(`✓ Transaction saved: ${savedTx.uuid}`);
} catch (error) {
  console.error(`✗ Failed to save: ${error.message}`);
}
```

## Tips & Best Practices

1. **Always pair debits with credits**: Each transaction must have entries that sum to zero
2. **Use meaningful descriptions**: These help with audit trails and reconciliation
3. **Set conceptId for categorization**: Makes it easier to query and report on transaction types
4. **Handle errors gracefully**: Transactions auto-rollback on error, so catch and respond appropriately
5. **Configure once**: Call `Hammurabi.configure()` in your app initialization, not repeatedly
6. **One transaction at a time**: Each Ledger instance manages one transaction. Get a new Ledger for each transaction.
