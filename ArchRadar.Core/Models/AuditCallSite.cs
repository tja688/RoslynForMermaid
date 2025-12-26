namespace ArchRadar.Core.Models;

public sealed record AuditCallSite(string File, int Line, int Col, string? Snippet);
