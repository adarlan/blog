---
title: Provisionamento de infraestrutura utilizando GitLab CI/CD, AWS, Terraform, Ansible e Docker
date: "2020-04-24"
tags:
  - IaC
  - CI/CD
  - AWS
  - GitLab
  - Terraform
  - Ansible
  - Docker
---

Neste tutorial, vou mostrar como configurar um pipeline para automatizar a criação
e configuração de um servidor na nuvem
e fazer o deploy de um container nesse servidor.

Vamos usar Terraform para criar um servidor Ubuntu na nuvem da AWS
e Ansible para instalar o Docker nesse servidor.
Em seguida, faremos o deploy de um container Docker.
Tudo isso de forma automatizada!

## Você vai precisar de

- Uma conta em [gitlab.com](https://gitlab.com) (gratuito);
- Uma conta em [aws.amazon.com](https://aws.amazon.com) (requer cartão de crédito);

## Visão geral

Antes de automatizar os processos,
será necessário criar esses 3 itens na sua conta da AWS:

- **EC2 Kei Pair** - um par de chaves SSH que será usado para se conectar ao servidor;
- **AWS S3 Bucket** - um local onde o Terraform irá armazenar o arquivo de estado da infraestrutura;
- **AWS IAM User** - um usuário para permitir que o Terraform tenha acesso à conta da AWS;

Depois vamos criar no GitLab um projeto com as seguintes variáveis:

- `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` - credenciais que serão utilizadas pelo Terraform para ter acesso à conta da AWS;
- `PRIVATE_KEY` - chave SSH privada que será utilizada pelo Ansible para configurar o servidor e para fazer o deploy do container;

Por fim, vamos adicionar no repositório desse projeto os arquivos:

- `infra.tf` - configuração da infraestrutura; será utilizado pelo Terraform;
- `playbook.yml` - configuração do servidor; será utilizado pelo Ansible;
- `.gitlab-ci.yml` - configuração do pipeline; será utilizado pelo GitLab CI/CD;

E isso é tudo o que será configurado de forma manual.
Todo o restante será feito de forma automática através do pipeline.

O pipeline terá 5 estágios:

- **CreateInfra** - utiliza o Terraform para criar os recursos de infraestrutura na AWS: uma **EC2 Instance**, que será nosso servidor Ubuntu, e um **EC2 Security Group** para permitir acesso ao servidor através das portas 22 (para conexões SSH) e 80 (para chamadas HTTP); o IP público do servidor será armazenado no cache do pipeline;
- **SetUpServer** - utiliza o Ansible para instalar o Docker no servidor; para fazer isso, o Ansible se conecta ao servidor através de SSH utilizando o IP público que ficou armazenado no cache do pipeline;
- **DeployContainer** - utiliza SSH para fazer o deploy de um container e expõe o serviço na porta 80;
- **DestroyInfra** - utiliza o Terraform para destruir os recursos de infraestrutura criados na AWS; esse estágio será executado apenas quando a variável `DESTROY` for definida como `true`;

## Criando o projeto no GitLab

Crie um novo projeto na sua conta do GitLab:

- GitLab >> New Project
- Defina um nome para o projeto

## Criando as variáveis no projeto

Abra a página de configurações de CI/CD do projeto e expanda a seção de variáveis:

- GitLab >> Project Settings >> CI/CD >> Variables

Crie as seguintes variáveis:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `PRIVATE_KEY` (type: `File`)

## Criando um par de chaves SSH no AWS-EC2

Ao criar uma instância EC2, é necessário adicionar uma chave SSH
para permitir que você se conecte a essa instância posteriormente.
Por isso, vamos criar previamente um par de chaves SSH e guardar a chave privada em um local seguro.

Quando o Terraform criar a infraestrutura, a chave pública será automaticamente adicionada na instância.
Então utilizaremos a chave privada para realizar conexões com o servidor.

AWS >> EC2 >> Key Pairs >> Create Key Pair

- Defina um nome para a chave
- File format: `pem`
- Salve a chave na variável `PRIVATE_KEY`

## Criando um bucket no AWS-S3

O Terraform precisa de um local seguro para guardar o arquivo de estado da infraestrutura.
Dessa forma, quando você modificar o código que define a infraestrutura,
o Terraform poderá comparar o estado atual com as modificações que você fez.

- AWS >> S3 >> Criar Bucket

- Defina um nome para o bucket
- Escolha a região onde o bucket será criado
- Mantenha habilitada a opção **Bloquear todo o acesso público**

## Criando um usuário no AWS-IAM

O Terraform precisa das credenciais de um usuário para ter acesso à conta da AWS.

AWS >> IAM >> Adicionar Usuário

- Defina um nome para o usuário
- Tipo de acesso: `Acesso programático`
- Permissões: `AmazonS3FullAccess` + `AmazonEC2FullAccess`
- Criar chave de acesso
- Salve o ID da chave de acesso na variável `AWS_ACCESS_KEY_ID`
- Salve a chave de acesso secreta na variável `AWS_SECRET_ACCESS_KEY`

## Configurando o Terraform

Crie no projeto o arquivo `infra.tf`

```tf
provider "aws" {
  version = "~> 2.0"
  region  = "us-east-1"  # TODO substitua pela região de sua preferência
}

terraform {
  backend "s3" {
    region = "us-east-1" # TODO substitua pela região onde você criou o bucket
    bucket = "foo"       # TODO substitua pelo nome que você deu ao bucket
    key    = "tfstate"
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true
  filter {
    name = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-bionic-18.04-amd64-server-*"]
  }
  filter {
    name = "virtualization-type"
    values = ["hvm"]
  }
  owners = ["099720109477"] # Canonical
}

resource "aws_instance" "main" {
  ami             = data.aws_ami.ubuntu.id
  instance_type   = "t2.micro"
  key_name        = "foo" # TODO substitua pelo nome que você deu ao key-pair
  security_groups = [aws_security_group.main.name]
  tags = {
    Name = "foo" # TODO substitua pelo nome de sua preferência
  }
}

resource "aws_security_group" "main" {
  name = "foo" # TODO substitua pelo nome de sua preferência
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [ "0.0.0.0/0" ]
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [ "0.0.0.0/0" ]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

output "server_ip" {
  value = aws_instance.main.public_ip
}
```

## Configurando o Ansible

Crie no projeto o arquivo `playbook.yml`

```yml
---
- name: "Set up server"
  hosts: all
  become: yes
  user: ubuntu
  gather_facts: no

  tasks:
    - name: "Update apt-get repository"
      raw: apt-get update

    - name: "Install Python 3"
      raw: apt-get install -y python3

    - name: "Install Docker"
      shell: curl -sS https://get.docker.com | sh

    - name: "Restart Docker"
      systemd:
        name: docker
        enabled: yes
        state: restarted
        daemon_reload: yes
```

## Configurando o GitLab CI/CD

Crie no projeto o arquivo `.gitlab-ci.yml`

```yml
stages:
  - CreateInfra
  - SetUpServer
  - DeployContainer
  - DestroyInfra

cache:
  paths:
    - server_ip

CreateInfra:
  stage: CreateInfra
  image:
    name: hashicorp/terraform
    entrypoint: [""]
  script:
    - terraform init
    - terraform apply -auto-approve
    - terraform output server_ip > server_ip
  except:
    variables:
      - $DESTROY == "true"

SetUpServer:
  stage: SetUpServer
  image: alpine
  script:
    - apk add ansible openssh-client
    - mkdir ~/.ssh
    - ssh-keyscan $(cat server_ip) > ~/.ssh/known_hosts
    - chmod 644 ~/.ssh/known_hosts
    - eval $(ssh-agent -s)
    - chmod 400 $PRIVATE_KEY
    - ssh-add $PRIVATE_KEY
    - ansible-playbook -i server_ip -u ubuntu playbook.yml
  except:
    variables:
      - $DESTROY == "true"

DeployContainer:
  stage: DeployContainer
  image: alpine
  script:
    - apk add openssh-client
    - mkdir ~/.ssh
    - ssh-keyscan $(cat server_ip) > ~/.ssh/known_hosts
    - chmod 644 ~/.ssh/known_hosts
    - eval $(ssh-agent -s)
    - chmod 400 $PRIVATE_KEY
    - ssh-add $PRIVATE_KEY
    - ssh ubuntu@$(cat server_ip) docker run -p 80:80 -d nginx
  except:
    variables:
      - $DESTROY == "true"

DestroyInfra:
  stage: DestroyInfra
  image:
    name: hashicorp/terraform
    entrypoint: [""]
  script:
    - terraform init
    - terraform destroy -auto-approve
  only:
    variables:
      - $DESTROY == "true"
```

## Executando o pipeline

Depois de adicionar o arquivo `.gitlab-ci.yml`, o pipeline será executado imediatamente.

Abra a página de pipelines do projeto:

- GitLab >> Project >> CI/CD >> Pipelines

Você também pode utilizar o botão "Run Pipeline" para executar novamente o pipeline sempre que desejar.

Depois que o pipeline terminar de executar, abra o navegador web e verifique se o NGINX está respondendo:

- `http://<SERVER_IP>`

## Destruindo a infraestrutura

Clique no botão "Run Pipeline" e adicione a variável `DESTROY` = `true`
