require('dotenv').config()
require('./message')
const { App, AwsLambdaReceiver } = require('@slack/bolt')
const cron = require("cron").CronJob

// initializes the app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
})

// array of channel IDs
const channel = {
  luca_test: "GQVLQ43A8",
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
  const userList = await app.client.usergroups.users.list({
    usergroup: userGroup
  })
  const presence = await Promise.all(userList.users.map(async (element) => {
    var currentPresence =  await app.client.users.getPresence({
      user: element
    })
    return {
      user: element,
      presence: currentPresence.presence
    }
  }))
  const filteredUserList = presence.filter(element => {
    return element.presence !== "away"
  })
  const random = Math.floor(Math.random() * filteredUserList.length)
  const result = await app.client.users.info({
    user: filteredUserList[random].user
  })
  return lucky_one = {
    id: result.user.id,
    real_name: result.user.real_name,
    image: result.user.profile.image_192
  }
}

// post message
async function post_to_channel(channel_id, userGroup, message) {
  const lucky_one = await find_lucky_one(userGroup)
  message[0].fields[0].text = `><@${lucky_one.id}>`
  message[0].accessory.image_url = lucky_one.image
  app.client.chat.postMessage({
    channel: channel_id,
    text: lucky_one.real_name + " was selcted!",
    blocks: message
  })
}

// update message
async function update_message(userGroup, message, message_channel, message_ts) {
  const lucky_one = await find_lucky_one(userGroup)
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

//button action sales message
app.action("sales_button", async ({ack, body}) => {
  await ack()
  update_message(group.sales, body.message.blocks, body.container.channel_id, body.container.message_ts)
})

//button action customer success message
app.action("customerSuccess_button", async ({ack, body}) => {
  await ack()
  update_message(group.customerSuccess, body.message.blocks, body.container.channel_id, body.container.message_ts)
})

// cron Sales
const cron_sales = new cron("45 13 * * 5", () => {
  post_to_channel(channel.sales, group.sales, m_sales)
  console.log("*running cron sales*")
},null, true, 'Europe/Berlin')


// cron Customer Success
const cron_customerSuccess = new cron("45 13 * * 5", () => {
  post_to_channel(channel.customerSuccess, group.customerSuccess, m_customerSuccess)
  console.log("*running cron customer success*")
},null, true, 'Europe/Berlin')

// slack command tigger
app.command("/choose", async ({ack, command}) => {
  await ack()
  console.log(command.text.substring(command.text.indexOf("ˆ"), command.text.indexOf("|")))
  post_to_channel(command.channel_id, group.customerSuccess, m_customerSuccess)
})

  // starting the app
async function startApp() {
  await app.start(process.env.PORT || 3000)
  console.log('⚡️ who-has-to is up and running!')
}

//start
startApp()