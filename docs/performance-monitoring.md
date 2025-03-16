# Performance Monitoring

## Optimizations

If we simply send all transactions without filtering and grouping, it will create a huge load on the service. We need to balance between data completeness and the efficiency of storage and processing.

### 1. Which transactions need to be sent?

#### Problem: Too Much Data in case of full sending

   If we send every transaction:

   - The load on the server increases sharply (especially with high traffic).
   - The huge amount of the data is duplicate information, which does not significantly affect the analysis.
   - "Infinite loops" in client code may generate endless transactions.

#### Solution: Smart Sampling and Grouping

   We do not need all transactions, but we need representative data.

### 2. How to reduce data flow without losing quality?

#### Optimization #1: Sampling (Sending Part of the Data Randomly)

   How not to lose rare and slow requests?

   - We can increase the sampling chance for slow transactions (P95 > 500ms is sent with a probability of 50-100%).
   - Errors (`status` == 'Failure') are always sent.

   See [Sampling](#sampling) for details.

#### Optimization #2: Aggregation of Identical Transactions Before Sending

   Throttling + transaction batches → instead of 1000 separate messages, send 1 `AggregatedTransaction`.

##### Combine transactions with the same name (e.g., GET /api/users) and time window (e.g., 1 second).

Instead of 1000 transactions, send one with count = 1000 and average metrics.

##### How to choose the time?

   - Store P50, P95, P100 (percentiles).
   - Save min(startTime) and max(endTime) to see the interval boundaries and calculate Transactions Per Minute.

   **What do we lose ?**
   - The detail of each specific transaction.
   - Exact startTime and endTime for each transaction.

   **What do we gain?**
   - A sharp reduction in load on the Collector and DB (10-100 times fewer records).
   - All necessary metrics (P50, P95, P100, avg) remain.
   - You can continue to build graphs and calculate metrics, but with less load.

   See [Transaction Aggregation](#transaction-aggregation) for details on how transactions are aggregated.

#### Optimization #3: Filtering "Garbage"

Transactions with duration < `thresholdMs` will not be sent, as they are not critical.


## Data types

### Transaction
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier of the transaction |
| severity | string | Type of transaction sampling ('default' or 'critical'). See [Sampling](#sampling) for details |
| name | string | Name of the transaction |
| startTime | number | Timestamp when transaction started |
| endTime | number | Timestamp when transaction ended |
| duration | number | Total duration of transaction in milliseconds |
| status | string | Status when transaction finished. 'success' (default) or 'failure'. See [Transaction Completion](#2-transaction-completion) |
| spans | Span[] | Array of [spans](#span) associated with this transaction |

### AggregatedTransaction
| Field | Type | Description |
|-------|------|-------------|
| aggregationId | string | Identifier of the aggregation |
| name | string | Name of the transaction |
| avgStartTime | number | Average timestamp when transaction started |
| minStartTime | number | Minimum timestamp when transaction started |
| maxEndTime | number | Maximum timestamp when transaction ended |
| p50duration | number | 50th percentile (median) duration of transaction in milliseconds |
| p95duration | number | 95th percentile duration of transaction in milliseconds |
| maxDuration | number | Maximum duration of transaction in milliseconds |
| count | number | how many transactions aggregated |
| aggregatedSpans | AggregatedSpan[] | List of spans in transactions |


### Span
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier of the span |
| name | string | Name of the span |
| startTime | number | Timestamp when span started |
| endTime | number | Timestamp when span ended |
| duration | number | Total duration of span in milliseconds |

### AggregatedSpan
See [Transaction Aggregation](#transaction-aggregation) for details on how spans are aggregated.

| Field | Type | Description |
|-------|------|-------------|
| aggregationId | string | Unique identifier of the span aggregation |
| name | string | Name of the span |
| minStartTime | number | Minimum timestamp when span started |
| maxEndTime | number | Maximum timestamp when span ended |
| p50duration | number | 50th percentile (median) duration of span in milliseconds |
| p95duration | number | 95th percentile duration of span in milliseconds |
| maxDuration | number | Maximum duration of span in milliseconds |

## Transaction Lifecycle

### 1. Transaction Creation

When creating a transaction, you can specify its type:

- 'critical' - important transactions that are always sent to the server
- 'default' - regular transactions that go through the [sampling process](#sampling)

### 2. Transaction Completion

When completing a transaction:

1. A finish status is specified (`status`):
   - 'success' (default) - successful completion
   - 'failure' - completion with error (such transactions are always sent to the server)

2. The transaction duration is checked:
   - If `thresholdMs` parameter is specified and the transaction duration is less than this value, the transaction is discarded
   - Default `thresholdMs` is 20ms
   - `status` "failure" has a priority over `thresholdMs`
   - Otherwise, the transaction goes through the [sampling process](#sampling)

3. After successful sampling, the transaction is added to the list for sending

### 3. Sending Transactions

- When the first transaction is added to the list, a timer starts
- When the timer expires:
  1. All collected transactions are [aggregated](#transaction-aggregation)
  2. Aggregated data is sent to the server
  3. The transaction list is cleared

## Sampling

- The probability of sending transactions is configured through the `performance.sampleRate` parameter (value from 0 to 1)
- Only transactions of type 'default' with finish status 'success' are subject to sampling
- Sampling process:
  1. A random number between 0 and 1 is generated for each transaction
  2. If the number is less than or equal to sampleRate, the transaction is sent

## Transaction Aggregation

1. [Transactions](#transaction) are grouped by name (name field)
2. For each group, statistical indicators are calculated:
   - minStartTime - earliest start time
   - maxEndTime - latest end time
   - p50duration - median duration (50th percentile)
   - p95duration - 95th percentile duration
   - maxDuration - maximum duration

3. Based on this data, [AggregatedTransaction](#aggregatedtransaction) objects are created
4. For each aggregated transaction:
   - [Spans](#span) are grouped by name
   - Their own statistical indicators (see [AggregatedSpan](#aggregatedspan)) are calculated for each span group
   - [AggregatedSpan](#aggregatedspan) objects are created
