using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace LunaPcAgent;

internal static class Program
{
    private static async Task Main()
    {
        var token = Environment.GetEnvironmentVariable("LUNA_AGENT_TOKEN");
        if (string.IsNullOrWhiteSpace(token))
        {
            token = Guid.NewGuid().ToString("N");
            Console.WriteLine($"LUNA_AGENT_TOKEN={token}");
            Console.WriteLine("Guarde este token. Ele será necessário para ações locais.");
        }

        var agent = new WindowsActionAgent(token);
        using var listener = new HttpListener();
        listener.Prefixes.Add("http://127.0.0.1:38764/");
        listener.Start();

        Console.WriteLine("Luna PC Agent ativo em http://127.0.0.1:38764/");
        Console.WriteLine("GET  /health");
        Console.WriteLine("POST /observe");
        Console.WriteLine("POST /action");

        while (true)
        {
            var context = await listener.GetContextAsync();
            _ = Task.Run(() => HandleAsync(context, agent));
        }
    }

    private static async Task HandleAsync(HttpListenerContext context, WindowsActionAgent agent)
    {
        try
        {
            context.Response.Headers["Access-Control-Allow-Origin"] = "*";
            context.Response.Headers["Access-Control-Allow-Headers"] = "Content-Type, X-Luna-Token";

            if (context.Request.HttpMethod == "OPTIONS")
            {
                context.Response.StatusCode = 204;
                context.Response.Close();
                return;
            }

            if (context.Request.HttpMethod == "GET" && context.Request.Url?.AbsolutePath == "/health")
            {
                await WriteJson(context, new { ok = true, protocol = "LUNA-PC/1", agent = "online" });
                return;
            }

            if (!IsAuthorized(context, agent.Token))
            {
                await WriteJson(context, new { ok = false, error = "unauthorized" }, 401);
                return;
            }

            if (context.Request.HttpMethod == "POST" && context.Request.Url?.AbsolutePath == "/observe")
            {
                await WriteJson(context, agent.Observe());
                return;
            }

            if (context.Request.HttpMethod == "POST" && context.Request.Url?.AbsolutePath == "/action")
            {
                var request = await JsonSerializer.DeserializeAsync<ActionRequest>(context.Request.InputStream);
                if (request is null)
                {
                    await WriteJson(context, new { ok = false, error = "invalid_json" }, 400);
                    return;
                }

                var result = agent.Execute(request);
                await WriteJson(context, result, result.Ok ? 200 : 400);
                return;
            }

            await WriteJson(context, new { ok = false, error = "not_found" }, 404);
        }
        catch (Exception ex)
        {
            await WriteJson(context, new { ok = false, error = "agent_error", message = ex.Message }, 500);
        }
    }

    private static bool IsAuthorized(HttpListenerContext context, string token) =>
        string.Equals(context.Request.Headers["X-Luna-Token"], token, StringComparison.Ordinal);

    private static async Task WriteJson(HttpListenerContext context, object value, int statusCode = 200)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json; charset=utf-8";
        await JsonSerializer.SerializeAsync(context.Response.OutputStream, value, new JsonSerializerOptions { WriteIndented = true });
        context.Response.Close();
    }
}
