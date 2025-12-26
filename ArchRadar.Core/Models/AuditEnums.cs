namespace ArchRadar.Core.Models;

public enum AuditNodeKind
{
    Feature = 0,
    Controller = 1,
    System = 2,
    Model = 3,
    Command = 4,
    Query = 5,
    Event = 6,
    Repo = 7,
    Factory = 8,
    External = 9,
    Unresolved = 10
}

public enum AuditEdgeKind
{
    UsesType = 0,
    Calls = 1,
    Subscribes = 2,
    Creates = 3,
    IO = 4,
    FrameworkInferred = 5
}

public enum AuditConfidence
{
    Low = 0,
    Medium = 1,
    High = 2
}
