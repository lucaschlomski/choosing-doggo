require('dotenv').config()
require('./message')
const { App, AwsLambdaReceiver } = require('@slack/bolt')
const cron = require("cron").CronJob


// initializes the app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
})


// array of channel IDs
const channel = {
  testLuca: "GQVLQ43A8",
  sales: "CF5G5BPJN",
  customerSuccess: "C026T9RKNCQ",
  marketing: "SJ5U3K2DC"
}


// array of usergroup IDs
const group = {
  sales: "S027JT5CBQW",
  customerSuccess: "S027RRUF1M1",
  bizDev: "SMY88M352"
}

// fetch list of users
async function fetchUserList(targetType, targetId) {
  if (targetType == "#") {
    let response = await app.client.conversations.members({
      channel: targetId
    })
    return response.members
  } else {
    let response = await app.client.usergroups.users.list({
      usergroup: targetId
    })
    console.log(response.users)
    return response.users
  }
}


// return random username from selcted usergroup and check their slack presence
async function findLuckyOne(targetType, targetId, checkPresence) {
  let userList = await fetchUserList(targetType, targetId)
  let presence = await Promise.all(userList.map(async (element) => {
    let userPresence =  await app.client.users.getPresence({
      user: element
    })
    return {
      user: element,
      presence: userPresence.presence
    }
  }))
  let filteredUserList = presence.filter(element => {
    return element.presence !== "away"
  })
  if (filteredUserList == "") {
    return false
  }
  if (checkPresence == "true") {
    let random = Math.floor(Math.random() * filteredUserList.length)
    var lucky = filteredUserList[random].user
  } else {
    let random = Math.floor(Math.random() * userList.length)
    var lucky = userList[random]
  }
  let userInfo = await app.client.users.info({
    user: lucky
  })
  return {
    id: userInfo.user.id,
    real_name: userInfo.user.real_name,
    image: userInfo.user.profile.image_192,
  }
}


// post message
async function sendMessage(targetType, targetId, checkPresence, message, channel_id) {
  let lucky_one = await findLuckyOne(targetType, targetId, checkPresence)
  if (lucky_one == false) {
    app.client.chat.postMessage({
      channel: channel_id,
      text: `_In the selceted usergroup is currently no one online - try again without the "online" flag._`
    })
    return
  }
  message[0].fields[0].text = `><@${lucky_one.id}>`
  message[0].accessory.image_url = lucky_one.image
  message[1].accessory.value = targetType + "-" + targetId + ";" + checkPresence
  app.client.chat.postMessage({
    channel: channel_id,
    text: lucky_one.real_name + " was selcted!",
    blocks: message
  })
}


// update message
async function updateMessage(targetType, targetId, checkPresence, message, message_channel, message_ts) {
  let lucky_one = await findLuckyOne(targetType, targetId, checkPresence)
  if( message[0].fields[0].text.charAt(4) == "~" ) {
    message[0].fields[0].text = message[0].fields[0].text.slice(0, message[0].fields[0].text.lastIndexOf("~")) + message[0].fields[0].text.slice(message[0].fields[0].text.lastIndexOf("~") + 1) + "~ " + `<@${lucky_one.id}>`
  } else {
    message[0].fields[0].text = message[0].fields[0].text.slice(0, 4) + "~" + message[0].fields[0].text.slice(4) + "~ " + `<@${lucky_one.id}>`
  }
  message[0].accessory.image_url = lucky_one.image
  app.client.chat.update({
    channel: message_channel,
    ts: message_ts,
    text: lucky_one.real_name + " was selcted!",
    blocks: message
  })
}


// action reroll button
app.action("reroll_button", async ({ack, body}) => {
  await ack()
  let targetType = body.actions[0].value.substring(0, body.actions[0].value.indexOf("-"))
  let targetId = body.actions[0].value.substring(body.actions[0].value.indexOf("-") + 1, body.actions[0].value.indexOf(";"))
  let checkPresence = body.actions[0].value.substring(body.actions[0].value.indexOf(";") + 1)
  updateMessage(targetType, targetId, checkPresence, body.message.blocks, body.container.channel_id, body.container.message_ts)
})


// cron Sales
const cron_sales = new cron("45 9 * * 5", () => {
  sendMessage("@", group.sales, true,  m_sales, channel.sales)
  console.log("*running cron sales*")
},null, true, 'Europe/Berlin')


// cron Customer Success
const cron_customerSuccess = new cron("45 9 * * 5", () => {
  sendMessage("@", group.customerSuccess, true, m_customerSuccess, channel.customerSuccess)
  console.log("*running cron customer success*")
},null, true, 'Europe/Berlin')


// slack command tigger
app.command("/choose", async ({ack, command}) => {
  await ack()
  if (command.text == "") {
    sendMessage("#", command.channel_id, "false", m_generic, command.channel_id)
    return
  }
  if (command.text.substring(command.text.indexOf(" ") + 1) == "online") {
    var checkPresence = "true"
  } else {
    var checkPresence = "false"
  }
  let targetType = command.text.substring(1, 2)
  if (targetType == "#") {
    let targetId = command.text.substring(command.text.indexOf("#") + 1, command.text.indexOf("|"))
    let validation = await app.client.conversations.members({
      channel: targetId
    })
    if (validation.ok = true) {
      sendMessage(targetType, targetId, checkPresence, m_generic, command.channel_id)
    } else {
      app.client.chat.postMessage({
        channel: command.channel_id,
        text: `_The specified channel is invalid._`
      })
    }
  } else {
    let targetId = command.text.substring(command.text.indexOf("^") + 1, command.text.indexOf("|"))
    let validation = await app.client.usergroups.users.list({
      usergroup: targetId
    })
    if (validation.ok = true) {
      sendMessage(targetType, targetId, checkPresence, m_generic, command.channel_id)
    } else {
      app.client.chat.postMessage({
        channel: command.channel_id,
        text: `_The specified usergroup is invalid._`
      })
    }
  }
})


// starting the app
async function startApp() {
  await app.start(process.env.PORT || 3000)
  console.log('⚡️ who-has-to is up and running!')
}


//start
startApp()