'use strict';

class ServerlessPlugin {
  fetchConfig() {
    if (!this.serverless.service.custom){
      this.error("No serverless custom configurations are defined")
    }

    const config = this.serverless.service.custom.setuppy
    _.forEach()
    this.log(config.functions);
    if ( !config ) {
      this.error("No serverless-package-python-functions configuration detected. Please see documentation")
    }
    config.buildDir ? this.buildDir = config.buildDir : this.error("No buildDir configuration specified")
    this.containerName = config.containerName || 'serverless-package-python-functions'
    }

  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.log = (msg) => { serverless.cli.log('[pySetuppy] ' + msg); };
    this.error = (msg) => {
       throw new Error(`[pySetuppy] ${msg}`)
    }

    // this.commands = {
    //   welcome: {
    //     usage: 'Helps you start your first Serverless plugin',
    //     lifecycleEvents: [
    //       'hello',
    //       'world',
    //     ],
    //     options: {
    //       message: {
    //         usage:
    //           'Specify the message you want to deploy '
    //           + '(e.g. "--message \'My Message\'" or "-m \'My Message\'")',
    //         required: true,
    //         shortcut: 'm',
    //       },
    //     },
    //   },
    // };

    this.hooks = {
      'before:package:createDeploymentArtifacts': () => this.fetchConfig(),
      // 'before:welcome:hello': this.beforeWelcome.bind(this),
      // 'welcome:hello': this.welcomeUser.bind(this),
      // 'welcome:world': this.displayHelloMessage.bind(this),
      // 'after:welcome:world': this.afterHelloWorld.bind(this),
    };
  }


  // beforeWelcome() {
  //   this.serverless.cli.log('Hello from Serverless!');
  // }
  //
  // welcomeUser() {
  //   this.serverless.cli.log('Your message:');
  // }
  //
  // displayHelloMessage() {
  //   this.serverless.cli.log(`${this.options.message}`);
  // }
  //
  // afterHelloWorld() {
  //   this.serverless.cli.log('Please come again!');
  // }
}

module.exports = ServerlessPlugin;
