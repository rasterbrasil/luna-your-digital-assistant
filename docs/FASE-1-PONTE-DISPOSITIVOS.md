# Fase 1 — Ponte de dispositivos

## Objetivo
Criar a base de comunicação para que a Luna possa futuramente controlar o PC Windows e o Android sem substituir a interface, voz ou cérebro que já existem.

## Regra principal
Esta fase **não controla nenhum dispositivo ainda**. Ela cria contratos e uma rota de descoberta para que as próximas fases possam conectar agentes reais com segurança.

## Arquitetura

```text
Luna Web / IA
      |
      v
Device Bridge
      |
  +---+---+
  |       |
  v       v
PC Agent  Android App
```

## Contrato

Protocolo: `LUNA-DEVICE/1`

Comandos previstos:

- `observe`
- `open_app`
- `open_url`
- `click`
- `type`
- `key`
- `back`
- `home`

Todo comando possui um `id` único. O dispositivo deve responder com `ok`, `message` e, quando possível, estado observado.

## Por que começar assim

A Luna atual já possui voz contínua e chat com IA. Não devemos substituir essa parte. A ponte será adicionada como uma camada independente.

Na próxima fase, o agente Windows implementará o protocolo e poderá usar Windows UI Automation para observar e interagir com aplicativos. A UI Automation fornece acesso programático a elementos de interface e permite que clientes localizem e manipulem controles. 

Depois, o aplicativo Android implementará o mesmo contrato usando os recursos apropriados do Android.

## Segurança

Nenhum comando arbitrário é executado pela API nesta fase. O endpoint atual apenas informa os dispositivos conectados (nenhum, até que um agente real seja instalado).
