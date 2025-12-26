using System.Text.Json;
using System.Text.Json.Serialization;

namespace ArchRadar.Core.Config;

public static class ConfigLoader
{
    public static ArchRadarConfig Load(string configPath)
    {
        var json = File.ReadAllText(configPath);
        var legacyL2Detected = false;
        try
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind == JsonValueKind.Object
                && document.RootElement.TryGetProperty("l2", out _))
            {
                legacyL2Detected = true;
            }
        }
        catch
        {
            // 解析失败时交给反序列化处理
        }

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
        options.Converters.Add(new JsonStringEnumConverter());

        var config = JsonSerializer.Deserialize<ArchRadarConfig>(json, options)
            ?? new ArchRadarConfig();
        config.LegacyL2Detected = legacyL2Detected;
        return config;
    }
}
