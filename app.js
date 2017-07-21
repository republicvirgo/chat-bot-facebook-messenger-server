const bodyParser = require('body-parser')
const config = require('config')
const crypto = require('crypto')
const express = require('express')
// const https = require('https')
const request = require('request')

var app = express()
app.set('port', 5000)
app.use(bodyParser.json({ verify: verifyRequestSignature }))

const APP_SECRET = config.get('appSecret')
const VALIDATION_TOKEN = config.get('validationToken')
const PAGE_ACCESS_TOKEN = config.get('pageAccessToken')

function verifyRequestSignature (req, res, buf) {
  const signature = req.headers['x-hub-signature']
  if (!signature) {
    console.error('Couldn\'t validate the signature.')
  } else {
    const elements = signature.split('=')
    // const method = elements[0]
    const signatureHash = elements[1]

    const expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                        .digest('hex')

    console.log('received  %s', signatureHash)
    console.log('exepected %s', expectedHash)

    if (signatureHash !== expectedHash) {
      throw new Error('Couldn\'t validate the request signature.')
    }
  }
}

function processMessageFromPage (event) {
  const senderID = event.sender.id
  const pageID = event.recipient.id
  const timeOfMessage = event.timestamp
  const message = event.message
  console.log('[prosesMessageFromPage] user %d page (%d) sender ID (%d) and message (%d)', senderID, pageID, timeOfMessage, JSON.stringify(message))

  let messageText = message.text
  if (messageText) {
    console.log('[processMessageFromPage] : %s ', messageText)
    const lowerCaseMsg = messageText.toLowerCase()
    switch (lowerCaseMsg) {
      case 'hi' :
        sendTextMessage(senderID, 'hi juga')
        break
      case 'siapa nih?' :
        sendTextMessage(senderID, 'kepo banget sih')
        break
      case 'yaudah' :
        sendTextMessage(senderID, 'ih kok gitu sih?')
        break
      case 'terus?' :
        sendTextMessage(senderID, 'ya usaha kek, nanya apa kek. gitu aja kok mudah nyerah')
        break
      case 'dasar cewek' :
        sendTextMessage(senderID, 'huh, dasar cowok NDAK PEKA!')
        break
      default:
        messageText = 'tolong jangan pake bahasa alien.'
        sendTextMessage(senderID, messageText)
    }
  }
}

function sendTextMessage (recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  }
  console.log('[sendTextMessage] %s ', JSON.stringify(messageData))
  callSendAPI(messageData)
}

function callSendAPI (messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData
  }, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      console.log('[callSendAPI] success!')
    } else {
      console.error('[callSendAPI] send API call failed', error)
    }
  })
}

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN)) {
  console.error('Missing config values')
  process.exit(1)
}

app.get('/', function (req, res) {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log('[app.get] validating webhook')
    res.status(200).send(req.query['hub.challenge'])
  } else {
    res.sendStatus(403)
  }
  // res.status(200).send(req.query['hub.challenge'])
})

app.post('/', function (req, res) {
  console.log('Message received!')
  var data = req.body
  if (data.object === 'page') {
    data.entry.forEach(function (pageEntry) {
      pageEntry.messaging.forEach(function (messagingEvent) {
        let propertyNames = []
        for (var prop in messagingEvent) { propertyNames.push(prop) }
        console.log('[app.post] webhook event props', propertyNames.join())
        if (messagingEvent.message) {
          processMessageFromPage(messagingEvent)
        } else {
          console.log('[app.post] not prepared to handle this message type')
        }
      })
    })
    res.sendStatus(200)
  }
})

app.listen(app.get('port'), function () {
  console.log('[app.listen] Node app is running on port', app.get('port'))
})

module.exports = app
