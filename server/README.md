# ToolSQL local SQL Server backend

Requires Windows, .NET 8 SDK, SQL Server 2019+, and a SQL Login with metadata/view-definition access to the target database.

## Configure

Run from `server/ToolSql.Server`:

```powershell
dotnet run
```

Open <http://127.0.0.1:5178>, choose **SQL Server Export**, and enter server/instance, database, SQL Login, and password. Setup tests the connection before writing `%LOCALAPPDATA%\ToolSQL\.env`. The connection uses SQL Authentication with `Encrypt=True`; `.env` stores only a DPAPI `CurrentUser` ciphertext usable by the same Windows user on the same machine. Enable **Trust server certificate** only when the server certificate is not trusted.

## Run

Set `TOOLSQL_PORT` to change the port; the server always binds to `127.0.0.1`.

Run `dotnet run -- self-test` for the focused request-validation check.

The export API accepts only a whitelisted object type plus schema/name and does not accept arbitrary SQL. Fast mode reads `sys.*` catalog metadata in set-based queries: stored procedure definitions, and table columns, identity, defaults, and primary keys. It does not export table rows, foreign keys, secondary indexes, triggers, check constraints, or computed columns.

The SQL session uses `LOCK_TIMEOUT 0`: if schema metadata is locked, export fails immediately instead of waiting behind the lock. SQL Server may still take a very brief schema-stability (`Sch-S`) lock while reading metadata; this does not block DML, but may briefly conflict with concurrent schema changes.
