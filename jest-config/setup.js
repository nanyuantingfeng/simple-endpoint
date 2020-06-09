const puppeteer = require('puppeteer')
const chalk = require('chalk')
const fs = require('fs')
const mkdirp = require('mkdirp')
const os = require('os')
const path = require('path')

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup')

module.exports = async function () {
  console.info(chalk.green('Setup Puppeteer'))
  const browser = await puppeteer.launch({ headless: true })

  global.__BROWSER_GLOBAL__ = browser
  mkdirp.sync(DIR)
  fs.writeFileSync(path.join(DIR, 'wsEndpoint'), browser.wsEndpoint())
}
