using System.Text.Json;

namespace LunaPcPerception;

internal static class Program
{
    private static void Main()
    {
        var perception = new WindowsPerception();
        var windows = perception.GetOpenWindows();

        var payload = new
        {
            protocol = "LUNA-PERCEPTION/1",
            timestamp = DateTimeOffset.UtcNow,
            windows
        };

        Console.WriteLine(JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            WriteIndented = true
        }));
    }
}
