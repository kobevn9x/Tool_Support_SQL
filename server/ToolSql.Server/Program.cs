using System.Data;
using System.Text.Json;
using System.Security.Cryptography;
using System.Text;
using System.Globalization;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.FileProviders;

const string protectedConnectionKey = "TOOLSQL_CONNECTION_PROTECTED";
var envFile = Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
    "ToolSQL",
    ".env");

if (args.FirstOrDefault()?.Equals("self-test", StringComparison.OrdinalIgnoreCase) == true)
{
    return RunSelfTest();
}

var builder = WebApplication.CreateBuilder(args);
var port = int.TryParse(Environment.GetEnvironmentVariable("TOOLSQL_PORT"), out var configuredPort)
    && configuredPort is > 0 and <= 65535
        ? configuredPort
        : 5178;
builder.WebHost.UseUrls($"http://127.0.0.1:{port}");
builder.Services.AddSingleton(new SqlExportService(envFile, protectedConnectionKey));
builder.Services.AddCors();

var app = builder.Build();
var webRoot = FindWebRoot(builder.Environment.ContentRootPath, AppContext.BaseDirectory, Environment.CurrentDirectory);

app.Use(async (context, next) =>
{
    var host = context.Request.Host.Host;
    if (!host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase)
        && !host.Equals("localhost", StringComparison.OrdinalIgnoreCase))
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }

    await next();
});

app.UseCors(static policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());

if (webRoot is not null)
{
    foreach (var directory in new[] { "css", "js", "vendor" })
    {
        var path = Path.Combine(webRoot, directory);
        if (Directory.Exists(path))
        {
            app.UseStaticFiles(StaticFiles(webRoot, directory));
        }
    }

    var htmlPath = Path.Combine(webRoot, "sql-formatter.html");
    if (File.Exists(htmlPath))
    {
        app.MapGet("/", () => Results.File(htmlPath, "text/html; charset=utf-8"));
    }
}

app.MapGet("/api/sql/status", async (SqlExportService sql, CancellationToken cancellationToken) =>
    Results.Ok(await sql.GetStatusAsync(cancellationToken)));
