# Person import: idempotent processing and seq-no validation

Exported session discussion. The code was not compiled or run against a database.

## 1. Requirement

Person records are imported with name, surname, father name, date of birth and tax id. They also carry a preassigned seq number. Processing may fail. If the same person is resent later, it must not be reprocessed unless it carries a different seq no.

## 2. Initial design

- **Identity key:** SHA-256 hash of the normalized `(name, surname, fatherName, dateOfBirth, taxId)`. Trim whitespace, casefold, use ISO dates.
- **Ledger:** one row per person with `person_key` (unique), `seq_no`, `status` (Pending/Failed/Succeeded), `attempts`, `last_error`, `updated_at`.
- **Per record:**
  1. No row: insert it as Pending and process.
  2. Row with the same seq no: skip.
  3. Row with a different seq no: update the seq no, set it to Pending and process.
  4. On finishing, set Succeeded or Failed.
- Use an atomic upsert, and write the ledger in a separate transaction from the processing.
- Open question: should only higher seq nos be accepted?

## 3. Azure SQL + C# Azure Function (per-record)

```sql
CREATE TABLE dbo.PersonImportLedger (
    PersonKey   BINARY(32)    NOT NULL PRIMARY KEY,
    SeqNo       BIGINT        NOT NULL,
    Status      TINYINT       NOT NULL,   -- 0=Pending 1=Succeeded 2=Failed
    Attempts    INT           NOT NULL DEFAULT 1,
    LastError   NVARCHAR(2000) NULL,
    UpdatedAt   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
```

```csharp
public record PersonRecord(string Name, string Surname, string FatherName,
                           DateOnly DateOfBirth, string TaxId, long SeqNo);

public class PersonImporter(string connStr, IPersonProcessor processor)
{
    static byte[] Key(PersonRecord p)
    {
        static string N(string s) => s.Trim().ToUpperInvariant();
        var raw = string.Join("|", N(p.Name), N(p.Surname), N(p.FatherName),
                              p.DateOfBirth.ToString("yyyy-MM-dd"), N(p.TaxId));
        return SHA256.HashData(Encoding.UTF8.GetBytes(raw));
    }

    const string ClaimSql = @"
MERGE dbo.PersonImportLedger WITH (HOLDLOCK) AS t
USING (SELECT @k AS PersonKey, @seq AS SeqNo) AS s ON t.PersonKey = s.PersonKey
WHEN MATCHED AND t.SeqNo <> s.SeqNo THEN
    UPDATE SET SeqNo = s.SeqNo, Status = 0, Attempts = t.Attempts + 1,
               LastError = NULL, UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (PersonKey, SeqNo, Status) VALUES (s.PersonKey, s.SeqNo, 0)
OUTPUT $action;";

    public async Task<bool> ImportAsync(PersonRecord p, CancellationToken ct)
    {
        var key = Key(p);
        await using var conn = new SqlConnection(connStr);
        await conn.OpenAsync(ct);

        await using (var cmd = new SqlCommand(ClaimSql, conn))
        {
            cmd.Parameters.Add("@k", SqlDbType.Binary, 32).Value = key;
            cmd.Parameters.AddWithValue("@seq", p.SeqNo);
            if (await cmd.ExecuteScalarAsync(ct) is null) return false; // same SeqNo: skip
        }

        try
        {
            await processor.ProcessAsync(p, ct);
            await SetStatus(conn, key, p.SeqNo, 1, null, ct);
            return true;
        }
        catch (Exception ex)
        {
            await SetStatus(conn, key, p.SeqNo, 2, ex.Message, ct);
            throw;
        }
    }

    static async Task SetStatus(SqlConnection c, byte[] key, long seq, byte status,
                                string? err, CancellationToken ct)
    {
        await using var cmd = new SqlCommand(@"UPDATE dbo.PersonImportLedger
            SET Status=@s, LastError=@e, UpdatedAt=SYSUTCDATETIME()
            WHERE PersonKey=@k AND SeqNo=@seq", c);
        cmd.Parameters.AddWithValue("@s", status);
        cmd.Parameters.AddWithValue("@e", (object?)err?[..Math.Min(err.Length, 2000)] ?? DBNull.Value);
        cmd.Parameters.Add("@k", SqlDbType.Binary, 32).Value = key;
        cmd.Parameters.AddWithValue("@seq", seq);
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
```

Notes:
- Register the importer as a singleton.
- Queue and Service Bus triggers redeliver on exceptions. A same-seq resend is skipped, so failures are not retried automatically.
- To retry failures with the same seq no, change the MERGE condition to `t.SeqNo <> s.SeqNo OR t.Status = 2`.
- The claim is atomic (`MERGE` with `HOLDLOCK`).
- A crash after the claim leaves the row Pending. Add a stale-Pending timeout if you want recovery.

## 4. Daily batch files (a few thousand rows) with a staging table

A bulk Azure Function loads and prevalidates the file into a staging table. The seq-no validation runs against all previously processed records. The assumed rule is that a seq no must not belong to a different person.

