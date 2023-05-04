---
title: A infraestrutura por trás do meu website
date: "2022-12-27"
tags:
  - Docker
  - GitLab
  - AWS
  - Terraform
  - Ansible
  - Traefik
  - CI/CD
  - IaC
  - Overengineering
---

Quando criei o site adarlan.net,
meu principal objetivo era ter um lugar para publicar artigos sobre tecnologia.
Mas a ideia de usar uma plataforma ou modelo de blog pronto nunca me seduziu.
Decidi fazer tudo "do zero" para colocar em prática o uso de diferentes tecnologias.

- __React.js__ e __Next.js__ para construir as páginas HTML a partir de arquivos Markdown
- __Docker__ para criar imagens de container e orquestrar containers em produção
- __AWS__ para prover a infraestrutura na nuvem
- __GitLab CI/CD__ para automatizar o provisionamento de infraestrutura e os processos de test, build e deploy do website
- __Terraform__ para gerenciar os recursos na AWS
- __Ansible__ para configurar os servidores
- __Traefik__ para proxy reverso e certificado SSL

O frontend foi feito utilizando React.js e Next.js.
Não é meu foco me aprofundar nessas tecnologias de frontend,
mas foi uma boa solução que encontrei para construir páginas HTML a partir de arquivos Markdown,
tendo como resultado um site estático.

Tudo o mais que abordo neste artigo é sobre a infraestrutura que está por trás desse site estático.
Veja a seguir alguns trechos de código, curiosidades sobre o projeto e dicas sobre as tecnologias usadas.

## Dockerfile com múltiplos estágios

O `Dockerfile` dessa aplicação possui dois estágios:

```Dockerfile
FROM node:16 as node-stage
COPY . /blog
WORKDIR /blog
RUN npm install
RUN npm run build

FROM nginx:1
COPY --from=node-stage /blog/out /usr/share/nginx/html
```

O primeiro estágio, baseado na imagem `node`,
é responsável por gerar o site estático a partir do código fonte.

O segundo estágio, baseado na imagem `nginx`,
copia apenas os arquivos estáticos gerados no primeiro estágio.

Dessa forma, a imagem resultante é mais leve e segura,
pois contém apenas o necessário para servir as páginas já renderizadas.

## Criando a imagem Docker

No pipeline de CI/CD a imagem Docker é criada e publicada no Docker Hub.
Veja este trecho do arquivo `.gitlab-ci.yml`:

```yaml
build:
  stage: build
  image: docker
  services:
    - docker:dind
  script:
    - docker build --pull -t adarlan/blog .
    - docker login -u "$DOCKER_REGISTRY_USER" -p "$DOCKER_REGISTRY_PASSWORD"
    - docker push adarlan/blog
```

Assim a imagem está pronta para ser implantada em um servidor.

Você pode levantar o blog com o comando `docker run -p 80:80 adarlan/blog`
e depois abrir [http://localhost](http://localhost) em seu navegador.

## Infraestrutura como código

Para implantar o website em ambiente de produção, não basta entrar no servidor e executar manualmente um comando.

É necessário ter uma infraestrutura estável,
que possa ser rapidamente construída, destruída e reconstruída sempre que necessário.

Toda a configuração da infraestrutura deve ser escrita como código.
É por isso que escolhi tecnologias como Terraform e Ansible.

Veja neste trecho de código como é descrita uma instância do AWS EC2 no Terraform:

```tf
resource "aws_instance" "main" {
  ami             = data.aws_ami.ubuntu.id
  instance_type   = "t2.micro"
  key_name        = aws_key_pair.main.key_name
  security_groups = [aws_security_group.main.name]
  tags = {
    Name = "website-server"
  }
}
```

## Utilizando Terraform em pipelines de infraestrutura

Uma vez que a infraestrutura está escrita como código,
seu provisionamento pode e deve ser feito através de pipelines.

A infraestrutura na AWS é criada através do Terraform,
que por sua vez é executado a partir de pipelines do GitLab CI/CD.

Veja este trecho do arquivo `.gitlab-ci.yml`:

```yml
stages:
  - plan
  - apply

cache:
  paths:
    - tfplan

plan:
  stage: plan
  image:
    name: hashicorp/terraform
    entrypoint: [""]
  script:
    - terraform init
    - terraform plan -out tfplan

apply:
  stage: apply
  when: manual
  image:
    name: hashicorp/terraform
    entrypoint: [""]
  script:
    - terraform init
    - terraform apply tfplan
```

<!-- TODO add some notes abou the code snippet above -->

## Trocando informações entre diferentes pipelines

Algumas informação sobre a infraestrutura só estarão disponíveis após a execução do Terraform.
Por exemplo, o IP de um servidor,
que só estará disponível depois que o Terraform criar esse servidor.

Mas essa informação será necessária no estágio seguinte,
pois o Ansible precisa do IP do servidor para instalar nele o Docker e outros recursos.

A solução que encontrei para armazenar esse tipo de informação
é utilizar o Terraform para criar variáveis no GitLab.

Veja neste trecho de código do Terraform o IP do servidor sendo armazenado em uma variável do GitLab:

```tf
resource "gitlab_group_variable" "server_ip" {
  group     = data.gitlab_group.main.group_id
  key       = "SERVER_IP"
  value     = aws_instance.main.public_ip
  protected = true
}
```

## Conclusão

A conclusão é que meu site é um belo exemplo de overengineering.
