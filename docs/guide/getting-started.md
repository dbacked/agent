# Getting started

There is multiple ways to install the DBacked agent depending on your platform and how much control you want over the installation.

## Interactive installation

DBacked includes an interactive installer that will ask you everything it needs to start backing up your database. To start the installer, download the binary and use the `install-agent` command:

```bash
wget https://dl.dbacked.com/dbacked -O ./dbacked
chmod +x ./dbacked
sudo ./dbacked install-agent
```

This will create the `/etc/dbacked/config.json` file populated with the responses you provided and copy the binary to `/usr/local/bin/dbacked`. This is why running as the superuser is required. Of course, you don't need to execute the agent as a superuser afterwards.

If you are using a linux distribution which boot SystemD (like Ubuntu, Debian, Fedora or ArchLinux), the install process will detect it and create a service to start DBacked at startup.

If you're not using SystemD, you'll need to configure your server to start DBacked at boot. There's multiple way to do it depending on your configuration but you'll need to make sure that `/usr/local/bin/dbacked start-agent` is launched.

<!-- TODO: add install GIF-->

## Docker

If your infrastructure is running with Docker, I packaged the binary in a container for you. The container image is hosted on Docker Hub: [dbacked/agent](https://hub.docker.com/r/geekuillaume/dbacked/).

You can run it from the command line with `docker run geekuillaume/dbacked dbacked start-agent` but by default it will do nothing as you need to configure it. You can use environment variables, command line arguments or a configuration file to do so. For more information, look at the [configuration documentation](./configuration.html).

Don't forget that if you are running your database in a Docker container, you need to link the DBacked container to it. This will allow DBacked to reach your database. To do so, use the [`depends_on`](https://docs.docker.com/compose/compose-file/#depends_on) configuration with Docker Compose or the [`--link`](https://docs.docker.com/engine/reference/commandline/run/) argument with the Docker CLI.

<!--  TODO: Change docker name to dbacked/agent -->

## Manual compilation and installation

If you want to be sure of what you're installing on your servers, you can manually compile and install the binary.

DBacked is a NodeJS program so you'll need NodeJS on your machine to build it (tested on v10.1.0). First, install the dependencies with `npm install`, compile the Typescript sources with `npm run build:ts` and finaly package it in a binary with `npm run build:bin`. It will then be saved as `dbacked` in your current working directory.

To launch it, you need to use the `dbacked start-agent` command. This will launch the long-lived process that will watch the database and launch a backup when needed. You can also use the `--daemon` argument to launch it as a daemon and detach it from your current session. Make sure the agent is started at boot.

Without the interactive install, you'll need to configure it manually. For more information, look at the [configuration documentation](./configuration.html).

