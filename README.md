# pino-raven

Load [pino](https://github.com/pinojs/pino) logs into [Sentry](https://sentry.io).

## Install

```bash
npm install pino-raven -g
```

## Usage

```bash
$ node ./server.js | pino-raven --dsn=https://abc:def@sentry.io/1234
```

Or, by using configuration json file:

```bash
$ node ./server.js | pino-raven --config raven.json
```

## Options

+ `--config` (`-c`): read config from a JSON file (switches take precedence)
+ `--dsn`: Sentry DSN

## Config JSON file

A full settings file is:
```json
{
  "dsn": "https://abc:def@sentry.io/1234",
  "logger": "node", // default
  "name": "MyApp",
  "release": "1.3.0",
  "environment": "development", // default
  "tags": {},
  "extra": {
    "hello": "world"
  },
  "sampleRate": 1.0, // default
  "sendTimeout": 1, // default
  "includeModules": true // default
}
```

## License

[MIT License](LICENSE)
