# Fase 4 — Autonomia controlada

A Fase 4 introduz o ciclo operacional da Luna no Windows:

1. observar o estado atual;
2. executar uma ação já validada;
3. observar novamente;
4. verificar se o resultado esperado aconteceu;
5. interromper quando uma etapa falhar.

O motor possui limite de passos por tarefa e não executa comandos arbitrários. A interpretação de linguagem natural continua pertencendo ao cérebro da Luna.

## Princípio

`observar → agir → observar → verificar`

A verificação é baseada em regras explícitas do plano. Nesta fase não há autonomia ilimitada nem execução de PowerShell/CMD arbitrário.
