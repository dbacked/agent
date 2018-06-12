# DBacked agent

This package is the NodeJS binding for the [DBacked service](https://dbacked.com/). It cannot be used alone and you need an account on DBacked to use it.

DBacked is a simple, secure and reliable database backup as a service. It creates, stores and manages encrypted backups of your database with a single line to add to your server code.

This package will download and make sure the DBacked agent is started on the server your executing your code. It can be used in a multi-server deployment, the service will make sure only one server is backing up the database at the same time.

For more informations about the DBacked agent, what it does and its source code, look at its [repository](https://github.com/dbacked/agent).

## How to use

Install the agent as a dependency with `npm install --save dbacked-agent` then configure it in your code:

```js
const dbacked = require('dbacked-agent');

dbacked.initAgent({
  apikey: 'YOUR_PROJECT_API_KEY',
  dbType: 'pg', // or can be 'mysql'
  publicKey: 'YOUR_PUBLIC_KEY', // [OPTIONAL] same as the one you registered on your DBacked project
  daemonName: 'YOUR_PROJECT_NAME', // [OPTIONAL] used to start multiple instances of the agent on the same server
  db: {
    host: '127.0.0.1',
    user: 'boilerplate',
    password: 'boilerplate',
    database: 'boilerplate',
  },
});
```

If `process.env.NODE_ENV` is not equal to `production`, the agent will not be started and a warning will be printed. This is to prevent the agent from backing up a dev database instead of the production one.

It's a good practice to use the `daemonName` option. By default, the agent will not start if another instance is already started, this can be problematic when you host multiple projects on the same server. The `daemonName` option is used to execute only one agent per `daemonName`.

It's also a good practice to use the `publicKey` option to be sure the backups are encrypted with your key. If an attacker get access to your DBacked account, he/she can change the public key of your project and wait for a backup to be uploaded with this public key. Using this option will make sure that this key is always used for encrypting your backups. If this key doesn't match your project settings, an email will be sent.
