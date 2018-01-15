'use strict'

const ravenUtils = require('raven').utils

function traceExtra (pinoInstance, options = {}) {
  function get (target, name) {
    return name === 'asJson' ? asJson : target[name]
  }

  function asJson (...args) {
    args[0] = args[0] || Object.create(null)
    options.withModules && (args[0].modules = ravenUtils.getModules())

    return pinoInstance.asJson.apply(this, args)
  }

  return new Proxy(pinoInstance, { get })
}

module.exports = traceExtra
