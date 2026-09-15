# Fase 4 — Autonomia controlada

A Luna passa a executar tarefas curtas em um ciclo verificável:

`observar → agir → observar → verificar`

## O que entrou

- `AutonomyEngine` para executar planos com limite de passos.
- Observação antes e depois de cada ação.
- Verificação explícita do resultado esperado.
- Interrupção imediata quando uma ação falha ou a verificação falha.
- Endpoint local `POST /autonomy` protegido pelo mesmo token do agente.
- Protocolo de autonomia `LUNA-AUTONOMY/1`.

## Limites desta fase

A Fase 4 não executa PowerShell/CMD arbitrário e não possui autonomia ilimitada. O cérebro da Luna ainda precisa produzir um plano de ações permitido pelo agente.

O objetivo é que a Luna não apenas faça uma ação, mas consiga perceber se a ação realmente produziu o resultado esperado.
