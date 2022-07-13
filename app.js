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


// return random username from selcted usergroup and check their slack presence
async function find_lucky_one(userGroup) {
  let userList = await app.client.usergroups.users.list({
    usergroup: userGroup
  })
  let presence = await Promise.all(userList.users.map(async (element) => {
    var currentPresence =  await app.client.users.getPresence({
      user: element
    })
    return {
      user: element,
      presence: currentPresence.presence
    }
  }))
  let filteredUserList = presence.filter(element => {
    return element.presence !== "away"
  })
  let random = Math.floor(Math.random() * filteredUserList.length)
  let result = await app.client.users.info({
    user: filteredUserList[random].user
  })
  return lucky_one = {
    id: result.user.id,
    real_name: result.user.real_name,
    image: result.user.profile.image_192
  }
}


// post message
async function sendMessage(channel_id, userGroup, message) {
  const lucky_one = await find_lucky_one(userGroup)
  message[0].fields[0].text = `><@${lucky_one.id}>`
  message[0].accessory.image_url = lucky_one.image
  message[1].accessory.value = userGroup
  app.client.chat.postMessage({
    channel: channel_id,
    text: lucky_one.real_name + " was selcted!",
    blocks: message
  })
}


// update message
async function updateMessage(userGroup, message, message_channel, message_ts) {
  let lucky_one = await find_lucky_one(userGroup)
  var check = message[0].fields[0].text.charAt(4)
  if( check == "~" ) {
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
  updateMessage(body.actions[0].value, body.message.blocks, body.container.channel_id, body.container.message_ts)
})


// cron Sales
const cron_sales = new cron("03 16 * * 3", () => {
  sendMessage(channel.testLuca, group.sales, m_sales)
  console.log("*running cron sales*")
},null, true, 'Europe/Berlin')


// cron Customer Success
const cron_customerSuccess = new cron("04 16 * * 3", () => {
  sendMessage(channel.testLuca, group.customerSuccess, m_customerSuccess)
  console.log("*running cron customer success*")
},null, true, 'Europe/Berlin')


// slack command tigger
app.command("/choose", async ({ack, command}) => {
  await ack()
  let groupId = await command.text.substring(command.text.indexOf("^") + 1, command.text.indexOf("|"))
  let validation = await app.client.usergroups.users.list({
    usergroup: groupId
  })
  if (validation.ok = true) {
    sendMessage(command.channel_id, groupId, m_generic)
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