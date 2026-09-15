# Fase 3 — Ação e Controle do Windows

A Fase 3 transforma a percepção da Fase 2 em um agente local capaz de executar ações controladas no Windows.

## O que foi implementado

O projeto `agent/LunaPcAgent` cria um agente local que escuta **somente em `127.0.0.1`** na porta `38764`.

Endpoints:

- `GET /health` — verifica se o agente está ativo; não exige token.
- `POST /observe` — retorna as janelas abertas e exige `X-Luna-Token`.
- `POST /action` — executa uma ação permitida e exige `X-Luna-Token`.

## Ações da primeira versão

- `observe`
- `open_app` — somente aplicativos previamente permitidos nesta fase.
- `open_url` — somente `http` e `https`.
- `invoke` — aciona um controle que expõe `InvokePattern`.
- `set_value` — altera controles que expõem `ValuePattern`.
- `key` — envia teclas para a sessão interativa.

## Segurança

O agente não expõe a porta para a rede local: o listener usa `127.0.0.1`.

As ações, exceto `/health`, exigem o token `X-Luna-Token`. Se `LUNA_AGENT_TOKEN` não existir no ambiente, o agente gera um token aleatório ao iniciar e o mostra no console.

Nesta fase não foram adicionados:

- execução arbitrária de PowerShell/CMD;
- exclusão de arquivos;
- alteração de configurações do Windows;
- instalação de programas;
- compras, pagamentos ou outras ações externas irreversíveis.

## Arquitetura

```text
Luna Web / Cérebro
       |
       v
Device Bridge (LUNA-DEVICE/1)
       |
       v
localhost:38764
       |
       v
LunaPcAgent
       |
       +--> Windows UI Automation
       +--> Process.Start (apps/URLs permitidos)
       +--> SendKeys (último recurso)
```

A Microsoft documenta UI Automation como a API para localizar elementos, consultar propriedades e manipular controles de aplicações Windows. Sempre que possível, o agente usa padrões UI Automation em vez de simulação de mouse/teclado.

## Regra da Fase 3

A Luna deve evoluir para o ciclo:

**observar → decidir → agir → observar novamente → verificar**

A conexão do cérebro web com este agente será feita em uma etapa posterior, depois da validação local do agente.
