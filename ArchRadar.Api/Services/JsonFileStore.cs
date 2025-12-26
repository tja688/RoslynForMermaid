using System.Text.Json;
using System.Text.Json.Serialization;

namespace ArchRadar.Api.Services;

public static class JsonFileStore
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    static JsonFileStore()
    {
        Options.Converters.Add(new JsonStringEnumConverter());
    }

    public static T ReadOrDefault<T>(string path, T fallback) where T : class
    {
        if (!File.Exists(path))
        {
            return fallback;
        }

        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<T>(json, Options) ?? fallback;
    }

    public static T? Read<T>(string path) where T : class
    {
        if (!File.Exists(path))
        {
            return null;
        }

        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<T>(json, Options);
    }

    public static void WriteAtomic<T>(string path, T value)
    {
        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var json = JsonSerializer.Serialize(value, Options);
        var tempPath = path + ".tmp";
        File.WriteAllText(tempPath, json);
        File.Move(tempPath, path, true);
    }
}
