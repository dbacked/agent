# DBacked Agent

This repo contains the agent needed to backup your PostgreSQL / MySQL database with the [DBacked service](https://dbacked.com). It's written in NodeJS and is compiled in a single binary for ease of use.

Its source code is released here so that you can read through it, audit it and compile it yourself before installing it on your server. This is optionnal but useful if you want to be 100% sure of what you execute on your servers.

To compile it, you need NodeJS (tested on v10.1.0), then install the dependancies with `npm install`, compile the typescript sources with `npm run build:ts` and finaly package it with NodeJS with `npm run build:bin`.

The compiled version is hosted on S3: [https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/dbacked_agent](https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/pg_dump)

You can use the `dbacked_agent --help` for more information about how to use it.

## What does it do?

The agent is a long-lived process. You should not put this agent in a CRON as it needs to always be running. You can use the `--dameon` param to start it as a daemon. If you need to backup multiple databases, you can use the `--daemon-name NAME` param to start multiple instances under different names.

It will authentify and check if a backup should be started every 5 minutes. If a backup is needed, it will lock the job on the API, download `pg_dump` or `mysql_dump` and stream their output to the backup server. The output will be encrypted with an 256bit AES key that is stored encrypted by the RSA public key associated with project at the start of the file.

```
[DBACKED magic (7 bytes)][Version (3 bytes)][Encrypted AES key length in bytes (4 bytes)][Encrypted AES key (X bytes from header)][AES IV (16 bytes)][DB dump program output]
```
