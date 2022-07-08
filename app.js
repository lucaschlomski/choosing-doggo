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
  return lucky_one = {id: result.user.id, real_name: result.user.real_name, image: result.user.profile.image_192};
};


// post message
async function post_to_channel(channel_id, user_group, message) {
  const lucky_one = await find_lucky_one(user_group);
  message[0].fields[0].text += `<@${lucky_one.id}>`;
  message[0].accessory.image_url = lucky_one.image;
  app.client.chat.postMessage({
    channel: channel_id,
    text: lucky_one.real_name + " was selcted!",
    blocks: message
  });
  console.log(message[0].fields);
};

// update message
async function update_message(user_group, message, message_channel, message_ts) {
  const lucky_one = await find_lucky_one(user_group);
  var check = message[0].fields[0].text.charAt(0);
  if( check == "~" ) {
    message[0].fields[0].text = message[0].fields[0].text.slice(0, message[0].fields[0].text.lastIndexOf("~")) + message[0].fields[0].text.slice(message[0].fields[0].text.lastIndexOf("~") + 1) + "~ " + `<@${lucky_one.id}>`;
  } else {
    message[0].fields[0].text = /*message[0].fields[0].text.slice(0, 1) +*/ ">~" + message[0].fields[0].text.slice(0) + "~ " + `<@${lucky_one.id}>`;
  };
  message[0].accessory.image_url = lucky_one.image;
  app.client.chat.update({
    channel: message_channel,
    ts: message_ts,
    text: lucky_one.real_name + " was selcted!",
    blocks: message
  });
};

post_to_channel(channel.luca_test, group.sales, m_sales);

//button action sales message
app.action("sales_button", async ({ack, body}) => {
  await ack();
  console.log(body.message.blocks[0].fields);
  update_message(group.sales, body.message.blocks, body.container.channel_id, body.container.message_ts);
});

//button action customer success message
app.action("customer_success_button", async ({ack, body}) => {
  await ack();
  console.log(body.message);
  update_message(group.customer_success, body.message.blocks, body.container.channel_id, body.container.message_ts);
});

// cron Sales
const cron_sales = new cron("45 13 * * 5", () => {
  post_to_channel(channel.sales, group.sales, m_sales),
  console.log("*running cron sales*")
},null, true, 'Europe/Berlin');


// cron Customer Success
const cron_customer_success = new cron("45 13 * * 5", () => {
  post_to_channel(channel.customer_success, group.customer_success, m_customer_success),
  console.log("*running cron customer success*")
},null, true, 'Europe/Berlin');


(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();