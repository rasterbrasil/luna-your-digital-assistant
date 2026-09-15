using System.Diagnostics;
using System.Windows.Automation;

namespace LunaPcPerception;

public sealed class WindowsPerception
{
    public IReadOnlyList<WindowInfo> GetOpenWindows()
    {
        var desktop = AutomationElement.RootElement;
        var condition = new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Window);
        var elements = desktop.FindAll(TreeScope.Children, condition);
        var result = new List<WindowInfo>();

        foreach (AutomationElement element in elements)
        {
            try
            {
                var processId = element.Current.ProcessId;
                var title = element.Current.Name ?? string.Empty;
                var processName = string.Empty;

                try
                {
                    processName = Process.GetProcessById(processId).ProcessName;
                }
                catch
                {
                    processName = "unknown";
                }

                result.Add(new WindowInfo(
                    title,
                    processName,
                    processId,
                    element.Current.NativeWindowHandle,
                    element.Current.IsEnabled,
                    element.Current.IsOffscreen));
            }
            catch
            {
                // Uma janela pode desaparecer entre a enumeração e a leitura.
            }
        }

        return result;
    }

    public IReadOnlyList<UiElementInfo> InspectWindow(int processId)
    {
        var root = AutomationElement.RootElement;
        var window = root.FindFirst(
            TreeScope.Children,
            new PropertyCondition(AutomationElement.ProcessIdProperty, processId));

        if (window is null)
            return Array.Empty<UiElementInfo>();

        var elements = window.FindAll(TreeScope.Descendants, Condition.TrueCondition);
        var result = new List<UiElementInfo>();

        foreach (AutomationElement element in elements)
        {
            try
            {
                result.Add(new UiElementInfo(
                    element.Current.Name ?? string.Empty,
                    element.Current.ControlType?.ProgrammaticName ?? string.Empty,
                    element.Current.AutomationId ?? string.Empty,
                    element.Current.ClassName ?? string.Empty,
                    TryGetValue(element),
                    element.Current.IsEnabled,
                    element.Current.IsOffscreen,
                    element.Current.ProcessId,
                    element.Current.NativeWindowHandle));
            }
            catch
            {
                // Elemento dinâmico removido durante a inspeção.
            }
        }

        return result;
    }

    public UiElementInfo? FindElementByName(int processId, string name)
    {
        var root = AutomationElement.RootElement;
        var window = root.FindFirst(
            TreeScope.Children,
            new PropertyCondition(AutomationElement.ProcessIdProperty, processId));

        if (window is null)
            return null;

        var element = window.FindFirst(
            TreeScope.Descendants,
            new PropertyCondition(AutomationElement.NameProperty, name));

        if (element is null)
            return null;

        return new UiElementInfo(
            element.Current.Name ?? string.Empty,
            element.Current.ControlType?.ProgrammaticName ?? string.Empty,
            element.Current.AutomationId ?? string.Empty,
            element.Current.ClassName ?? string.Empty,
            TryGetValue(element),
            element.Current.IsEnabled,
            element.Current.IsOffscreen,
            element.Current.ProcessId,
            element.Current.NativeWindowHandle);
    }

    private static string TryGetValue(AutomationElement element)
    {
        try
        {
            if (element.TryGetCurrentPattern(ValuePattern.Pattern, out var pattern))
                return ((ValuePattern)pattern).Current.Value ?? string.Empty;
        }
        catch
        {
            // Nem todo controle expõe ValuePattern.
        }

        return string.Empty;
    }
}
