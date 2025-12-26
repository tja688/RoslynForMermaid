namespace ArchRadar.Api.Services;

public static class PathSanitizer
{
    public static string ToSafeId(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "unknown";
        }

        var buffer = value.ToCharArray();
        for (var i = 0; i < buffer.Length; i++)
        {
            var ch = buffer[i];
            if (char.IsLetterOrDigit(ch))
            {
                buffer[i] = char.ToLowerInvariant(ch);
                continue;
            }

            buffer[i] = ch == '-' || ch == '_' ? ch : '-';
        }

        var sanitized = new string(buffer).Trim('-');
        return string.IsNullOrWhiteSpace(sanitized) ? "unknown" : sanitized;
    }

    public static string ToSafeFileName(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "unknown";
        }

        var invalid = Path.GetInvalidFileNameChars();
        var buffer = value.ToCharArray();
        for (var i = 0; i < buffer.Length; i++)
        {
            if (invalid.Contains(buffer[i]))
            {
                buffer[i] = '_';
            }
        }

        return new string(buffer);
    }
}
