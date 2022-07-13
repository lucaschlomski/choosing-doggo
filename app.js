require('dotenv').config()
require('./message')
const { App, AwsLambdaReceiver } = require('@slack/bolt')
const cron = require("cron").CronJob


// initializes the app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  port: process.env.PORT || 3000
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


// return random username from selcted usergroup and check their slack presence
async function find_lucky_one(userGroup, checkPresence) {
  let userList = await app.client.usergroups.users.list({
    usergroup: userGroup
  })
  let presence = await Promise.all(userList.users.map(async (element) => {
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
    let random = Math.floor(Math.random() * userList.users.length)
    var lucky = userList.users[random]
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
async function sendMessage(userGroup, checkPresence, message, channel_id) {
  let lucky_one = await find_lucky_one(userGroup, checkPresence)
  if (lucky_one == false) {
    app.client.chat.postMessage({
      channel: channel_id,
      text: `_In the selceted usergroup is currently no one online - try again without the "online" flag._`
    })
    return
  }
  message[0].fields[0].text = `><@${lucky_one.id}>`
  message[0].accessory.image_url = lucky_one.image
  message[1].accessory.value = userGroup + ";" + checkPresence
  app.client.chat.postMessage({
    channel: channel_id,
    text: lucky_one.real_name + " was selcted!",
    blocks: message
  })
}


// update message
async function updateMessage(userGroup, checkPresence, message, message_channel, message_ts) {
  let lucky_one = await find_lucky_one(userGroup, checkPresence)
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
  let groupId = body.actions[0].value.substring(0, body.actions[0].value.indexOf(";"))
  let checkPresence = body.actions[0].value.substring(body.actions[0].value.indexOf(";") + 1)
  updateMessage(groupId, checkPresence, body.message.blocks, body.container.channel_id, body.container.message_ts)
})


// cron Sales
const cron_sales = new cron("45 13 * * 5", () => {
  sendMessage(group.sales, true,  m_sales, channel.testLuca)
  console.log("*running cron sales*")
},null, true, 'Europe/Berlin')


// cron Customer Success
const cron_customerSuccess = new cron("45 13 * * 5", () => {
  sendMessage(group.customerSuccess, true, m_customerSuccess, channel.testLuca)
  console.log("*running cron customer success*")
},null, true, 'Europe/Berlin')


// slack command tigger
app.command("/choose", async ({ack, command}) => {
  await ack()
  let groupId = command.text.substring(command.text.indexOf("^") + 1, command.text.indexOf("|"))
  let validation = await app.client.usergroups.users.list({
    usergroup: groupId
  })
  if (command.text.substring(command.text.indexOf(" ") + 1) == "online") {
    var checkPresence = "true"
  } else {
    var checkPresence = "false"
  }
  if (validation.ok = true) {
    sendMessage(groupId, checkPresence, m_generic, command.channel_id)
  } else {
    console.log("input not valid")
  }
})


// starting the app
async function startApp() {
  await app.start(process.env.PORT || 3000)
  console.log('⚡️ who-has-to is up and running!')
}


//start
startApp()