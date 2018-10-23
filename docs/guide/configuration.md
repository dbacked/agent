# Configuration

DBacked configuration is made to be adaptable to a lot of different scenarios. It should be easy to integrate DBacked in your existing system.

There is three sources of configuration (from highest to lowest priority):
- Command line arguments <span class="chip config-type-cli">CLI</span>
- Environment variables <span class="chip config-type-env">ENV</span>
- Configuration file <span class="chip config-type-cfg">CFG</span>

Every following configuration can be provided through these means. The configuration file default location is `/etc/dbacked/config.json` but can be changed with `--config-file-path` command line argument.

Some configuration are only used for the free DBacked version and other for the Pro DBacked service. They will be ignored if specified and not useful.

## Agent config

- **Subscription type**: can be `free` or `pro`
  - <span class="chip">Optionnal</span> <span class="chip">Default: free</span>
  - `--subscription-type free` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_SUBSCRIPTION_TYPE=free` <span class="chip config-type-env">ENV</span>
  - `"subscriptionType": "free"` <span class="chip config-type-cfg">CFG</span>
- **Agent ID**: Used when multiple instances of DBacked are launched to identify which made the backup
  - <span class="chip">Optionnal</span>
  - `--agent-id awesome-agent` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_AGENT_ID=awesome-agent` <span class="chip config-type-env">ENV</span>
  - `"agentId": "awesome-agent"` <span class="chip config-type-cfg">CFG</span>
- **Database tools download directory**: where to download tools like `pg_dump` and `mongorestore`
  - <span class="chip">Optionnal</span> <span class="chip">Default: /tmp/dbacked</span>
  - `--database-tools-directory /tmp/dbacked` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_DATABASE_TOOLS_DIRECTORY=/tmp/dbacked` <span class="chip config-type-env">ENV</span>
  - `"databaseToolsDirectory": "/tmp/dbacked"` <span class="chip config-type-cfg">CFG</span>
- **DBacked Pro API key**: Used to identify to DBacked servers when using pro version
  - <span class="chip">DBacked PRO</span>
  - `--apikey thisismyapikey` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_APIKEY=thisismyapikey` <span class="chip config-type-env">ENV</span>
  - `"apikey": "thisismyapikey"` <span class="chip config-type-cfg">CFG</span>
- **Email**: Used to send you an alert if no backups have been made in the last 30 days, if you don't give an email, no beacon will be sent to the DBacked servers, for more information, look at the [corresponding documentation](/guide/security.html#what-s-sent-to-dbacked-servers)
  - <span class="chip">DBacked FREE</span> <span class="chip">Optionnal</span>
  - `--email john@gmail.com` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_EMAIL=john@gmail.com` <span class="chip config-type-env">ENV</span>
  - `"email": "john@gmail.com"` <span class="chip config-type-cfg">CFG</span>
- **Backup schedule**: When to backup the database, should be a cron expression. Use `0 0 * * *` to backup everyday at midnight. For more information look at [Crontab.guru](https://crontab.guru/).
  - <span class="chip">DBacked FREE</span> <span class="chip">Required</span>
  - `--cron "0 0 * * *"` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_CRON="0 0 * * *"` <span class="chip config-type-env">ENV</span>
  - `"cron": "0 0 * * *"` <span class="chip config-type-cfg">CFG</span>


## Security config

- **Public Key**: The RSA public key as a PEM to use to encrypt your backups, recommended length is 4096bits. DBacked can create one for you during the interactive install. If you are using DBacked Pro, the agent will fetch the key from the servers but you can specify it to be sure no backups will be encrypted with another key than your own.
  - <span class="chip">Required</span>
  - `--public-key XXXXX` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_PUBLIC_KEY=XXXXX` <span class="chip config-type-env">ENV</span>
  - `"publicKey": "XXXXX"` <span class="chip config-type-cfg">CFG</span>

## AWS S3 config

This config is only used for DBacked free. It will be ignored if you are a DBacked Pro user.

The access key and secret should have enough privileges to create and list backups. Look at the [S3 documentation](s3-configuration.html) for more information.

- **S3 Access Key ID**:
  - <span class="chip">DBacked FREE</span> <span class="chip">Required</span>
  - `--s3-access-key-id XXXXX` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_S3_ACCESS_KEY_ID=XXXXX` <span class="chip config-type-env">ENV</span>
  - `"s3accessKeyId": "XXXXX"` <span class="chip config-type-cfg">CFG</span>
- **S3 Secret Access Key**:
  - <span class="chip">DBacked FREE</span> <span class="chip">Required</span>
  - `--s3-secret-access-key XXXXX` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_S3_SECRET_ACCESS_KEY=XXXXX` <span class="chip config-type-env">ENV</span>
  - `"s3secretAccessKey": "XXXXX"` <span class="chip config-type-cfg">CFG</span>
- **S3 Region**: Should be a [valid AWS S3 region](https://docs.aws.amazon.com/general/latest/gr/rande.html)
  - <span class="chip">DBacked FREE</span> <span class="chip">Required</span>
  - `--s3-region eu-west-1` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_S3_REGION=eu-west-1` <span class="chip config-type-env">ENV</span>
  - `"s3region": "eu-west-1"` <span class="chip config-type-cfg">CFG</span>
