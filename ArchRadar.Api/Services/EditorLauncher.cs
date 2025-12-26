using System.Diagnostics;

namespace ArchRadar.Api.Services;

public sealed class EditorLauncher
{
    public OpenResult OpenFile(string filePath, int? line, int? col)
    {
        if (string.IsNullOrWhiteSpace(filePath))
        {
            return OpenResult.Failed("File path is required.");
        }

        var fullPath = Path.GetFullPath(filePath);
        if (!File.Exists(fullPath))
        {
            return OpenResult.Failed($"File not found: {fullPath}");
        }

        var editor = Environment.GetEnvironmentVariable("ARCHRADAR_EDITOR");
        if (!string.IsNullOrWhiteSpace(editor))
        {
            var target = BuildTarget(fullPath, line, col);
            var psi = new ProcessStartInfo
            {
                FileName = editor,
                Arguments = target,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            try
            {
                Process.Start(psi);
                return OpenResult.Success();
            }
            catch (Exception ex)
            {
                return OpenResult.Failed(ex.Message);
            }
        }

        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = fullPath,
                UseShellExecute = true
            };
            Process.Start(psi);
            return OpenResult.Success();
        }
        catch (Exception ex)
        {
            return OpenResult.Failed(ex.Message);
        }
    }

    private static string BuildTarget(string fullPath, int? line, int? col)
    {
        var template = Environment.GetEnvironmentVariable("ARCHRADAR_EDITOR_ARGS");
        if (!string.IsNullOrWhiteSpace(template))
        {
            return template
                .Replace("{file}", fullPath, StringComparison.OrdinalIgnoreCase)
                .Replace("{line}", (line ?? 0).ToString(), StringComparison.OrdinalIgnoreCase)
                .Replace("{col}", (col ?? 0).ToString(), StringComparison.OrdinalIgnoreCase);
        }

        if (line is null || line <= 0)
        {
            return $"\"{fullPath}\"";
        }

        if (col is null || col <= 0)
        {
            return $"\"{fullPath}\":{line}";
        }

        return $"\"{fullPath}\":{line}:{col}";
    }
}

public sealed record OpenResult(bool Ok, string? Message)
{
    public static OpenResult Success() => new(true, null);

    public static OpenResult Failed(string message) => new(false, message);
}
