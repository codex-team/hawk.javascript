# Performance Monitoring

## Data types

### Transaction
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier of the transaction |
| type | string | Type of transaction sampling ('default' or 'critical'). See [Sampling](#sampling) for details |
| name | string | Name of the transaction |
| startTime | number | Timestamp when transaction started |
| endTime | number | Timestamp when transaction ended |
| duration | number | Total duration of transaction in milliseconds |
| finishStatus | string | Status when transaction finished. 'success' (default) or 'failure'. See [Transaction Completion](#2-transaction-completion) |
| spans | Span[] | Array of [spans](#span) associated with this transaction |
| tags | object | Additional context data attached to transaction |

### AggregatedTransaction
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier of the transaction |
| name | string | Name of the transaction |
| avgStartTime | number | Average timestamp when transaction started |
| minStartTime | number | Minimum timestamp when transaction started |
| maxEndTime | number | Maximum timestamp when transaction ended |
| p50duration | number | 50th percentile (median) duration of transaction in milliseconds |
| p95duration | number | 95th percentile duration of transaction in milliseconds |
| maxDuration | number | Maximum duration of transaction in milliseconds |

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
| id | string | Unique identifier of the span |
| name | string | Name of the span |
| avgStartTime | number | Average timestamp when span started |
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
1. A finish status is specified (finishStatus):
   - 'success' (default) - successful completion
   - 'failure' - completion with error (such transactions are always sent to the server)

2. The transaction duration is checked:
   - If thresholdMs parameter is specified and the transaction duration is less than this value, the transaction is discarded
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
   - The same statistical indicators are calculated for each span group
   - [AggregatedSpan](#aggregatedspan) objects are created
