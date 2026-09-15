# Fase 2 — Percepção

## Objetivo

Dar à Luna uma primeira camada real de percepção do Windows sem alterar o chat, a voz ou o fluxo existente da aplicação web.

A Fase 2 cria um agente local separado em `agent/LunaPcPerception`.

## O que já foi implementado

- enumeração das janelas abertas do Windows;
- leitura de título, processo, PID, HWND, estado habilitado e estado offscreen;
- inspeção da árvore de elementos de uma janela;
- leitura de nome, tipo de controle, AutomationId, classe, valor quando disponível e estado do elemento;
- busca de elemento pelo nome;
- saída JSON com protocolo `LUNA-PERCEPTION/1` para diagnóstico.

## Tecnologia

O agente usa Microsoft UI Automation (UIA). A UIA fornece acesso programático a grande parte dos elementos da interface do Windows e permite que um cliente descubra a árvore de janelas e controles antes de agir sobre eles.

## Regra de segurança

Esta fase é somente de percepção. O agente ainda não clica, digita, executa comandos, instala programas ou altera arquivos.

A arquitetura será evoluída para:

`observar -> interpretar -> planejar -> agir -> observar novamente -> verificar`

## Próximo passo

A próxima etapa da Fase 2 será conectar essa percepção ao protocolo `LUNA-DEVICE/1`, permitindo que o agente local informe à Luna quais dispositivos e janelas estão disponíveis. Só depois entraremos nas ações de baixo risco, com confirmação para ações sensíveis.