app.MapPost("/api/sql/setup", async (ConnectionSetupRequest request, SqlExportService sql, CancellationToken cancellationToken) =>
{
    if (!ConnectionSetupRequest.IsValid(request))
    {
        return Results.BadRequest(new { error = "Server, database, user name, and password are required." });
    }

    try
    {
        return Results.Ok(await sql.SetupAsync(request, cancellationToken));
    }
    catch (SqlException)
    {
        return Results.Problem("Cannot connect with the supplied SQL Authentication credentials.", statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    catch (CryptographicException)
    {
        return Results.Problem("Cannot encrypt the connection settings for this Windows user.", statusCode: StatusCodes.Status503ServiceUnavailable);
    }
});

app.MapGet("/api/sql/objects", async (SqlExportService sql, CancellationToken cancellationToken) =>
{
    try
    {
        return Results.Ok(await sql.GetObjectsAsync(cancellationToken));
    }
    catch (InvalidOperationException exception)
    {
        return Results.Problem(exception.Message, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    catch (SqlException exception)
    {
        return Results.Problem(exception.Message, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
});

app.MapPost("/api/sql/scripts", async (ScriptBatchRequest request, SqlExportService sql, CancellationToken cancellationToken) =>
{
    if (!ScriptBatchRequest.IsValid(request))
    {
        return Results.BadRequest(new { error = "Select between 1 and 2,000 valid database objects." });
    }

    try
    {
        return Results.Ok(await sql.ScriptAsync(request.Objects, cancellationToken));
    }
    catch (KeyNotFoundException exception)
    {
        return Results.NotFound(new { error = exception.Message });
    }
    catch (InvalidOperationException exception)
    {
        return Results.Problem(exception.Message, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    catch (SqlException exception)
    {
        return Results.Problem(exception.Message, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
});

app.Lifetime.ApplicationStarted.Register(() =>
    Console.WriteLine($"ToolSQL server listening on http://127.0.0.1:{port}"));

try
{
    await app.RunAsync();
    return 0;
}
catch (IOException exception)
{
    Console.Error.WriteLine($"Cannot start ToolSQL server on http://127.0.0.1:{port}. {exception.Message}");
    return 1;
}

static string? FindWebRoot(params string[] starts)
{
    foreach (var start in starts
        .Where(path => !string.IsNullOrWhiteSpace(path))
        .Distinct(StringComparer.OrdinalIgnoreCase))
    {
        DirectoryInfo? directory;
        try
        {
            directory = new DirectoryInfo(Path.GetFullPath(start));
        }
        catch (Exception)
        {
            continue;
        }

        for (var depth = 0; directory is not null && depth < 8; depth++, directory = directory.Parent)
        {
            try
            {
                if (File.Exists(Path.Combine(directory.FullName, "sql-formatter.html")))
                {
                    return directory.FullName;
                }
            }
            catch (Exception)
            {
                break;
            }
        }
    }

    return null;
}

static StaticFileOptions StaticFiles(string root, string directory) => new()
{
    FileProvider = new PhysicalFileProvider(Path.Combine(root, directory)),
    RequestPath = $"/{directory}"
};

static int RunSelfTest()
{
    var cases = new[]
    {
        ScriptRequest.IsValid(new("Table", "dbo", "Order Details")),
        !ScriptRequest.IsValid(new("View", "dbo", "Orders")),
        !ScriptRequest.IsValid(new("StoredProcedure", "dbo", "bad\nname")),
        !ScriptRequest.IsValid(new("Table", "dbo", new string('x', 129))),
        ScriptBatchRequest.IsValid(new([new("Table", "dbo", "Orders")])),
        !ScriptBatchRequest.IsValid(new([])),
        ConnectionSetupRequest.IsValid(new("server", "database", "user", "password", false)),
        !ConnectionSetupRequest.IsValid(new("server", "database", "user", "", false))
    };
    if (cases.All(result => result))
    {
        Console.WriteLine("Self-test passed.");
        return 0;
    }

    Console.Error.WriteLine("Self-test failed.");
    return 1;
}

sealed class SqlExportService(string envFile, string protectedConnectionKey)
{
    private const string NonBlockingSessionSettings = "SET LOCK_TIMEOUT 0; SET DEADLOCK_PRIORITY LOW; SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;";
    private const string ObjectQuery = """
        SELECT N'StoredProcedure', SCHEMA_NAME(schema_id), name
        FROM sys.procedures
        WHERE is_ms_shipped = 0
        UNION ALL
        SELECT N'Table', SCHEMA_NAME(schema_id), name
        FROM sys.tables
        WHERE is_ms_shipped = 0
        ORDER BY 1, 2, 3;
        """;
    private const string FastProcedureQuery = """
        SELECT sch.name, p.name, m.definition, m.uses_ansi_nulls, m.uses_quoted_identifier
        FROM sys.procedures p
        INNER JOIN sys.schemas sch ON sch.schema_id = p.schema_id
        INNER JOIN OPENJSON(@procedures) WITH (s nvarchar(128) '$.s', n nvarchar(128) '$.n') sel
            ON sel.s = sch.name AND sel.n = p.name
        INNER JOIN sys.sql_modules m ON m.object_id = p.object_id
        WHERE p.is_ms_shipped = 0;
        """;
    private const string FastColumnQuery = """
        SELECT sch.name, t.name, c.name, c.column_id, ty.name, c.max_length, c.precision, c.scale,
               c.is_nullable, c.is_identity, ic.seed_value, ic.increment_value, dc.definition
        FROM sys.tables t
        INNER JOIN sys.schemas sch ON sch.schema_id = t.schema_id
        INNER JOIN OPENJSON(@tables) WITH (s nvarchar(128) '$.s', n nvarchar(128) '$.n') sel
            ON sel.s = sch.name AND sel.n = t.name
        INNER JOIN sys.columns c ON c.object_id = t.object_id
        INNER JOIN sys.types ty ON ty.user_type_id = c.user_type_id
        LEFT JOIN sys.identity_columns ic ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        LEFT JOIN sys.default_constraints dc ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
        WHERE t.is_ms_shipped = 0
        ORDER BY 1, 2, c.column_id;
        """;
    private const string FastPrimaryKeyQuery = """
        SELECT sch.name, t.name, k.name, c.name, ic.key_ordinal
        FROM sys.tables t
        INNER JOIN sys.schemas sch ON sch.schema_id = t.schema_id
        INNER JOIN OPENJSON(@tables) WITH (s nvarchar(128) '$.s', n nvarchar(128) '$.n') sel
            ON sel.s = sch.name AND sel.n = t.name
        INNER JOIN sys.key_constraints k ON k.parent_object_id = t.object_id AND k.type = 'PK'
        INNER JOIN sys.index_columns ic ON ic.object_id = k.parent_object_id AND ic.index_id = k.unique_index_id
        INNER JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE t.is_ms_shipped = 0
        ORDER BY 1, 2, 3, ic.key_ordinal;
        """;
    private const string FastIndexQuery = """
        SELECT sch.name, t.name, i.name, i.is_unique, i.type, i.filter_definition,
               c.name, ic.is_descending_key, ic.is_included_column
        FROM sys.tables t
        INNER JOIN sys.schemas sch ON sch.schema_id = t.schema_id
        INNER JOIN OPENJSON(@tables) WITH (s nvarchar(128) '$.s', n nvarchar(128) '$.n') sel
            ON sel.s = sch.name AND sel.n = t.name
        INNER JOIN sys.indexes i ON i.object_id = t.object_id
        INNER JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
        INNER JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE t.is_ms_shipped = 0
          AND i.is_primary_key = 0
          AND i.is_hypothetical = 0
          AND i.type IN (1, 2)
          AND i.name IS NOT NULL
        ORDER BY 1, 2, i.index_id, ic.is_included_column, ic.key_ordinal, ic.index_column_id;
        """;

    public async Task<ConnectionStatus> GetStatusAsync(CancellationToken cancellationToken)
    {
        if (!TryGetConnectionString(out var connectionString, out var error, out var configured))
        {
            return new(configured, false, null, null, error);
        }

        var settings = new SqlConnectionStringBuilder(connectionString) { ConnectTimeout = 5 };
        try
        {
            await using var connection = new SqlConnection(settings.ConnectionString);
            await connection.OpenAsync(cancellationToken);
            return new(true, true, settings.DataSource, settings.InitialCatalog, null);
        }
        catch (SqlException)
        {
            return new(true, false, settings.DataSource, settings.InitialCatalog, "SQL Server connection failed.");
        }
    }

    public async Task<ConnectionStatus> SetupAsync(ConnectionSetupRequest request, CancellationToken cancellationToken)
    {
        if (!OperatingSystem.IsWindows())
        {
            throw new CryptographicException("DPAPI connection settings require Windows.");
        }

        var connectionString = new SqlConnectionStringBuilder
        {
            DataSource = request.Server.Trim(),
            InitialCatalog = request.Database.Trim(),
            UserID = request.Username.Trim(),
            Password = request.Password,
            IntegratedSecurity = false,
            Encrypt = true,
            TrustServerCertificate = request.TrustServerCertificate,
            PersistSecurityInfo = false,
            ConnectTimeout = 10,
            ApplicationName = "ToolSQL"
        }.ConnectionString;

        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        var encrypted = ProtectedData.Protect(
            Encoding.UTF8.GetBytes(connectionString),
            null,
            DataProtectionScope.CurrentUser);
        WriteEnvValue(envFile, protectedConnectionKey, Convert.ToBase64String(encrypted));
        return new(true, true, request.Server.Trim(), request.Database.Trim(), null);
    }

    public async Task<SqlObjectsResponse> GetObjectsAsync(CancellationToken cancellationToken)
    {
        await using var connection = await OpenConnectionAsync(cancellationToken);
        await using var command = new SqlCommand(ObjectQuery, connection) { CommandTimeout = 15 };
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var procedures = new List<SqlObject>();
        var tables = new List<SqlObject>();

        while (await reader.ReadAsync(cancellationToken))
        {
            var item = new SqlObject(reader.GetString(0), reader.GetString(1), reader.GetString(2));
            (item.Type == "Table" ? tables : procedures).Add(item);
        }

        return new(procedures, tables);
    }

    public async Task<ScriptsResponse> ScriptAsync(IReadOnlyList<ScriptRequest> requests, CancellationToken cancellationToken)
    {
        await using var connection = await OpenConnectionAsync(cancellationToken);
        var scripts = await FastScriptsAsync(connection, requests, cancellationToken);
        return new(requests.Select(request => scripts.TryGetValue((request.Type, request.Schema, request.Name), out var script)
            ? script
            : throw new KeyNotFoundException($"{request.Type} [{request.Schema}].[{request.Name}] was not found.")).ToList());
    }

    private static async Task<Dictionary<(string, string, string), ScriptResponse>> FastScriptsAsync(
        SqlConnection connection, IReadOnlyList<ScriptRequest> requests, CancellationToken cancellationToken)
    {
        var procedureKeys = requests.Where(item => item.Type == "StoredProcedure").Select(item => (item.Schema, item.Name)).ToHashSet();
        var tableKeys = requests.Where(item => item.Type == "Table").Select(item => (item.Schema, item.Name)).ToHashSet();
        var scripts = new Dictionary<(string, string, string), ScriptResponse>();
        if (procedureKeys.Count == 0 && tableKeys.Count == 0) return scripts;

        var sql = new StringBuilder();
        await using var command = new SqlCommand { Connection = connection, CommandTimeout = 15 };
        if (procedureKeys.Count > 0)
        {
            sql.Append(FastProcedureQuery);
            command.Parameters.Add("@procedures", SqlDbType.NVarChar, -1).Value = JsonSerializer.Serialize(
                procedureKeys.Select(item => new { s = item.Schema, n = item.Name }));
        }

        if (tableKeys.Count > 0)
        {
            sql.Append(FastColumnQuery);
            sql.Append(FastPrimaryKeyQuery);
            sql.Append(FastIndexQuery);
            command.Parameters.Add("@tables", SqlDbType.NVarChar, -1).Value = JsonSerializer.Serialize(
                tableKeys.Select(item => new { s = item.Schema, n = item.Name }));
        }

        command.CommandText = sql.ToString();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        if (procedureKeys.Count > 0)
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                if (reader.IsDBNull(2)) continue;
                var schema = reader.GetString(0);
                var name = reader.GetString(1);
                var content = $"SET ANSI_NULLS {(reader.GetBoolean(3) ? "ON" : "OFF")}\nGO\nSET QUOTED_IDENTIFIER {(reader.GetBoolean(4) ? "ON" : "OFF")}\nGO\n{reader.GetString(2).TrimEnd()}\nGO\n";
                scripts.Add(("StoredProcedure", schema, name), new($"{SafeFilePart(name)}.Procedure.sql", content));
            }

            if (tableKeys.Count == 0) return scripts;
            await reader.NextResultAsync(cancellationToken);
        }

        var tables = new Dictionary<(string, string), List<FastColumn>>();
        while (await reader.ReadAsync(cancellationToken))
        {
            var key = (reader.GetString(0), reader.GetString(1));
            if (!tables.TryGetValue(key, out var columns)) tables[key] = columns = [];
            columns.Add(new(reader.GetString(2), reader.GetString(4), reader.GetInt16(5), reader.GetByte(6), reader.GetByte(7),
                reader.GetBoolean(8), reader.GetBoolean(9), reader.IsDBNull(10) ? null : Convert.ToString(reader.GetValue(10), CultureInfo.InvariantCulture),
                reader.IsDBNull(11) ? null : Convert.ToString(reader.GetValue(11), CultureInfo.InvariantCulture), reader.IsDBNull(12) ? null : reader.GetString(12)));
        }

        await reader.NextResultAsync(cancellationToken);
        var primaryKeys = new Dictionary<(string, string), FastPrimaryKey>();
        while (await reader.ReadAsync(cancellationToken))
        {
            var key = (reader.GetString(0), reader.GetString(1));
            if (!primaryKeys.TryGetValue(key, out var primaryKey)) primaryKeys[key] = primaryKey = new(reader.GetString(2), []);
            primaryKey.Columns.Add(reader.GetString(3));
        }

        await reader.NextResultAsync(cancellationToken);
        var indexes = new Dictionary<(string, string), List<FastIndex>>();
        var indexLookup = new Dictionary<(string, string, string), FastIndex>();
        while (await reader.ReadAsync(cancellationToken))
        {
            var key = (reader.GetString(0), reader.GetString(1));
            var indexName = reader.GetString(2);
            var indexKey = (key.Item1, key.Item2, indexName);
            if (!indexLookup.TryGetValue(indexKey, out var index))
            {
                index = new(indexName, reader.GetBoolean(3), reader.GetByte(4) == 1, reader.IsDBNull(5) ? null : reader.GetString(5), []);
                indexLookup[indexKey] = index;
                if (!indexes.TryGetValue(key, out var list)) indexes[key] = list = [];
                list.Add(index);
            }
            index.Columns.Add(new(reader.GetString(6), reader.GetBoolean(7), reader.GetBoolean(8)));
        }

        foreach (var item in tables)
        {
            scripts.Add(("Table", item.Key.Item1, item.Key.Item2),
                new($"{SafeFilePart(item.Key.Item2)}.Table.sql",
                    BuildTableScript(item.Key.Item1, item.Key.Item2, item.Value, primaryKeys.GetValueOrDefault(item.Key), indexes.GetValueOrDefault(item.Key))));
        }

        return scripts;
    }

    private static string BuildTableScript(string schema, string name, IReadOnlyList<FastColumn> columns, FastPrimaryKey? primaryKey, IReadOnlyList<FastIndex>? indexes)
    {
        var lines = columns.Select(column => $"    {QuoteName(column.Name)} {FormatType(column)}"
            + (column.IsIdentity ? $" IDENTITY({column.IdentitySeed},{column.IdentityIncrement})" : string.Empty)
            + (column.IsNullable ? " NULL" : " NOT NULL")
            + (column.DefaultValue is null ? string.Empty : $" DEFAULT {column.DefaultValue}")).ToList();
        if (primaryKey is not null) lines.Add($"    CONSTRAINT {QuoteName(primaryKey.Name)} PRIMARY KEY CLUSTERED ({string.Join(", ", primaryKey.Columns.Select(QuoteName))})");
        var script = $"CREATE TABLE {QuoteName(schema)}.{QuoteName(name)} (\n{string.Join(",\n", lines)}\n);\n";
        if (indexes is null || indexes.Count == 0) return script;
        return script + string.Concat(indexes.Select(index => BuildIndexScript(schema, name, index)));
    }

    private static string BuildIndexScript(string schema, string name, FastIndex index)
    {
        var keys = string.Join(", ", index.Columns.Where(column => !column.IsIncluded)
            .Select(column => $"{QuoteName(column.Name)} {(column.IsDescending ? "DESC" : "ASC")}"));
        var included = index.Columns.Where(column => column.IsIncluded).Select(column => QuoteName(column.Name)).ToList();
        var unique = index.IsUnique ? "UNIQUE " : string.Empty;
        var clustered = index.IsClustered ? "CLUSTERED" : "NONCLUSTERED";
        var include = included.Count == 0 ? string.Empty : $" INCLUDE ({string.Join(", ", included)})";
        var filter = string.IsNullOrEmpty(index.Filter) ? string.Empty : $" WHERE {index.Filter}";
        return $"CREATE {unique}{clustered} INDEX {QuoteName(index.Name)} ON {QuoteName(schema)}.{QuoteName(name)} ({keys}){include}{filter};\n";
    }

    private static string FormatType(FastColumn column) => column.DataType switch
    {
        "varchar" or "varbinary" or "char" => $"{column.DataType}({(column.MaxLength == -1 ? "MAX" : column.MaxLength)})",
        "nvarchar" or "nchar" => $"{column.DataType}({(column.MaxLength == -1 ? "MAX" : column.MaxLength / 2)})",
        "decimal" or "numeric" => $"{column.DataType}({column.Precision}, {column.Scale})",
        "datetime2" or "datetimeoffset" or "time" => $"{column.DataType}({column.Scale})",
        _ => column.DataType
    };

    private static string QuoteName(string value) => $"[{value.Replace("]", "]]", StringComparison.Ordinal)}]";

    private async Task<SqlConnection> OpenConnectionAsync(CancellationToken cancellationToken)
    {
        if (!TryGetConnectionString(out var connectionString, out var error, out _))
        {
            throw new InvalidOperationException(error);
        }

        var connection = new SqlConnection(connectionString);
        try
        {
            await connection.OpenAsync(cancellationToken);
            await using var settings = new SqlCommand(NonBlockingSessionSettings, connection) { CommandTimeout = 5 };
            await settings.ExecuteNonQueryAsync(cancellationToken);
            return connection;
        }
        catch
        {
            await connection.DisposeAsync();
            throw;
        }
    }

    private bool TryGetConnectionString(out string connectionString, out string error, out bool configured)
    {
        connectionString = string.Empty;
        error = "Connection is not configured. Enter SQL Authentication settings first.";
        configured = false;
        if (!File.Exists(envFile))
        {
            return false;
        }

        var prefix = $"{protectedConnectionKey}=";
        var encryptedValue = File.ReadLines(envFile)
            .FirstOrDefault(line => line.StartsWith(prefix, StringComparison.Ordinal))?[prefix.Length..]
            .Trim();
        if (string.IsNullOrEmpty(encryptedValue))
        {
            return false;
        }

        configured = true;

        if (!OperatingSystem.IsWindows())
        {
            error = "DPAPI connection settings can only be decrypted on Windows.";
            return false;
        }

        try
        {
            var decrypted = ProtectedData.Unprotect(
                Convert.FromBase64String(encryptedValue),
                null,
                DataProtectionScope.CurrentUser);
            connectionString = Encoding.UTF8.GetString(decrypted);
            var settings = new SqlConnectionStringBuilder(connectionString);
            if (settings.IntegratedSecurity || string.IsNullOrWhiteSpace(settings.DataSource) || string.IsNullOrWhiteSpace(settings.InitialCatalog)
                || string.IsNullOrWhiteSpace(settings.UserID) || string.IsNullOrWhiteSpace(settings.Password))
            {
                connectionString = string.Empty;
                error = "Encrypted settings must use SQL Authentication and specify server, database, user name, and password.";
                return false;
            }

            return true;
        }
        catch (Exception exception) when (exception is FormatException or CryptographicException or ArgumentException)
        {
            error = "Encrypted connection settings are invalid for the current Windows user.";
            return false;
        }
    }

    private static string SafeFilePart(string value)
    {
        var invalidCharacters = Path.GetInvalidFileNameChars();
        return new string(value.Select(character => invalidCharacters.Contains(character) ? '_' : character).ToArray());
    }

    private static void WriteEnvValue(string path, string key, string value)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var lines = File.Exists(path) ? File.ReadAllLines(path).ToList() : [];
        var prefix = $"{key}=";
        var existingIndex = lines.FindIndex(line => line.StartsWith(prefix, StringComparison.Ordinal));
        var replacement = prefix + value;

        if (existingIndex >= 0) lines[existingIndex] = replacement;
        else lines.Add(replacement);

        var temporaryPath = path + ".tmp";
        File.WriteAllLines(temporaryPath, lines);
        File.Move(temporaryPath, path, true);
    }
}

sealed record ConnectionStatus(bool Configured, bool Connected, string? Server, string? Database, string? Error);
sealed record SqlObject(string Type, string Schema, string Name);
sealed record SqlObjectsResponse(IReadOnlyList<SqlObject> StoredProcedures, IReadOnlyList<SqlObject> Tables);
sealed record ScriptResponse(string FileName, string Content);
sealed record ScriptsResponse(IReadOnlyList<ScriptResponse> Scripts);
sealed record FastColumn(string Name, string DataType, short MaxLength, byte Precision, byte Scale, bool IsNullable, bool IsIdentity, string? IdentitySeed, string? IdentityIncrement, string? DefaultValue);
sealed record FastPrimaryKey(string Name, List<string> Columns);
sealed record FastIndexColumn(string Name, bool IsDescending, bool IsIncluded);
sealed record FastIndex(string Name, bool IsUnique, bool IsClustered, string? Filter, List<FastIndexColumn> Columns);
sealed record ConnectionSetupRequest(string Server, string Database, string Username, string Password, bool TrustServerCertificate)
{
    public static bool IsValid(ConnectionSetupRequest? request) =>
        request is not null
        && ValidValue(request.Server, 256)
        && ValidValue(request.Database, 128)
        && ValidValue(request.Username, 128)
        && ValidValue(request.Password, 256);

    private static bool ValidValue(string? value, int maximumLength) =>
        !string.IsNullOrWhiteSpace(value)
        && value.Length <= maximumLength
        && !value.Any(char.IsControl);
}
sealed record ScriptRequest(string Type, string Schema, string Name)
{
    public static bool IsValid(ScriptRequest? request) =>
        request is not null
        && request.Type is "StoredProcedure" or "Table"
        && ValidIdentifier(request.Schema)
        && ValidIdentifier(request.Name);

    private static bool ValidIdentifier(string? value) =>
        !string.IsNullOrWhiteSpace(value)
        && value.Length <= 128
        && !value.Any(char.IsControl);
}
sealed record ScriptBatchRequest(IReadOnlyList<ScriptRequest> Objects)
{
    public static bool IsValid(ScriptBatchRequest? request) =>
        request?.Objects is { Count: > 0 and <= 2000 }
        && request.Objects.All(ScriptRequest.IsValid)
        && request.Objects.Distinct().Count() == request.Objects.Count;
}
