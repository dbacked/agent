(window.webpackJsonp=window.webpackJsonp||[]).push([[5],{165:function(e,t,s){},172:function(e,t,s){"use strict";var i=s(165);s.n(i).a},179:function(e,t,s){"use strict";s.r(t);s(172);var i=s(0),a=Object(i.a)({},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("div",{staticClass:"content"},[e._m(0),e._v(" "),s("p",[e._v("DBacked configuration is made to be adaptable to a lot of different scenarios. It should be easy to integrate DBacked in your existing system.")]),e._v(" "),s("p",[e._v("There is three sources of configuration (from highest to lowest priority):")]),e._v(" "),e._m(1),e._v(" "),e._m(2),e._v(" "),s("p",[e._v("Some configuration are only used for the free DBacked version and other for the Pro DBacked service. They will be ignored if specified and not useful.")]),e._v(" "),e._m(3),e._v(" "),s("ul",[e._m(4),e._v(" "),e._m(5),e._v(" "),e._m(6),e._v(" "),e._m(7),e._v(" "),s("li",[s("strong",[e._v("Email")]),e._v(": Used to send you an alert if no backups have been made in the last 30 days, if you don't give an email, no beacon will be sent to the DBacked servers, for more information, look at the "),s("router-link",{attrs:{to:"/guide/security.html#what-s-sent-to-dbacked-servers"}},[e._v("corresponding documentation")]),e._v(" "),e._m(8)],1),e._v(" "),s("li",[s("strong",[e._v("Backup schedule")]),e._v(": When to backup the database, should be a cron expression. Use "),s("code",[e._v("0 0 * * *")]),e._v(" to backup everyday at midnight. For more information look at "),s("a",{attrs:{href:"https://crontab.guru/",target:"_blank",rel:"noopener noreferrer"}},[e._v("Crontab.guru"),s("OutboundLink")],1),e._v(".\n"),e._m(9)])]),e._v(" "),e._m(10),e._v(" "),e._m(11),e._v(" "),e._m(12),e._v(" "),s("p",[e._v("This config is only used for DBacked free. It will be ignored if you are a DBacked Pro user.")]),e._v(" "),s("p",[e._v("The access key and secret should have enough privileges to create and list backups. Look at the "),s("router-link",{attrs:{to:"./s3-configuration.html"}},[e._v("S3 documentation")]),e._v(" for more information.")],1),e._v(" "),s("ul",[e._m(13),e._v(" "),e._m(14),e._v(" "),s("li",[s("strong",[e._v("S3 Region")]),e._v(": Should be a "),s("a",{attrs:{href:"https://docs.aws.amazon.com/general/latest/gr/rande.html",target:"_blank",rel:"noopener noreferrer"}},[e._v("valid AWS S3 region"),s("OutboundLink")],1),e._v(" "),e._m(15)]),e._v(" "),e._m(16)]),e._v(" "),e._m(17),e._v(" "),s("ul",[e._m(18),e._v(" "),s("li",[s("strong",[e._v("Database connection string")]),e._v(": Only for MongoDB, look at the "),s("a",{attrs:{href:"https://docs.mongodb.com/manual/reference/connection-string/",target:"_blank",rel:"noopener noreferrer"}},[e._v("documentation on the MongoDB website"),s("OutboundLink")],1),e._v(" for more information\n"),e._m(19)]),e._v(" "),e._m(20),e._v(" "),e._m(21),e._v(" "),e._m(22),e._v(" "),e._m(23),e._v(" "),e._m(24),e._v(" "),e._m(25)]),e._v(" "),e._m(26),e._v(" "),s("ul",[e._m(27),e._v(" "),s("li",[s("strong",[e._v("Send analytics")]),e._v(": Send anonymous analytics to our servers to help us improve DBacked. Would be much appreciated! 😃 For more information about what's sent and when, look at the "),s("router-link",{attrs:{to:"/guide/security.html#what-s-sent-to-dbacked-servers"}},[e._v("related section on the Security page")]),e._v(".\n"),e._m(28)],1),e._v(" "),e._m(29),e._v(" "),e._m(30)])])},[function(){var e=this.$createElement,t=this._self._c||e;return t("h1",{attrs:{id:"configuration"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#configuration","aria-hidden":"true"}},[this._v("#")]),this._v(" Configuration")])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("ul",[s("li",[e._v("Command line arguments "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[e._v("Environment variables "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[e._v("Configuration file "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])},function(){var e=this.$createElement,t=this._self._c||e;return t("p",[this._v("Every following configuration can be provided through these means. The configuration file default location is "),t("code",[this._v("/etc/dbacked/config.json")]),this._v(" but can be changed with "),t("code",[this._v("--config-file-path")]),this._v(" command line argument.")])},function(){var e=this.$createElement,t=this._self._c||e;return t("h2",{attrs:{id:"agent-config"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#agent-config","aria-hidden":"true"}},[this._v("#")]),this._v(" Agent config")])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("li",[s("strong",[e._v("Subscription type")]),e._v(": can be "),s("code",[e._v("free")]),e._v(" or "),s("code",[e._v("pro")]),e._v(" "),s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("Optionnal")]),e._v(" "),s("span",{staticClass:"chip"},[e._v("Default: free")])]),e._v(" "),s("li",[s("code",[e._v("--subscription-type free")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v("DBACKED_SUBSCRIPTION_TYPE=free")]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"subscriptionType": "free"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("li",[s("strong",[e._v("Agent ID")]),e._v(": Used when multiple instances of DBacked are launched to identify which made the backup\n"),s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("Optionnal")])]),e._v(" "),s("li",[s("code",[e._v("--agent-id awesome-agent")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v("DBACKED_AGENT_ID=awesome-agent")]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"agentId": "awesome-agent"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("li",[s("strong",[e._v("Database tools download directory")]),e._v(": where to download tools like "),s("code",[e._v("pg_dump")]),e._v(" and "),s("code",[e._v("mongorestore")]),e._v(" "),s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("Optionnal")]),e._v(" "),s("span",{staticClass:"chip"},[e._v("Default: /tmp/dbacked")])]),e._v(" "),s("li",[s("code",[e._v("--database-tools-directory /tmp/dbacked")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v("DBACKED_DATABASE_TOOLS_DIRECTORY=/tmp/dbacked")]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"databaseToolsDirectory": "/tmp/dbacked"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("li",[s("strong",[e._v("DBacked Pro API key")]),e._v(": Used to identify to DBacked servers when using pro version\n"),s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("DBacked PRO")])]),e._v(" "),s("li",[s("code",[e._v("--apikey thisismyapikey")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v("DBACKED_APIKEY=thisismyapikey")]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"apikey": "thisismyapikey"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("DBacked FREE")]),e._v(" "),s("span",{staticClass:"chip"},[e._v("Optionnal")])]),e._v(" "),s("li",[s("code",[e._v("--email john@gmail.com")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v("DBACKED_EMAIL=john@gmail.com")]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"email": "john@gmail.com"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("DBacked FREE")]),e._v(" "),s("span",{staticClass:"chip"},[e._v("Required")])]),e._v(" "),s("li",[s("code",[e._v('--cron "0 0 * * *"')]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v('DBACKED_CRON="0 0 * * *"')]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"cron": "0 0 * * *"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])},function(){var e=this.$createElement,t=this._self._c||e;return t("h2",{attrs:{id:"security-config"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#security-config","aria-hidden":"true"}},[this._v("#")]),this._v(" Security config")])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("ul",[s("li",[s("strong",[e._v("Public Key")]),e._v(": The RSA public key as a PEM to use to encrypt your backups, recommended length is 4096bits. DBacked can create one for you during the interactive install. If you are using DBacked Pro, the agent will fetch the key from the servers but you can specify it to be sure no backups will be encrypted with another key than your own.\n"),s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("Required")])]),e._v(" "),s("li",[s("code",[e._v("--public-key XXXXX")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v("DBACKED_PUBLIC_KEY=XXXXX")]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"publicKey": "XXXXX"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])])])},function(){var e=this.$createElement,t=this._self._c||e;return t("h2",{attrs:{id:"aws-s3-config"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#aws-s3-config","aria-hidden":"true"}},[this._v("#")]),this._v(" AWS S3 config")])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("li",[s("strong",[e._v("S3 Access Key ID")]),e._v(":\n"),s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("DBacked FREE")]),e._v(" "),s("span",{staticClass:"chip"},[e._v("Required")])]),e._v(" "),s("li",[s("code",[e._v("--s3-access-key-id XXXXX")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v("DBACKED_S3_ACCESS_KEY_ID=XXXXX")]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"s3accessKeyId": "XXXXX"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("li",[s("strong",[e._v("S3 Secret Access Key")]),e._v(":\n"),s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("DBacked FREE")]),e._v(" "),s("span",{staticClass:"chip"},[e._v("Required")])]),e._v(" "),s("li",[s("code",[e._v("--s3-secret-access-key XXXXX")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v("DBACKED_S3_SECRET_ACCESS_KEY=XXXXX")]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"s3secretAccessKey": "XXXXX"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("DBacked FREE")]),e._v(" "),s("span",{staticClass:"chip"},[e._v("Required")])]),e._v(" "),s("li",[s("code",[e._v("--s3-region eu-west-1")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v("DBACKED_S3_REGION=eu-west-1")]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"s3region": "eu-west-1"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("li",[s("strong",[e._v("S3 Bucket Name")]),e._v(": This bucket needs to be created before\n"),s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("DBacked FREE")]),e._v(" "),s("span",{staticClass:"chip"},[e._v("Required")])]),e._v(" "),s("li",[s("code",[e._v("--s3-bucket test-bucket")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v("DBACKED_S3_BUCKET=test-bucket")]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"s3bucket": "test-bucket"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])])},function(){var e=this.$createElement,t=this._self._c||e;return t("h2",{attrs:{id:"database-config"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#database-config","aria-hidden":"true"}},[this._v("#")]),this._v(" Database config")])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("li",[s("strong",[e._v("Database type")]),e._v(": can be "),s("code",[e._v("pg")]),e._v(", "),s("code",[e._v("mysql")]),e._v(" or "),s("code",[e._v("mongodb")]),e._v(" "),s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("Required")])]),e._v(" "),s("li",[s("code",[e._v("--db-type pg")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v("DBACKED_DB_TYPE=pg")]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"dbType": "pg"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("MongoDB Only")]),e._v(" "),s("span",{staticClass:"chip"},[e._v("Required")])]),e._v(" "),s("li",[s("code",[e._v("--db-connection-string mongodb://db1.example.net:27017/prod")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v('DBACKED_DB_CONNECTION_STRING="mongodb://db1.example.net:27017/prod"')]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"dbConnectionString": "mongodb://db1.example.net:27017/prod"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("li",[s("strong",[e._v("Database Host")]),e._v(": Can be a hostname or an IP address\n"),s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("PostgreSQL and MySQL Only")]),e._v(" "),s("span",{staticClass:"chip"},[e._v("Required")])]),e._v(" "),s("li",[s("code",[e._v("--db-host localhost")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v('DBACKED_DB_HOST="localhost"')]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"dbHost": "localhost"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("li",[s("strong",[e._v("Database Port")]),e._v(":\n"),s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("PostgreSQL and MySQL Only")]),e._v(" "),s("span",{staticClass:"chip"},[e._v("Optionnal")])]),e._v(" "),s("li",[s("code",[e._v("--db-port 5432")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v('DBACKED_DB_PORT="5432"')]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"dbPort": "5432"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("li",[s("strong",[e._v("Database Username")]),e._v(":\n"),s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("PostgreSQL and MySQL Only")]),e._v(" "),s("span",{staticClass:"chip"},[e._v("Optionnal")])]),e._v(" "),s("li",[s("code",[e._v("--db-username backup")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v('DBACKED_DB_USERNAME="backup"')]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"dbUsername": "backup"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("li",[s("strong",[e._v("Database Password")]),e._v(":\n"),s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("PostgreSQL and MySQL Only")]),e._v(" "),s("span",{staticClass:"chip"},[e._v("Optionnal")])]),e._v(" "),s("li",[s("code",[e._v("--db-password secretpassword")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v('DBACKED_DB_PASSWORD="secretpassword"')]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"dbPassword": "secretpassword"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("li",[s("strong",[e._v("Database Name")]),e._v(":\n"),s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("PostgreSQL and MySQL Only")]),e._v(" "),s("span",{staticClass:"chip"},[e._v("Required")])]),e._v(" "),s("li",[s("code",[e._v("--db-name prod")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v('DBACKED_DB_NAME="prod"')]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"dbName": "prod"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("li",[s("strong",[e._v("Database Alias")]),e._v(": Used in backups files names, by default it's the database name\n"),s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("PostgreSQL and MySQL Only")]),e._v(" "),s("span",{staticClass:"chip"},[e._v("Optionnal")])]),e._v(" "),s("li",[s("code",[e._v("--db-alias staging")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v('DBACKED_DB_ALIAS="staging"')]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"dbAlias": "staging"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])])},function(){var e=this.$createElement,t=this._self._c||e;return t("h2",{attrs:{id:"misc"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#misc","aria-hidden":"true"}},[this._v("#")]),this._v(" Misc")])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("li",[s("strong",[e._v("Dumper Options")]),e._v(": Additionnal arguments to provide to "),s("code",[e._v("pg_dump")]),e._v(", "),s("code",[e._v("mysqldump")]),e._v(" or "),s("code",[e._v("mongodump")]),e._v(" "),s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("Optionnal")])]),e._v(" "),s("li",[s("code",[e._v('--dumper-options "--no-privileges"')]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v('DBACKED_DUMPER_OPTIONS="--no-privileges"')]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"dumperOptions": "--no-privileges"')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("Optionnal")]),e._v(" "),s("span",{staticClass:"chip"},[e._v("Default: false")])]),e._v(" "),s("li",[s("code",[e._v("--send-analytics")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v('DBACKED_SEND_ANALYTICS="true"')]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"sendAnalytics": true')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("li",[s("strong",[e._v("Daemon")]),e._v(": Daemonize the agent, detaching it from the current session. It will check if another daemon is already running before daemonizing\n"),s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("Optionnal")]),e._v(" "),s("span",{staticClass:"chip"},[e._v("Only with start-agent command")])]),e._v(" "),s("li",[s("code",[e._v("--daemon")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v('DBACKED_DAEMON="true"')]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"daemon": true')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])])},function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("li",[s("strong",[e._v("Daemon Name")]),e._v(": Use another name to daemonize the agent, useful when you want multiple instances of DBacked to be daemonized at the same time (for multiple databases)\n"),s("ul",[s("li",[s("span",{staticClass:"chip"},[e._v("Optionnal")]),e._v(" "),s("span",{staticClass:"chip"},[e._v("Only with start-agent command")])]),e._v(" "),s("li",[s("code",[e._v("--daemon-name staging")]),e._v(" "),s("span",{staticClass:"chip config-type-cli"},[e._v("CLI")])]),e._v(" "),s("li",[s("code",[e._v('DBACKED_DAEMON_NAME="staging"')]),e._v(" "),s("span",{staticClass:"chip config-type-env"},[e._v("ENV")])]),e._v(" "),s("li",[s("code",[e._v('"daemonName": staging')]),e._v(" "),s("span",{staticClass:"chip config-type-cfg"},[e._v("CFG")])])])])}],!1,null,null,null);a.options.__file="configuration.md";t.default=a.exports}}]);