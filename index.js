/**
 * Module dependencies.
 */

var agenda = require('./lib/agenda')
var timing = require('./lib/utils/timing')
var log = require('debug')('democracyos:notifier')
var jobs = require('./lib/jobs')

// fix this with an var exports=module.exports =function and just rewriting exports
var transports = require('./lib/transports')

var defaults = {
  mongoUrl: 'mongodb://localhost/DemocracyOS-dev',
  collection: 'notifierJobs',
  mandrillToken: 'fake-mandrill-token',
  organizationEmail: 'noreply@democracyos.org',
  organizationName: 'The DemocracyOS team'
}

var exports = module.exports = function startNotifier(opts, callback) {
  var mongoUrl = opts.mongoUrl || defaults.mongoUrl
  var collection = opts.collection || defaults.collection
  var mandrillToken = opts.mandrillToken || defaults.mandrillToken
  var organizationName = opts.organizationName || defaults.organizationName
  var organizationEmail = opts.organizationEmail || defaults.organizationEmail

  agenda = agenda({db: {address: mongoUrl, collection: collection} })
  transports = transports({
    mandrillToken: mandrillToken,
    organizationEmail: organizationEmail,
    organizationName: organizationName
  })

  agenda.purge(function (err) {
    if (err) return callback && callback(err)

    //initialize job processors
    jobs(agenda, mongoUrl)

    agenda.on('start', function (job) {
      timing.start(job)
      log('Job \'%s\' started', job.attrs.name)
    })

    agenda.on('success', function (job) {
      var duration = timing.finish(job)
      log('Job \'%s\' completed - duration: %s', job.attrs.name, duration.asMilliseconds())
    })

    agenda.on('fail', function (err, job) {
      log('Job \'%s\' failed - reason: %s',job.attrs.name, err)
    })

    agenda.start()

    if (callback) return callback()
  })

  exports.notify = function notify(event, callback) {
    jobs.process(event.event, event, callback)
  }
}
