# Batch File Processing: Results Report Export

## Question 1

**User:** I have a database schema where via a service bus trigger I process records. Records are received in batch files. Processing is performed on a pending record basis regardless of input file. However when eventually all records of a file have been processed then I want to export a results report for records of the file. I am thinking of creating a timer triggered process that checks the database table for files with no pending records. It will compare against the files that are still in the 'processing' folder and for all matching names it will export the result files.

**Assistant:** The plan works, but it has a few weak spots.

### Make completion explicit instead of polling the folder
- Track each file in an `InputFile` table with `Status` (Processing/Completed/Reported), `TotalRecords`, and `ReportedAt`.
- Each record carries a `FileId`. A file is complete when `NOT EXISTS (pending records)` and `Status = 'Processing'`.
- Don't rely on file names alone, because a re-uploaded file with the same name would be matched incorrectly. Use the FileId and the blob name together.

### Timer trigger flow
1. Query for files with `Status='Processing'` and no records in Pending, or in-flight state.
2. For each file, atomically claim it: `UPDATE InputFile SET Status='Reporting' WHERE Id=@id AND Status='Processing'`. If 0 rows are affected, skip it. This stops two timer instances, or overlapping runs, from exporting twice.
3. Generate the report and write it to the `results` container or folder.
4. Move the source blob from `processing` to `processed`.
5. Set `Status='Reported'`. If any step fails, reset to `Processing` or leave it `Reporting` with a timestamp, so a retry can reclaim stale claims.

### Gotchas
- **Race with ingestion:** if the file is still being loaded, it can briefly have zero pending records. The `TotalRecords` check handles this: the count of processed records must equal `TotalRecords`, and the file must be flagged `LoadComplete`.
- **Failed records:** decide whether "error" or "dead-lettered" counts as done. Use a terminal-state list rather than just "not pending".
- **Idempotency:** write the report with a deterministic name (e.g. `{file}_results.csv`) and overwrite it, so a retry is safe.
- **Folder check:** the blob in `processing` is then only a cleanup step, not the source of truth. Use the DB for the decision.

### Alternative to polling
Have the record processor, after finishing a record, run the claim query for its file (`UPDATE ... WHERE no pending remain`). Whichever invocation wins the claim sends a "ReportFile" message to a queue, and a second trigger generates the report. That gives immediate reports with no timer. Keep the timer as a safety net for missed files.

---

## Question 2

**User:** I already have the file table as you described it. Excepted for the reported status. I want to have rows processing decoupled from having to check which file they belong to and if the file is completed. Other similar batch processing flows implemented in this db schema tables (different file types/processing type may be supported) might not have a reporting step.

**Assistant:** That fits the timer approach. Completion detection and reporting stay out of the record processor, and the shared schema doesn't change for flows without a report.

### Keep reporting out of the file lifecycle
- Don't add a `Reported` status to the file table. Use a separate `FileReport` table instead: `FileId` (PK/FK), `Status` (Claimed/Done/Failed), `ClaimedAt`, `CompletedAt`, `ResultPath`.
- Only flows that report write to it. Flows with no reporting step never touch it.

### Opt in per file type
- Add a `FileType` config (or a column such as `HasReport`/`ReportHandler`) that says whether a type produces a report.
- The timer only considers files of types where that flag is set, so other flows are unaffected.

### Timer function
1. Select files where:
   - the type has reporting enabled
   - the file is fully loaded
   - no records are in a non-terminal state
   - there is no `FileReport` row with `Status='Done'`
2. Claim each file by inserting into `FileReport` with `Status='Claimed'`. A PK violation means someone else has it, so skip it. Reclaim rows that stay `Claimed` past a timeout, using `ClaimedAt`.
3. Export the report to a deterministic path so retries can safely overwrite it.
4. Mark the row `Done`, then move the blob out of `processing`. If the move fails, the next run only needs to retry the move, since the report is already `Done`.

### Notes
- Record processing stays untouched. Workers only update record state, and nothing in them knows about files or reports.
- Define "terminal" as an explicit list of states (processed, failed, etc.) rather than "not pending".
- Per-type report logic can be a handler keyed by file type, which lets different formats be added later.

Open item: the stack (C# or JS, SQL Server or Postgres) was not specified; with it, the schema, selection query and function can be written.
