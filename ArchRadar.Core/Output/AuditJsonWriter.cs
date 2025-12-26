using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using ArchRadar.Core.Models;

namespace ArchRadar.Core.Output;

public static class AuditJsonWriter
{
    public static void Write(string outputPath, AuditGraph graph)
    {
        var snapshot = new AuditSnapshot
        {
            Nodes = graph.Nodes.ToList(),
            Edges = graph.Edges.ToList()
        };

        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        options.Converters.Add(new JsonStringEnumConverter());

        var json = JsonSerializer.Serialize(snapshot, options);
        File.WriteAllText(outputPath, json, Encoding.UTF8);
    }
}
