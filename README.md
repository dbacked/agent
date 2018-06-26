# DBacked Agent

This repo contains the agent needed to backup and restore your PostgreSQL / MySQL database with the [DBacked service](https://dbacked.com). It's written in NodeJS and is compiled in a single binary for ease of use.

A DBacked account is required to use this tool.

DBacked is a simple, secure and reliable database backup as a service. It creates, stores and manages encrypted backups of your database with a single line to add to your server code.

Its source code is released here so that you can read through it, audit it and compile it yourself before installing it on your server. This is optionnal but useful if you want to be 100% sure of what you execute on your servers.

The compiled version is hosted here: [https://dl.dbacked.com/dbacked](https://dl.dbacked.com/dbacked)

You can use the `dbacked --help` for more information about how to use it.

## How to install it

There is multiple ways to install the DBacked agent:

- Use a integration with your language: [NodeJS](./integrations/nodejs)
- Download the binary on your server
- Compile the binary yourself

### Language Integration

This is the easiest way to use DBacked, the integration will make sure everything is installed and configured correctly.

Look at the [NodeJS integration README](integrations/nodejs) for more information.

### Binary install

You can install the binary on your server directly. It's useful if you want to separate the backup job from your backend servers. You can use this binary directly on your database server. You need to make sure the binary is executed automatically on server start.

Download the latest binary from [https://dl.dbacked.com/dbacked](https://dl.dbacked.com/dbacked) ([MD5 here](https://dl.dbacked.com/dbacked_md5)) and configure your server to start it on startup.

### Docker

You can use the agent as a Docker container: `docker run -d geekuillaume/dbacked_agent dbacked_agent start-agent --apikey YOUR_API_KEY --db-type pg --db-host DB_HOST --db-username DB_USERNAME --db-password DB_PASSWORD --db-name DB_NAME`. You can also use `mysql` instead of `pg`.

To test it first before daemonizing it, remove the `-d` arg in the command.

The container needs access to your database. If you are using a postgres or mysql container on Docker too, don't forget to use the `--link` argument.

### Manual compilation

If you want to be sure of what you're installing on your servers, you can manually compile the binary.

To compile it, you need NodeJS (tested on v10.1.0), then install the dependancies with `npm install`, compile the typescript sources with `npm run build:ts` and finaly package it with NodeJS with `npm run build:bin`. It will then be saved as `dbacked_agent` in your current working directory.

## What does it do?

The agent is a long-lived process. You should not put this agent in a CRON as it needs to always be running. You can use the `--dameon` param to start it as a daemon. If you need to backup multiple databases, you can use the `--daemon-name NAME` param to start multiple instances under different names.

It will authentify and check if a backup should be started every 5 minutes. If a backup is needed, it will lock the job on the API, download `pg_dump` or `mysql_dump` and stream their output to the backup server. The output will be encrypted with an 256bit AES key that is stored encrypted by the RSA public key associated with project at the start of the file.

```
[DBACKED magic (7 bytes)][Version (3 bytes)][Encrypted AES key length in bytes (4 bytes)][Encrypted AES key (X bytes from header)][AES IV (16 bytes)][DB dump program output]
```

## How to use it

If you decide to not use the integration, here's the different flags available:

- `-V`, `--version`                 output the version number
- `--apikey <apikey>`               [REQUIRED] DBacked API key (can also be provided with the DBACKED_APIKEY env variable)
- `--db-type <dbType>`              [REQUIRED] Database type (pg or mysql) (env variable: DBACKED_DB_TYPE)
- `--db-host <dbHost>`              [REQUIRED] Database host (env variable: DBACKED_DB_HOST)
- `--db-username <dbUsername>`      [REQUIRED] Database username (env variable: DBACKED_DB_USERNAME)
- `--db-password <dbPassword>`      [REQUIRED] Database password (env variable: DBACKED_DB_PASSWORD)
- `--db-name <dbName>`              [REQUIRED] Database name (env variable: DBACKED_DB_NAME)
- `--public-key <publicKey>`        Public key linked to the project (env variable: DBACKED_PUBLIC_KEY)
- `--config-directory <directory>`  Directory where the agent id and others files are stored, default /etc/dbacked
- `--daemon`                        Detach the process as a daemon, will check if another daemon is not already started
- `--daemon-name <name>`            Allows multiple daemons to be started at the same time under different names
- `-h`, `--help`                    output usage information

It's a good practice to use the `--public-key` option to be sure the backups are encrypted with your key. If an attacker get access to your DBacked account, he/she can change the public key of your project and wait for a backup to be uploaded with this public key. Using this option will make sure that this key is always used for encrypting your backups. If this key doesn't match your project settings, an email will be sent.
