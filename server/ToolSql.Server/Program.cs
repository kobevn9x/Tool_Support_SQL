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

var app = builder.Build();
var repositoryRoot = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", ".."));

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

app.UseStaticFiles(StaticFiles(repositoryRoot, "css"));
app.UseStaticFiles(StaticFiles(repositoryRoot, "js"));
app.UseStaticFiles(StaticFiles(repositoryRoot, "vendor"));

app.MapGet("/", () => Results.File(
    Path.Combine(repositoryRoot, "sql-formatter.html"),
    "text/html; charset=utf-8"));

app.MapGet("/api/sql/status", async (SqlExportService sql, CancellationToken cancellationToken) =>
    Results.Ok(await sql.GetStatusAsync(cancellationToken)));

app.MapPost("/api/sql/test", async (SqlExportService sql, CancellationToken cancellationToken) =>
{
    var status = await sql.GetStatusAsync(cancellationToken);
    return status.Connected ? Results.Ok(status) : Results.Json(status, statusCode: StatusCodes.Status503ServiceUnavailable);
});

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

await app.RunAsync();
return 0;

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
    private const string NonBlockingSessionSettings = "SET LOCK_TIMEOUT 0; SET DEADLOCK_PRIORITY LOW;";
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
        SELECT SCHEMA_NAME(p.schema_id), p.name, m.definition, m.uses_ansi_nulls, m.uses_quoted_identifier
        FROM sys.procedures p
        INNER JOIN sys.sql_modules m ON m.object_id = p.object_id
        WHERE p.is_ms_shipped = 0;
        """;
    private const string FastColumnQuery = """
        SELECT SCHEMA_NAME(t.schema_id), t.name, c.name, c.column_id, ty.name, c.max_length, c.precision, c.scale,
               c.is_nullable, c.is_identity, ic.seed_value, ic.increment_value, dc.definition
        FROM sys.tables t
        INNER JOIN sys.columns c ON c.object_id = t.object_id
        INNER JOIN sys.types ty ON ty.user_type_id = c.user_type_id
        LEFT JOIN sys.identity_columns ic ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        LEFT JOIN sys.default_constraints dc ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
        WHERE t.is_ms_shipped = 0
        ORDER BY 1, 2, c.column_id;
        """;
    private const string FastPrimaryKeyQuery = """
        SELECT SCHEMA_NAME(t.schema_id), t.name, k.name, c.name, ic.key_ordinal
        FROM sys.tables t
        INNER JOIN sys.key_constraints k ON k.parent_object_id = t.object_id AND k.type = 'PK'
        INNER JOIN sys.index_columns ic ON ic.object_id = k.parent_object_id AND ic.index_id = k.unique_index_id
        INNER JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE t.is_ms_shipped = 0
        ORDER BY 1, 2, 3, ic.key_ordinal;
        """;

    public async Task<ConnectionStatus> GetStatusAsync(CancellationToken cancellationToken)
    {
        if (!TryGetConnectionString(out var connectionString, out var error, out var configured))
        {
            return new(configured, false, null, null, error);
        }

        var settings = new SqlConnectionStringBuilder(connectionString);
        try
        {
            await using var connection = new SqlConnection(connectionString);
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
        await using var command = new SqlCommand(ObjectQuery, connection);
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
        var scripts = await FastProceduresAsync(connection, requests.Where(item => item.Type == "StoredProcedure"), cancellationToken);
        foreach (var script in await FastTablesAsync(connection, requests.Where(item => item.Type == "Table"), cancellationToken))
        {
            scripts.Add(script.Key, script.Value);
        }

        return new(requests.Select(request => scripts.TryGetValue((request.Type, request.Schema, request.Name), out var script)
            ? script
            : throw new KeyNotFoundException($"{request.Type} [{request.Schema}].[{request.Name}] was not found.")).ToList());
    }

    private static async Task<Dictionary<(string, string, string), ScriptResponse>> FastProceduresAsync(
        SqlConnection connection, IEnumerable<ScriptRequest> requests, CancellationToken cancellationToken)
    {
        var selected = requests.Select(item => (item.Schema, item.Name)).ToHashSet();
        var scripts = new Dictionary<(string, string, string), ScriptResponse>();
        if (selected.Count == 0) return scripts;

        await using var command = new SqlCommand(FastProcedureQuery, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var schema = reader.GetString(0);
            var name = reader.GetString(1);
            if (!selected.Contains((schema, name)) || reader.IsDBNull(2)) continue;
            var content = $"SET ANSI_NULLS {(reader.GetBoolean(3) ? "ON" : "OFF")}\nGO\nSET QUOTED_IDENTIFIER {(reader.GetBoolean(4) ? "ON" : "OFF")}\nGO\n{reader.GetString(2).TrimEnd()}\nGO\n";
            scripts.Add(("StoredProcedure", schema, name), new($"StoredProcedure.{SafeFilePart(schema)}.{SafeFilePart(name)}.sql", content));
        }

        return scripts;
    }

    private static async Task<Dictionary<(string, string, string), ScriptResponse>> FastTablesAsync(
        SqlConnection connection, IEnumerable<ScriptRequest> requests, CancellationToken cancellationToken)
    {
        var selected = requests.Select(item => (item.Schema, item.Name)).ToHashSet();
        var tables = new Dictionary<(string, string), List<FastColumn>>();
        if (selected.Count == 0) return [];

        await using (var command = new SqlCommand(FastColumnQuery, connection))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var key = (reader.GetString(0), reader.GetString(1));
                if (!selected.Contains(key)) continue;
                if (!tables.TryGetValue(key, out var columns)) tables[key] = columns = [];
                columns.Add(new(reader.GetString(2), reader.GetString(4), reader.GetInt16(5), reader.GetByte(6), reader.GetByte(7),
                    reader.GetBoolean(8), reader.GetBoolean(9), reader.IsDBNull(10) ? null : Convert.ToString(reader.GetValue(10), CultureInfo.InvariantCulture),
                    reader.IsDBNull(11) ? null : Convert.ToString(reader.GetValue(11), CultureInfo.InvariantCulture), reader.IsDBNull(12) ? null : reader.GetString(12)));
            }
        }

        var primaryKeys = new Dictionary<(string, string), FastPrimaryKey>();
        await using (var command = new SqlCommand(FastPrimaryKeyQuery, connection))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var key = (reader.GetString(0), reader.GetString(1));
                if (!selected.Contains(key)) continue;
                if (!primaryKeys.TryGetValue(key, out var primaryKey)) primaryKeys[key] = primaryKey = new(reader.GetString(2), []);
                primaryKey.Columns.Add(reader.GetString(3));
            }
        }

        return tables.ToDictionary(item => ("Table", item.Key.Item1, item.Key.Item2), item =>
            new ScriptResponse($"Table.{SafeFilePart(item.Key.Item1)}.{SafeFilePart(item.Key.Item2)}.sql", BuildTableScript(item.Key.Item1, item.Key.Item2, item.Value, primaryKeys.GetValueOrDefault(item.Key))));
    }

    private static string BuildTableScript(string schema, string name, IReadOnlyList<FastColumn> columns, FastPrimaryKey? primaryKey)
    {
        var lines = columns.Select(column => $"    {QuoteName(column.Name)} {FormatType(column)}"
            + (column.IsIdentity ? $" IDENTITY({column.IdentitySeed},{column.IdentityIncrement})" : string.Empty)
            + (column.IsNullable ? " NULL" : " NOT NULL")
            + (column.DefaultValue is null ? string.Empty : $" DEFAULT {column.DefaultValue}")).ToList();
        if (primaryKey is not null) lines.Add($"    CONSTRAINT {QuoteName(primaryKey.Name)} PRIMARY KEY CLUSTERED ({string.Join(", ", primaryKey.Columns.Select(QuoteName))})");
        return $"CREATE TABLE {QuoteName(schema)}.{QuoteName(name)} (\n{string.Join(",\n", lines)}\n);\n";
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
            await using var settings = new SqlCommand(NonBlockingSessionSettings, connection);
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
