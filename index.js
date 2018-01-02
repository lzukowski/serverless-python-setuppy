'use strict'

const BbPromise = require('bluebird')
const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const child_process = require('child_process')
const zipper = require('zip-local')

BbPromise.promisifyAll(fs)


class ServerlessPlugin {
  fetchConfig() {
    if (!this.serverless.service.custom) {
      this.error("No serverless custom configurations are defined")
    }
    const config = this.serverless.service.custom.setuppy

    if (!config) {
      this.error(
        "No serverless-package-python-functions configuration detected. " +
        "Please see documentation"
      )
    }
    config.buildDir ? this.buildDir = config.buildDir : this.error(
      "No buildDir configuration specified"
    )

    config.cleanup === undefined ?
      this.cleanup = true : this.cleanup = config.cleanup
  }

  clean() {
    if (!this.cleanup) {
      this.log(
        'Cleanup is set to "false". ' +
        'Build directory and Docker container (if used) will be retained'
      )
      return false
    }
    this.log("Cleaning build directory...")
    fs.removeAsync(this.buildDir).catch( err => { this.log(err) } )
    return true
  }

  runProcess(cmd,args){
    const ret = child_process.spawnSync(cmd, args)
    if (ret.error) {
      this.error(ret.error.message)
    }

    if (ret.stderr.length != 0) {
      this.error(ret.stderr.toString())
    }

    return ret.stdout.toString()
  }

  ensureSetuppyFilesExists(target) {
    const no_setuppy_files = _.filter(target.includes, (include) => {
      return !fs.pathExistsSync(include + '/setup.py')
    })
    if (no_setuppy_files.length > 0) {
      this.error(
        `${target.name} function includes lacks of setup.py. ` +
        `lacking in: ${no_setuppy_files}`
      )
    }
    return true
  }

  installPackage(buildPath, packagePath) {
    this.log(`Install package ${packagePath} to ${buildPath}`)
    let cmd = 'pip'
    let args = [
      'install', '--upgrade', '--target', buildPath, packagePath
    ]
    return this.runProcess(cmd, args)
  }

  makePackage(target) {
    this.ensureSetuppyFilesExists(target)
    this.log(`Packaging ${target.name}...`)
    const buildPath = path.join(this.buildDir, target.name)
    fs.ensureDirSync(buildPath)

    _.forEach(target.includes, (packagePath) => {
      this.installPackage(buildPath, path.resolve(packagePath))
    })

    this.log(`zip ${buildPath} to ${target.artifact}`)
    zipper.sync.zip(buildPath).compress().save(target.artifact)
  }

  selectAll() {
    const functions = this.serverless.service.functions
    const setuppy_functions = this.serverless.service.custom.setuppy.functions

    const filtered = _.filter(functions, (target) => {
      return setuppy_functions.includes(target.name)
    })

    const info = _.map(filtered, (target) => {
      return {
        name: target.name,
        includes: target.package.include,
        artifact: target.package.artifact
      }
    })
    return info
  }

  constructor(serverless, options) {
    this.serverless = serverless
    this.options = options
    this.log = (msg) => { serverless.cli.log('[pySetuppy] ' + msg) }
    this.error = (msg) => {
       throw new Error(`[pySetuppy] ${msg}`)
    }

    this.hooks = {
      'before:package:createDeploymentArtifacts': () => BbPromise.bind(this)
        .then(this.fetchConfig())
        .then( () => { fs.ensureDirAsync(this.buildDir) })
        .then(this.selectAll)
        .map(this.makePackage),

        'after:deploy:deploy': () => BbPromise.bind(this)
          .then(this.clean)
    }
  }
}

module.exports = ServerlessPlugin
