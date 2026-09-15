namespace LunaPcPerception;

public sealed record WindowInfo(
    string Title,
    string ProcessName,
    int ProcessId,
    int Handle,
    bool IsEnabled,
    bool IsOffscreen);

public sealed record UiElementInfo(
    string Name,
    string ControlType,
    string AutomationId,
    string ClassName,
    string Value,
    bool IsEnabled,
    bool IsOffscreen,
    int ProcessId,
    int Handle);
