'use strict'

const nopt = require('nopt')
const path = require('path')
const pump = require('pump')
const split2 = require('split2')
const parseJson = require('fast-json-parse')
const through2 = require('through2')
const Raven = require('raven')

const longOpts = {
  config: String,
  dns: String
}

const shortOpts = {
  c: '--config'
}

let options = {
  dsn: null,
  logger: 'node',
  name: null,
  release: null,
  environment: process.env.NODE_ENV || 'development',
  tags: {},
  extra: {},
  sampleRate: 1.0,
  sendTimeout: 1,
  includeModules: true
}

const args = nopt(longOpts, shortOpts, process.argv)
options = Object.assign(options, args)

if (options.version) {
  console.log('pino-raven', require('./package.json').version)
  process.exit(0)
}

if (options.config) {
  try {
    const loadedConfig = require(path.resolve(options.config))
    options = Object.assign(options, loadedConfig)
  } catch (e) {
    console.error('`config` parameter specified but could not load file: %s', e.message)
    process.exit(1)
  }
}

function levelToSeverity (level) {
  let result
  switch (level) {
    case 10: // pino: trace
      result = 'debug'
      break
    case 20: // pino: debug
      result = 'debug'
      break
    case 30: // pino: info
      result = 'info'
      break
    case 40: // pino: warn
      result = 'warning'
      break
    case 50: // pino: error
      result = 'error'
      break
    default:
    case 60: // pino: fatal
      result = 'fatal'
      break
  }

  return result
}

function install (data) {
  Raven.config(options.dsn, {
    logger: options.logger,
    environment: options.environment,
    release: options.release,
    tags: options.tags,
    extra: options.extra,
    sampleRate: options.sampleRate,
    sendTimeout: options.sendTimeout,
    dataCallback: (dataOrigin) => {
      delete dataOrigin.modules
      if (options.includeModules && data.modules) {
        dataOrigin.modules = data.modules
      }

      return dataOrigin
    }
  }).install()
}

function myTransport () {
  let isInstalled = false

  return through2.obj(function transport (data, enc, cb) {
    !isInstalled && install(data)
    isInstalled = true

    const severity = levelToSeverity(data.level)
    const tags = data.tags || {}
    if (data.reqId) {
      tags.uuid = data.reqId
    }
    const request = data.req || null
    const response = data.res || null
    if (response && response.routePath) {
      tags.route = response.routePath
    }

    const extra = data.extra || {}
    if (data.responseTime) {
      extra.responseTime = data.responseTime
    }

    const user = data.user || {}

    let ravenMethod = Raven.captureMessage.bind(Raven)
    let message = data.msg

    if (data.err && data.err.stack) {
      const error = new global[data['err']['type']](data.err.message)
      error.stack = data.err.stack

      ravenMethod = Raven.captureException.bind(Raven)
      message = error
    }

    if (request && response) {
      Raven.captureBreadcrumb({
        type: 'http',
        category: 'http',
        data: {
          method: request.method,
          url: request.url,
          status_code: response.statusCode
        }
      })
    }

    setImmediate(() => ravenMethod(message, {
      level: severity,
      tags,
      extra,
      request,
      user
    }, cb))
  })
}

function parser (str) {
  const result = parseJson(str)
  if (result.err) return
  return result.value
}

pump(process.stdin, split2(parser), myTransport())
process.on('SIGINT', () => { process.exit(0) })
