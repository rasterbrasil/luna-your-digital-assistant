# Fase 5 — Android no aparelho real

Esta fase inicia a camada Android da Luna no repositório correto, sem alterar a `main`.

## Objetivo do primeiro teste

Validar no celular físico, antes de ligar o cérebro web, que a Luna consegue:

- receber permissão de acessibilidade;
- observar a árvore da janela ativa;
- executar `Home` e `Voltar`;
- enviar toque por gesto;
- preencher um campo editável;
- abrir uma URL.

A implementação usa `AccessibilityService`. O Android exige que o usuário ative esse serviço explicitamente nas configurações. A API oficial também permite consultar o conteúdo da janela ativa, executar ações globais e despachar gestos. Consulte a documentação oficial do Android antes de ampliar as capacidades.

## Segurança

Nesta primeira camada não há execução arbitrária de shell, instalação silenciosa, pagamentos ou ações destrutivas. O próximo passo é adicionar o transporte `LUNA-ANDROID/1` com autenticação antes de conectar o cérebro web.

## Build

O workflow `.github/workflows/android-debug.yml` gera um APK debug como artefato para o teste físico.
