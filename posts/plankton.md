---
title: Plankton, my own CI/CD tool
date: "2021-12-01"
tags:
  - CI/CD
  - Compose Specification
  - Container Native
  - Java
  - Spring
  - Open Source
---

As a portfolio project, I created a CI/CD tool called Plankton.
It uses containers to run CI/CD pipelines.

Just have a `plankton-compose.yaml` file containing the pipeline configuration
and execute a `docker run` command to start it.

## Compose Specification

The `plankton-compose.yaml` file is configured using the
[Compose Specification](https://github.com/compose-spec/compose-spec/blob/master/spec.md).

```yaml
services:
  test: ...
  build: ...
  deploy: ...
```

It's the same configuration format used by Docker Compose,
but it's not exclusive to Docker Compose.

The Compose Specification defines a standard configuration format for systems composed by containers.
So instead of creating a unique configuration format for a tool,
we can use a well-defined specification that is known to many people and maintained by a global community.

## Container-Native

The Compose Specification is defined as Container-Native.
That is, it allows the use of any container system that follows
the [Open Container Initiative](https://opencontainers.org/),
not only Docker containers.

At first, Plankton only supports Docker containers,
but the design patterns used in the code allow it to be extended by adding new adapters for other container systems.

![/images/posts/class-diagram.png](/images/plankton/class-diagram.png)

## Run pipelines locally

Many CI/CD tools require you to push the source code to a remote repository
in order to run the pipeline on a server.

An interesting feature of Plankton is the possibility to run pipelines locally, on your own computer,
just executing a `docker run` command.

### Example

Follow the steps below to create a simple web application,
configure a pipeline to build and deploy it and run the pipeline locally,
following its progress through the terminal logs or the web interface in the browser.

> It requires Docker installed.

#### Create a `Dockerfile`

```Dockerfile
FROM nginx
RUN echo "Hello, Plankton!" > /usr/share/nginx/html/index.html
```

#### Create a `plankton-compose.yaml` file

```yaml
services:
  build:
    image: docker
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - .:/app
    working_dir: /app
    entrypoint: docker build -t hello-plankton .

  deploy:
    depends_on: build
    image: docker
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    entrypoint: docker run -d hello-plankton
```

#### Run the pipeline

```shell
docker run -it -v /var/run/docker.sock:/var/run/docker.sock -v $PWD:/app -w /app -p 1329:1329 adarlan/plankton
```

#### Follow the logs

![resources/pipeline-logs.png](/images/plankton/pipeline-logs.png)

#### Open the web interface: [http://localhost:1329](http://localhost:1329)

![resources/pipeline-page.png](/images/plankton/pipeline-page.png)

### More examples

[Here](https://github.com/adarlan/plankton/tree/master/examples)
you can find many other use cases of Plankton.

## Run pipelines on a sandbox

Plankton does not have yet a server
to listen for changes in code repositories
and start the pipelines automatically.

But thinking about it as a future implementation,
Plankton already provides a sandbox for each pipeline,
improving container isolation.
It's done using the [Sysbox Container Runtime](https://github.com/nestybox/sysbox).

The sandbox can be enabled by adding the `--sandbox` option.

Example:

```shell
docker run -it -v /var/run/docker.sock:/var/run/docker.sock -v $PWD:/app -w /app -p 1329:1329 adarlan/plankton --sandbox
```

> It requires Sysbox installed.

## Plankton uses itself

On the Plankton project directory there is a `plankton-compose.yaml` file,
where is configured a pipeline to:

1. Build the `plankton.jar` file
1. Build the container images: `plankton` and `plankton:sandbox`
1. Test the container images using the [examples](https://github.com/adarlan/plankton/tree/master/examples)
1. Push the container images to the [container registry](https://hub.docker.com/repository/docker/adarlan/plankton)

In this case, does not make sense to run the pipeline using the `docker run` command,
because it will always use the previous version of Plankton to test the current version.

Instead, run the pipeline executing:

```shell
mvn spring-boot:run
```

> It requires Maven and Docker installed.

So it will run the current version of Plankton over itself.

To be able to push the `plankton` and `plankton:sandbox` images into de container registry,
it is necessary to provide the registry credentials in the `plankton.env` file,
setting the following variables:

- `REGISTRY_USER`
- `REGISTRY_PASSWORD`

## Contribute

To contribute to Plankton, please share this post,
send a pull request to the [Plankton project on GitHub](https://github.com/adarlan/plankton)
or give a feedback to [@adarlan on Twitter](httpl://twitter.com/adarlan).
