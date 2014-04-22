var syrup = require('syrup')

var logger = require('../../../util/logger')
var wire = require('../../../wire')
var wireutil = require('../../../wire/util')

module.exports = syrup.serial()
  .dependency(require('../support/router'))
  .dependency(require('../support/push'))
  .dependency(require('../support/adb'))
  .dependency(require('./input'))
  .define(function(options, router, push, adb, input) {
    var log = logger.createLogger('device:plugins:browsers')

    log.info('Fetching browser list')
    return input.getBrowsers()
      .timeout(15000)
      .then(function(browsers) {
        browsers.apps.forEach(function(app) {
          var pkg = app.component.split('/', 1)[0]

          switch (pkg) {
            case 'com.android.chrome':
              app.type = 'chrome'
              break
            case 'com.sec.android.app.sbrowser':
              app.type = 'samsung-chrome'
              break
            case 'com.android.browser':
              app.type = 'default'
              break
          }

          app.id = app.component

          delete app.icon
          delete app.component
        })

        router.on(wire.BrowserOpenMessage, function(channel, message) {
          var reply = wireutil.reply(options.serial)
          adb.startActivity(options.serial, {
              action: 'android.intent.action.VIEW'
            , component: message.browser
            , data: message.url
            })
            .then(function() {
              push.send([
                channel
              , reply.okay()
              ])
            })
            .catch(function(err) {
              log.error('Browser could not be opened', err.stack)
              push.send([
                channel
              , reply.fail()
              ])
            })
        })

        return browsers
      })
  })