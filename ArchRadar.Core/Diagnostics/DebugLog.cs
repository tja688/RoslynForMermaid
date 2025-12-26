namespace ArchRadar.Core.Diagnostics;

public static class DebugLog
{
    public static bool Enabled { get; set; }
    public static Action<string>? Writer { get; set; }

    public static void Write(string message)
    {
        if (!Enabled || Writer == null)
        {
            return;
        }

        Writer($"[Debug] {message}");
    }
}