- **S3 Bucket Name**: This bucket needs to be created before
  - <span class="chip">DBacked FREE</span> <span class="chip">Required</span>
  - `--s3-bucket test-bucket` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_S3_BUCKET=test-bucket` <span class="chip config-type-env">ENV</span>
  - `"s3bucket": "test-bucket"` <span class="chip config-type-cfg">CFG</span>


## Database config

- **Database type**: can be `pg`, `mysql` or `mongodb`
  - <span class="chip">Required</span>
  - `--db-type pg` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_DB_TYPE=pg` <span class="chip config-type-env">ENV</span>
  - `"dbType": "pg"` <span class="chip config-type-cfg">CFG</span>
- **Database connection string**: Only for MongoDB, look at the [documentation on the MongoDB website](https://docs.mongodb.com/manual/reference/connection-string/) for more information
  - <span class="chip">MongoDB Only</span> <span class="chip">Required</span>
  - `--db-connection-string mongodb://db1.example.net:27017/prod` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_DB_CONNECTION_STRING="mongodb://db1.example.net:27017/prod"` <span class="chip config-type-env">ENV</span>
  - `"dbConnectionString": "mongodb://db1.example.net:27017/prod"` <span class="chip config-type-cfg">CFG</span>
- **Database Host**: Can be a hostname or an IP address
  - <span class="chip">PostgreSQL and MySQL Only</span> <span class="chip">Required</span>
  - `--db-host localhost` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_DB_HOST="localhost"` <span class="chip config-type-env">ENV</span>
  - `"dbHost": "localhost"` <span class="chip config-type-cfg">CFG</span>
- **Database Port**:
  - <span class="chip">PostgreSQL and MySQL Only</span> <span class="chip">Optionnal</span>
  - `--db-port 5432` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_DB_PORT="5432"` <span class="chip config-type-env">ENV</span>
  - `"dbPort": "5432"` <span class="chip config-type-cfg">CFG</span>
- **Database Username**:
  - <span class="chip">PostgreSQL and MySQL Only</span> <span class="chip">Optionnal</span>
  - `--db-username backup` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_DB_USERNAME="backup"` <span class="chip config-type-env">ENV</span>
  - `"dbUsername": "backup"` <span class="chip config-type-cfg">CFG</span>
- **Database Password**:
  - <span class="chip">PostgreSQL and MySQL Only</span> <span class="chip">Optionnal</span>
  - `--db-password secretpassword` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_DB_PASSWORD="secretpassword"` <span class="chip config-type-env">ENV</span>
  - `"dbPassword": "secretpassword"` <span class="chip config-type-cfg">CFG</span>
- **Database Name**:
  - <span class="chip">PostgreSQL and MySQL Only</span> <span class="chip">Required</span>
  - `--db-name prod` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_DB_NAME="prod"` <span class="chip config-type-env">ENV</span>
  - `"dbName": "prod"` <span class="chip config-type-cfg">CFG</span>
- **Database Alias**: Used in backups files names, by default it's the database name
  - <span class="chip">PostgreSQL and MySQL Only</span> <span class="chip">Optionnal</span>
  - `--db-alias staging` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_DB_ALIAS="staging"` <span class="chip config-type-env">ENV</span>
  - `"dbAlias": "staging"` <span class="chip config-type-cfg">CFG</span>


## Misc

- **Dumper Options**: Additionnal arguments to provide to `pg_dump`, `mysqldump` or `mongodump`
  - <span class="chip">Optionnal</span>
  - `--dumper-options "--no-privileges"` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_DUMPER_OPTIONS="--no-privileges"` <span class="chip config-type-env">ENV</span>
  - `"dumperOptions": "--no-privileges"` <span class="chip config-type-cfg">CFG</span>
- **Send analytics**: Send anonymous analytics to our servers to help us improve DBacked. Would be much appreciated! :smiley: For more information about what's sent and when, look at the [related section on the Security page](/guide/security.html#what-s-sent-to-dbacked-servers).
  - <span class="chip">Optionnal</span> <span class="chip">Default: false</span>
  - `--send-analytics` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_SEND_ANALYTICS="true"` <span class="chip config-type-env">ENV</span>
  - `"sendAnalytics": true` <span class="chip config-type-cfg">CFG</span>
- **Daemon**: Daemonize the agent, detaching it from the current session. It will check if another daemon is already running before daemonizing
  - <span class="chip">Optionnal</span> <span class="chip">Only with start-agent command</span>
  - `--daemon` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_DAEMON="true"` <span class="chip config-type-env">ENV</span>
  - `"daemon": true` <span class="chip config-type-cfg">CFG</span>
- **Daemon Name**: Use another name to daemonize the agent, useful when you want multiple instances of DBacked to be daemonized at the same time (for multiple databases)
  - <span class="chip">Optionnal</span> <span class="chip">Only with start-agent command</span>
  - `--daemon-name staging` <span class="chip config-type-cli">CLI</span>
  - `DBACKED_DAEMON_NAME="staging"` <span class="chip config-type-env">ENV</span>
  - `"daemonName": staging` <span class="chip config-type-cfg">CFG</span>


<style>
.chip {
  align-items: center;
  background: #f0f1f4;
  border-radius: 5rem;
  color: #667189;
  display: inline-flex;
  display: -ms-inline-flexbox;
  -ms-flex-align: center;
  font-size: 90%;
  height: 1.2rem;
  line-height: .8rem;
  margin: .1rem;
  max-width: 100%;
  padding: .2rem .4rem;
  text-decoration: none;
  vertical-align: middle;
}
.config-type-cli {
  background-color: #5755d9 !important;
  color: white !important;
}
.config-type-env {
  background-color: #32b643 !important;
  color: white !important;
}
.config-type-cfg {
  background-color: #ffb700 !important;
  color: white !important;
}
</style>