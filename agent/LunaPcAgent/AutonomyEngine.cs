using System.Text.Json;

namespace LunaPcAgent;

/// <summary>
/// Fase 4: executa tarefas curtas em ciclos controlados de
/// observar -> agir -> observar -> verificar.
/// Não interpreta linguagem natural e não executa comandos arbitrários.
/// O plano deve chegar como ações já validadas pelo cérebro da Luna.
/// </summary>
public sealed class AutonomyEngine
{
    private readonly WindowsActionAgent _agent;
    private readonly int _maxSteps;

    public AutonomyEngine(WindowsActionAgent agent, int maxSteps = 6)
    {
        _agent = agent;
        _maxSteps = Math.Clamp(maxSteps, 1, 10);
    }

    public AutonomyResult Run(AutonomyPlan plan)
    {
        if (plan.Steps.Count == 0)
            return AutonomyResult.Fail("empty_plan");

        var trace = new List<AutonomyTrace>();
        var initial = _agent.Observe();
        trace.Add(new("observe", true, "initial_state", initial));

        var executed = 0;
        foreach (var step in plan.Steps.Take(_maxSteps))
        {
            executed++;
            var before = _agent.Observe();
            trace.Add(new("observe", true, $"before:{step.Id}", before));

            var action = _agent.Execute(step.Request);
            trace.Add(new("act", action.Ok, step.Id, action));

            if (!action.Ok)
                return AutonomyResult.Fail($"action_failed:{step.Id}", trace, executed);

            var after = _agent.Observe();
            trace.Add(new("observe", true, $"after:{step.Id}", after));

            if (!Verify(step.Verify, after))
                return AutonomyResult.Fail($"verification_failed:{step.Id}", trace, executed);

            trace.Add(new("verify", true, step.Id, step.Verify));
        }

        var completed = plan.Steps.Count <= _maxSteps;
        return completed
            ? AutonomyResult.Success(trace, executed)
            : AutonomyResult.Fail("plan_limit_reached", trace, executed);
    }

    private static bool Verify(VerificationRule? rule, object state)
    {
        if (rule is null)
            return true;

        var json = JsonSerializer.Serialize(state);
        return rule.Type switch
        {
            "window_contains" => json.Contains(rule.Value, StringComparison.OrdinalIgnoreCase),
            "state_contains" => json.Contains(rule.Value, StringComparison.OrdinalIgnoreCase),
            _ => false
        };
    }
}

public sealed record AutonomyPlan(string Goal, IReadOnlyList<AutonomyStep> Steps);

public sealed record AutonomyStep(
    string Id,
    ActionRequest Request,
    VerificationRule? Verify = null);

public sealed record VerificationRule(string Type, string Value);

public sealed record AutonomyTrace(
    string Phase,
    bool Ok,
    string Step,
    object? Data);

public sealed record AutonomyResult(
    bool Ok,
    string Message,
    int ExecutedSteps,
    IReadOnlyList<AutonomyTrace> Trace)
{
    public static AutonomyResult Success(IReadOnlyList<AutonomyTrace> trace, int executed) =>
        new(true, "goal_completed", executed, trace);

    public static AutonomyResult Fail(
        string message,
        IReadOnlyList<AutonomyTrace>? trace = null,
        int executed = 0) =>
        new(false, message, executed, trace ?? Array.Empty<AutonomyTrace>());
}
