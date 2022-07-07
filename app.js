require('dotenv').config();
require('./message');
const { App, AwsLambdaReceiver } = require('@slack/bolt');
const cron = require("cron").CronJob;


// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// array of channel IDs
const channel = {
  luca_test: "GQVLQ43A8",
  sales: "CF5G5BPJN",
  customer_success: "C026T9RKNCQ"
};

// array of usergroup IDs
const group = {
  sales: "S027JT5CBQW",
  customer_success: "S027RRUF1M1",
  biz_dev: "SMY88M352"
};

var user_image;

// return random username from selcted usergroup
async function find_lucky_one(user_group) {
  const user_list = await app.client.usergroups.users.list({
    usergroup: user_group
  });
  const random = Math.floor(Math.random() * user_list.users.length);
  const result = await app.client.users.info({
    user: user_list.users[random]
  });
  user_image = result.user.profile.image_192;
  return result.user.real_name;
};


// post lucky user to channel
async function post_to_channel(channel_id, user_group, message) {
  const lucky_one = await find_lucky_one(user_group);
  message[0].fields[0].text += `~<@luca.schlomski>~`;
  message[0].accessory.image_url += user_image;
  app.client.chat.postMessage({
    channel: channel_id,
    text: lucky_one + " was selcted",
    blocks: message
  });
};

post_to_channel(channel.luca_test, group.sales, m_sales);

app.action("sales_button", ({ack, body}) => {
  ack();
  console.log(body);
});

// cron Sales
const cron_sales = new cron("45 13 * * 5", () => {
  post_to_channel(channel.luca_test, group.customer_success, m_sales),
  console.log("*running cron*")
},null, true, 'Europe/Berlin');


// cron Customer Success
const cron_customer_success = new cron("45 13 * * 5", () => {
  post_to_channel(channel.luca_test, group.customer_success, m_customer_success),
  console.log("*running cron*")
},null, true, 'Europe/Berlin');


(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();