```sql
CREATE TABLE dbo.PersonProcessed (
    PersonKey BINARY(32) NOT NULL PRIMARY KEY,
    SeqNo     BIGINT NOT NULL,
    ProcessedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_PersonProcessed_SeqNo UNIQUE (SeqNo)
);
-- dbo.PersonStaging(StagingId, BatchId, Name, Surname, FatherName, DateOfBirth, TaxId,
--                   SeqNo, PersonKey BINARY(32), Status TINYINT, Error NVARCHAR(500))
-- Status: 0=New 1=Skipped 2=Valid 3=Rejected 4=Done
CREATE INDEX IX_Staging_Batch ON dbo.PersonStaging(BatchId, Status) INCLUDE (PersonKey, SeqNo);
```

Set-based steps, in order:

```sql
-- 0. Intra-batch duplicate persons: keep the last, reject the rest
WITH d AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY PersonKey ORDER BY StagingId DESC) rn
           FROM dbo.PersonStaging WHERE BatchId=@b AND Status=0)
UPDATE d SET Status=3, Error='Duplicate person in batch' WHERE rn>1;

-- 1. Same person and same SeqNo already processed -> skip
UPDATE s SET Status=1
FROM dbo.PersonStaging s
JOIN dbo.PersonProcessed p ON p.PersonKey=s.PersonKey AND p.SeqNo=s.SeqNo
WHERE s.BatchId=@b AND s.Status=0;

-- 2. SeqNo already used by a different person -> reject
UPDATE s SET Status=3, Error='SeqNo already assigned to another person'
FROM dbo.PersonStaging s
JOIN dbo.PersonProcessed p ON p.SeqNo=s.SeqNo AND p.PersonKey<>s.PersonKey
WHERE s.BatchId=@b AND s.Status=0;

-- 3. SeqNo collisions between different persons inside the batch -> reject
UPDATE s SET Status=3, Error='SeqNo duplicated in batch'
FROM dbo.PersonStaging s
WHERE s.BatchId=@b AND s.Status=0
  AND EXISTS (SELECT 1 FROM dbo.PersonStaging o
              WHERE o.BatchId=s.BatchId AND o.SeqNo=s.SeqNo
                AND o.PersonKey<>s.PersonKey AND o.Status IN (0,2));

-- 4. Remaining rows are valid
UPDATE dbo.PersonStaging SET Status=2 WHERE BatchId=@b AND Status=0;
```

Recording success, in one transaction per record:

```sql
MERGE dbo.PersonProcessed AS t
USING (SELECT PersonKey, SeqNo FROM dbo.PersonStaging WHERE StagingId=@id) s
ON t.PersonKey=s.PersonKey
WHEN MATCHED THEN UPDATE SET SeqNo=s.SeqNo, ProcessedAt=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (PersonKey,SeqNo) VALUES (s.PersonKey,s.SeqNo);
UPDATE dbo.PersonStaging SET Status=4 WHERE StagingId=@id;
```

Notes:
- Only successes are recorded, so failed records are retried when resent.
- Take a per-batch lock (`sp_getapplock`).

## 5. Clarification: the batch import is generic

This validation is an extra requirement for only some processes. The design is therefore opt-in and scoped per process.

```sql
CREATE TABLE dbo.PersonProcessed (
    ProcessCode VARCHAR(50) NOT NULL,
    PersonKey   BINARY(32)  NOT NULL,
    SeqNo       BIGINT      NOT NULL,
    ProcessedAt DATETIME2   NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY (ProcessCode, PersonKey)
);
```

```csharp
public interface IBatchValidator
{
    Task ValidateAsync(SqlConnection c, Guid batchId, CancellationToken ct);
}

public class SeqNoIdempotencyValidator(string processCode) : IBatchValidator
{
    public async Task ValidateAsync(SqlConnection c, Guid batchId, CancellationToken ct)
    {
        const string sql = @"
UPDATE s SET Status = 1  -- Skipped
FROM dbo.PersonStaging s
JOIN dbo.PersonProcessed p
  ON p.ProcessCode = @pc AND p.PersonKey = s.PersonKey AND p.SeqNo = s.SeqNo
WHERE s.BatchId = @b AND s.Status = 0;";
        await using var cmd = new SqlCommand(sql, c);
        cmd.Parameters.AddWithValue("@pc", processCode);
        cmd.Parameters.AddWithValue("@b", batchId);
        await cmd.ExecuteNonQueryAsync(ct);
    }
}

var pipelines = new Dictionary<string, IBatchValidator[]>
{
    ["GENERIC_A"] = [ new CommonValidator() ],
    ["SPECIAL_B"] = [ new CommonValidator(), new SeqNoIdempotencyValidator("SPECIAL_B") ],
};
```

Notes:
- Processes without the validator behave as before.
- Write to `PersonProcessed` only for processes that registered the validator, through a post-success hook.
- The `PersonKey` computation lives in the generic loader.
- If cross-person seq collisions matter, add a `SeqNoUniquenessValidator` (steps 2–3 filtered by `ProcessCode`). Do not add a unique constraint on `(ProcessCode, SeqNo)` until that rule is confirmed.

## Open questions

- Should a failed record resent with the same seq no be retried?
- Is the rule "no seq-no collision across persons", or "seq no must be greater than the previous one"?
