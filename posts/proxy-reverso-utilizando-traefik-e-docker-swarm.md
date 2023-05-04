---
title: Proxy reverso utilizando Traefik e Docker Swarm
date: "2020-05-06"
tags:
  - Reverse Proxy
  - Traefik
  - Docker
---

Ao fazer o deploy de uma stack em um cluster Swarm,
por padrão o Swarm permite que cada serviço seja exposto através de uma porta.

Para expor cada serviço em um host ou path específico, sem utilizar portas,
você precisa configurar um serviço de proxy reverso.

A seguir, você verá como configurar o arquivo `stack.yml`.

## Você vai precisar de

- Um cluster Swarm
- Configuração de DNS de um domínio apontando para o cluster Swarm

> Se você não tiver um domínio registrado, utilize o [Duck DNS](https://www.duckdns.org/)

## Expondo os serviços através de portas

Sem o proxy reverso, você terá que definir uma porta para cada serviço.

```yml
version: "3.7"

services:
  app_1:
    image: nginx
    ports:
      - 80:80

  app_2:
    image: nginx
    ports:
      - 8080:80

  app_3:
    image: nginx
    ports:
      - 1234:80
```

Faça o deploy da stack:

```shell
docker stack deploy --compose-file stack.yml foo
```

Para acessar cada um desses serviços, é necessário especificar a porta:

- `http://example.com`
- `http://example.com:8080`
- `http://example.com:1234`

## Expondo os serviços através de proxy reverso

O serviço de proxy reverso que vamos utilizar é o Traefik,
que ficará exposto na porta 80.
E esse é o único serviço que ficará exposto através de porta.

Então, ao invés de expor cada serviço em uma porta específica,
o Traefik recebe todas as requisições na porta 80
e redireciona cada requisição para o serviço correspondente
com base no host e no path que você definir na configuração do serviço.

```yml
version: "3.7"

services:
  traefik:
    image: traefik:v2.1
    command:
      - --providers.docker.endpoint=unix:///var/run/docker.sock
      - --providers.docker.swarmMode=true
      - --providers.docker.watch=true
      - --providers.docker.network=default
      - --providers.docker.exposedByDefault=false
    ports:
      - 80:80
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    deploy:
      placement:
        constraints:
          - node.role == manager

  app_1:
    image: nginx
    deploy:
      labels:
        traefik.enable: "true"
        traefik.http.services.app_1.loadbalancer.server.port: 80
        traefik.http.routers.app_1.rule: Host(`example.com`)

  app_2:
    image: nginx
    deploy:
      labels:
        traefik.enable: "true"
        traefik.http.services.app_2.loadbalancer.server.port: 80
        traefik.http.routers.app_2.rule: Host(`example.com`) && Path(`/app_2`)
        traefik.http.routers.app_2.middlewares: app_2_stripprefix
        traefik.http.middlewares.app_2_stripprefix.stripprefix.prefixes: /app_2
        traefik.http.middlewares.app_2_stripprefix.stripprefix.forceslash: "false"

  app_3:
    image: nginx
    deploy:
      labels:
        traefik.enable: "true"
        traefik.http.services.app_3.loadbalancer.server.port: 80
        traefik.http.routers.app_3.rule: Host(`example.com`) && PathPrefix(`/app_3`)
        traefik.http.routers.app_3.middlewares: app_3_stripprefix
        traefik.http.middlewares.app_3_stripprefix.stripprefix.prefixes: /app_3
        traefik.http.middlewares.app_3_stripprefix.stripprefix.forceslash: "false"
```

Faça o deploy da stack:

```shell
docker stack deploy --compose-file stack.yml foo
```

Agora cada serviço pode ser acessado através de seu próprio URL,
sem ter que especificar a porta:

- `http://example.com`
- `http://example.com/app_2`
- `http://example.com/app_3`
