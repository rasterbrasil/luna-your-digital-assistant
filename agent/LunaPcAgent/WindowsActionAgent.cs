using System.Diagnostics;
using System.Text.Json;
using System.Windows.Automation;
using System.Windows.Forms;

namespace LunaPcAgent;

public sealed class WindowsActionAgent
{
    public string Token { get; }

    public WindowsActionAgent(string token) => Token = token;

    public object Observe()
    {
        var desktop = AutomationElement.RootElement;
        var condition = new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Window);
        var elements = desktop.FindAll(TreeScope.Children, condition);
        var windows = new List<object>();

        foreach (AutomationElement element in elements)
        {
            try
            {
                var processId = element.Current.ProcessId;
                string processName;
                try { processName = Process.GetProcessById(processId).ProcessName; }
                catch { processName = "unknown"; }

                windows.Add(new
                {
                    title = element.Current.Name ?? string.Empty,
                    processName,
                    processId,
                    handle = element.Current.NativeWindowHandle,
                    enabled = element.Current.IsEnabled,
                    offscreen = element.Current.IsOffscreen
                });
            }
            catch { }
        }

        return new
        {
            ok = true,
            protocol = "LUNA-PERCEPTION/1",
            timestamp = DateTimeOffset.UtcNow,
            windows
        };
    }

    public ActionResult Execute(ActionRequest request)
    {
        try
        {
            return request.Action switch
            {
                "open_app" => OpenApp(request.Target),
                "open_url" => OpenUrl(request.Target),
                "invoke" => InvokeElement(request.ProcessId, request.Target),
                "set_value" => SetValue(request.ProcessId, request.Target, request.Value),
                "key" => SendKey(request.Key),
                "observe" => new ActionResult(true, "observed", Observe()),
                _ => new ActionResult(false, $"unsupported_action:{request.Action}", null)
            };
        }
        catch (Exception ex)
        {
            return new ActionResult(false, ex.Message, null);
        }
    }

    private static ActionResult OpenApp(string? target)
    {
        if (string.IsNullOrWhiteSpace(target))
            return new(false, "target_required", null);

        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "notepad", "calc", "mspaint", "explorer", "cmd", "powershell", "msedge", "chrome"
        };

        var name = Path.GetFileNameWithoutExtension(target);
        if (!allowed.Contains(name))
            return new(false, "app_not_allowed_in_phase_3", null);

        Process.Start(new ProcessStartInfo
        {
            FileName = target,
            UseShellExecute = true
        });

        return new(true, $"app_started:{target}", null);
    }

    private static ActionResult OpenUrl(string? target)
    {
        if (!Uri.TryCreate(target, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            return new(false, "only_http_https_urls_are_allowed", null);

        Process.Start(new ProcessStartInfo
        {
            FileName = uri.ToString(),
            UseShellExecute = true
        });

        return new(true, "url_opened", new { url = uri.ToString() });
    }

    private static ActionResult InvokeElement(int? processId, string? name)
    {
        if (processId is null || string.IsNullOrWhiteSpace(name))
            return new(false, "processId_and_target_required", null);

        var element = FindByName(processId.Value, name);
        if (element is null)
            return new(false, "element_not_found", null);

        if (element.TryGetCurrentPattern(InvokePattern.Pattern, out var pattern))
        {
            ((InvokePattern)pattern).Invoke();
            return new(true, "element_invoked", Describe(element));
        }

        return new(false, "element_does_not_support_invoke", Describe(element));
    }

    private static ActionResult SetValue(int? processId, string? name, string? value)
    {
        if (processId is null || string.IsNullOrWhiteSpace(name) || value is null)
            return new(false, "processId_target_and_value_required", null);

        var element = FindByName(processId.Value, name);
        if (element is null)
            return new(false, "element_not_found", null);

        if (element.TryGetCurrentPattern(ValuePattern.Pattern, out var pattern))
        {
            ((ValuePattern)pattern).SetValue(value);
            return new(true, "value_set", Describe(element));
        }

        return new(false, "element_does_not_support_value_pattern", Describe(element));
    }

    private static ActionResult SendKey(string? key)
    {
        if (string.IsNullOrWhiteSpace(key))
            return new(false, "key_required", null);

        SendKeys.SendWait(key);
        return new(true, "key_sent", new { key });
    }

    private static AutomationElement? FindByName(int processId, string name)
    {
        var root = AutomationElement.RootElement;
        var window = root.FindFirst(
            TreeScope.Children,
            new PropertyCondition(AutomationElement.ProcessIdProperty, processId));

        if (window is null)
            return null;

        return window.FindFirst(
            TreeScope.Descendants,
            new PropertyCondition(AutomationElement.NameProperty, name));
    }

    private static object Describe(AutomationElement element) => new
    {
        name = element.Current.Name ?? string.Empty,
        controlType = element.Current.ControlType?.ProgrammaticName ?? string.Empty,
        automationId = element.Current.AutomationId ?? string.Empty,
        className = element.Current.ClassName ?? string.Empty,
        enabled = element.Current.IsEnabled,
        offscreen = element.Current.IsOffscreen
    };
}

public sealed record ActionRequest(
    string Action,
    string? Target = null,
    int? ProcessId = null,
    string? Value = null,
    string? Key = null);

public sealed record ActionResult(bool Ok, string Message, object? State);
