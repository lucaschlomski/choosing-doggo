require('dotenv').config()
require('./blocks')
const { App, AwsLambdaReceiver } = require('@slack/bolt')
const cron = require("cron").CronJob

const data = require('./db')
const blck = require('./blocks')


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
  marketing: "C4H329XMG"
}


// array of usergroup IDs
const group = {
  sales: "S027JT5CBQW",
  customerSuccess: "S027RRUF1M1",
  bizDev: "SMY88M352",
  marketing: "SJ5U3K2DC"
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
    return response.users
  }
}


// return random username from selcted usergroup and check their slack presence
async function findLuckyOne(targetType, targetId, checkPresence, exclusion) {
  let user_list = await fetchUserList(targetType, targetId)
  if (exclusion != null) {
    var exclusionFilterd_list = user_list.filter(element => {
      return !exclusion.includes(element)
    })
    if (exclusionFilterd_list == "") {
      return false
    }
  } else {
    var exclusionFilterd_list = user_list
  }
  if (checkPresence == "true") {
    let userStatus_list = await Promise.all(exclusionFilterd_list.map(async (element) => {
      let userPresence =  await app.client.users.getPresence({
        user: element
      })
      return {
        user: element,
        presence: userPresence.presence
      }
    }))
    let presenceFiltered = userStatus_list.filter(element => {
      return element.presence !== "away"
    })
    if (presenceFiltered == "") {
      return false
    }
    let random = Math.floor(Math.random() * presenceFiltered.length)
    var lucky = presenceFiltered[random].user
  } else {
    let random = Math.floor(Math.random() * exclusionFilterd_list.length)
    var lucky = exclusionFilterd_list[random]
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
async function sendMessage(targetType, targetId, checkPresence, header, note, channel_id) {
  let lucky_one = await findLuckyOne(targetType, targetId, checkPresence)
  if (lucky_one == false) {
    try {
       await app.client.chat.postMessage({
        channel: channel_id,
        text: `_In the selceted usergroup is currently no one online - try again without the "online" flag._`
      })
    } catch (err) {
      console.error(err)
    }
    return
  }
  let message = blck.messageTpl
  message[0].fields[0].text = `><@${lucky_one.id}>`
  message[0].accessory.image_url = lucky_one.image
  message[0].text.text = header
  message[2].text.text = note
  message[2].accessory.value = targetType + "-" + targetId + ";" + checkPresence
  try {
     await app.client.chat.postMessage({
      channel: channel_id,
      text: lucky_one.real_name + " was selcted to to something!",
      blocks: message
  })
  } catch (err) {
    console.error(err)
  }
}


// update message
async function updateMessage(targetType, targetId, checkPresence, message, message_channel, message_ts) {
  let excluded_users = message[0].fields[0].text.substring(message[0].fields[0].text.indexOf("<"), message[0].fields[0].text.indexOf(">") + 1) + message[1].elements[0].text.slice(message[1].elements[0].text.indexOf(" "))
  let lucky_one = await findLuckyOne(targetType, targetId, checkPresence, excluded_users)
  message[1].elements[0].text += ' ' + message[0].fields[0].text.substring(message[0].fields[0].text.indexOf("<"), message[0].fields[0].text.indexOf(">") + 1)
  if (lucky_one == false) {
    message[0].fields[0].text = `><no one could be selcted>`
    message[0].accessory.image_url = "https://avatars.slack-edge.com/2022-07-13/3790848556245_d0ef796c84106f2ecd20_72.jpg"
    try {
       await app.client.chat.update({
        channel: message_channel,
        ts: message_ts,
        text: "no one could be selcted!",
        blocks: message
      })
    } catch (err) {
      console.error(err)
    }
  } else {
    message[0].fields[0].text = `><@${lucky_one.id}>`
    message[0].accessory.image_url = lucky_one.image
    try {
      app.client.chat.update({
        channel: message_channel,
        ts: message_ts,
        text: lucky_one.real_name + " was selcted to to something!",
        blocks: message
      })
    } catch (err) {
      console.error(err)
    }
  }
}


// pushlishes updated view to app home
async function updateAppHome(userId) {
  let view = JSON.parse(JSON.stringify(blck.cronConfig))
  let rows = await data.getRows()
  await Promise.all(rows.map(row => {
    let newLine = JSON.parse(JSON.stringify(blck.cronRow))
    newLine.text.text = `*${row.name}* | \`${row.schedule}\` | *target:* ${(row.target_type == "@") ? `<!subteam^${row.target_id}>` : `<#${row.target_id}>`} | *slack status filter:* ${(row.check_presence == "true") ? ":heavy_check_mark:" : ":heavy_multiplication_x:"} | *post to:* <#${row.channel_id}> | *status:* ${(row.is_active == "true") ? ":green_flag:" : ":red_flag:"}`
    newLine.accessory.value = row.name
    view.blocks.push(newLine, blck.divider)
  }))
  view.blocks.push(blck.deleteCron)
  try {
    const result = await app.client.views.publish({
      user_id: userId,
      view: view
    })
  }
  catch (error) {
    console.error(error)
  }
}


// customize view
async function customizeCronView(cronName) {
  let cron = await data.getCronData(cronName)
  if (cron.target_type == '@') {
    let res = await app.client.usergroups.list()
    var groupData = res.usergroups.find(group => group.id == cron.target_id)
  }
  let view = JSON.parse(JSON.stringify(blck.editCron))
  view.private_metadata = `${String(cron.id)}|${cron.name}|${cron.is_active}`
  view.blocks[0].element.initial_value = cron.name
  view.blocks[1].element.initial_option = {text: {type: "plain_text", text: (cron.is_active == 'true') ? 'enabled' : 'disabled', emoji: true}, value: cron.is_active}
  view.blocks[2].element.initial_value = cron.schedule
  view.blocks[3].accessory.initial_option = (cron.target_type == '@') ? {value: "@", text: {type: "plain_text", text: "user group"}} : {value: "#", text: {type: "plain_text", text: "channel"}}
  if (cron.target_type == '@') {
    view.blocks[4].accessory.initial_option = {text: {type: "plain_text", text: groupData.name}, value: cron.target_id}
  } else {
    view.blocks[4] = {
      type: "section",
      block_id: "blck_target_id",
      text: {
        type: "mrkdwn",
        text: "*select target channel*",
      },
      accessory: {
        action_id: "target_select",
        type: "channels_select",
        initial_channel: cron.target_id,
        placeholder: {
          type: "plain_text",
          text: "Select channel",
        },
      },
    }
  }
  if (cron.check_presence == 'true') {view.blocks[5].element.initial_options = [{text: {type: "plain_text", text: "Filter | only allow selection of someone with status \"active\"", emoji: true}, value: "true"}]}
  view.blocks[6].accessory.initial_channel = cron.channel_id
  view.blocks[7].element.initial_value = cron.header
  view.blocks[8].element.initial_value = cron.note
  return view
}

// open slack view
async function openView(view, triggerId) {
  try {
    app.client.views.open({
      trigger_id: triggerId,
      view: view
    })
  } catch (err) {
    console.error(err)
  }
}

// updates view in slack
async function updateView(view, viewId) {
  try {
    app.client.views.update({
      view: view,
      view_id: viewId
    })
  } catch (err) {
    console.error(err)
  }
}


// action reroll button
app.action("reroll_button", async ({ack, body}) => {
  await ack()
  let targetType = body.actions[0].value.substring(0, body.actions[0].value.indexOf("-"))
  let targetId = body.actions[0].value.substring(body.actions[0].value.indexOf("-") + 1, body.actions[0].value.indexOf(";"))
  let checkPresence = body.actions[0].value.substring(body.actions[0].value.indexOf(";") + 1)
  updateMessage(targetType, targetId, checkPresence, body.message.blocks, body.container.channel_id, body.container.message_ts)
})

//app home publish
app.event("app_home_opened", async ({payload}) => {
  updateAppHome(payload.user)
});

const cronjobs = []

// create cron task for each saved schedule
async function startCronTasks() {
  let rows = await data.getRows()
  rows.forEach(row => {
    if (row.is_active == "true") {
      cronjobs[ row.name.replace(/[^a-z0-9]/gi, '')]  = new cron(row.schedule, () => {
        sendMessage(row.target_type, row.target_id, row.check_presence, row.header, row.note, row.channel_id)
        console.log(`>> running cron: ${row.name.replace(/[^a-z0-9]/gi, '')}`)
      }, null, true, 'Europe/Berlin')
      console.log(`+ new cron created: ${row.name.replace(/[^a-z0-9]/gi, '')}`)
    }
  })
}

// execute function
startCronTasks()

// creates new cron task
function newCron(data) {
  let cronName = data.name.replace(/[^a-z0-9]/gi, '')
  cronjobs[ cronName ]  = new cron(data.schedule, () => {
    sendMessage(data.target_type, data.target_id, data.check_presence, data.header, data.note, data.channel_id)
    console.log(`>> running cron: ${cronName}`)
  }, null, true, 'Europe/Berlin')
  console.log(`+ new cron created: ${cronName}`)
}


// listen for add cron button
app.action("add_cron", async ({ack, body}) => {
  await ack()
  let view = JSON.parse(JSON.stringify(blck.editCron))
  view.callback_id = "cron_creation"
  openView(view, body.trigger_id)
})

// listen for delete cron button
app.action("delete_cron", async ({ack, body}) => {
  await ack()
  let view = blck.cronDeletion
  openView(view, body.trigger_id)
})

// listen for edit cron button
app.action("edit_cron", async ({ack, body}) => {
  await ack()
  let view = await customizeCronView(body.actions[0].value)
  view.callback_id = "cron_edit"
  openView(view, body.trigger_id)
})

// providees options to user group select
app.options('target_select', async ({options, ack}) => {
  const res = await app.client.usergroups.list()
  if (res.ok) {
    let opt = []
    for (const group of res.usergroups) {
      if (group.name.toLowerCase().includes(options.value)) {
        opt.push({
          text: {
            type: "plain_text",
            text: group.name
          },
          value: group.id
        });
      }
    }
    await ack({
      options: opt
    });
  } else {
    await ack();
  }
});

// providees options to deletion select
app.options('cron_del_select', async ({options, ack}) => {
  const rows = await data.getRows()
  let opt = []
  for (const row of rows) {
    if (row.name.toLowerCase().includes(options.value)) {
      opt.push({
        text: {
          type: "plain_text",
          text: row.name
        },
        value: row.name
      })
    }
  }
  await ack({
    options: opt
  });
});

// modal submission event for cron deletion
app.view('cron_deletion', async ({ack, body, view}) => {
  await ack()
  let rowNames = await view.state.values.blck_select.cron_del_select.selected_options.map(opt => {
    return opt.value
  })
  data.deleteRows(rowNames)
  for (const name of rowNames) {
    try {
      cronjobs[ name.replace(/[^a-z0-9]/gi, '') ].stop()
      console.log(`- cron deleted: ${name.replace(/[^a-z0-9]/gi, '')}`)
    } catch (err) {
      console.error(err)
    }
  }
  setTimeout(() => {  updateAppHome(body.user.id) }, 1000)
})

// modal submission event for cron creation
app.view('cron_creation', async ({ack, body, view}) => {
  await ack()
  let input = {
    name: view.state.values.blck_name.name_select.value,
    schedule: view.state.values.blck_schedule.schedule_select.value,
    target_type: view.state.values.blck_target_type.target_type_select.selected_option.value,
    target_id: view.state.values.blck_target_type.target_type_select.selected_option.value === '@' ? view.state.values.blck_target_id.target_select.selected_option.value : view.state.values.blck_target_id.target_select.selected_channel,
    check_presence: view.state.values.blck_presence.check_presence_select.selected_options.length === 1 ? 'true' : 'false',
    channel_id: view.state.values.blck_channel.channel_select.selected_channel,
    header: view.state.values.blck_header.header_select.value,
    note: view.state.values.blck_note.note_select.value,
    is_active: view.state.values.blck_status.status_select.selected_option.value,
  }
  data.addRow(input)
  if (input.is_active == 'true') {
    newCron(input)
  }
  setTimeout(() => {  updateAppHome(body.user.id) }, 1000)
})

// modal submission event for edit cron
app.view('cron_edit', async ({ack, body, view}) => {
  await ack()
  let input = {
    id: view.private_metadata.slice(0, view.private_metadata.indexOf('|')),
    name: view.state.values.blck_name.name_select.value,
    schedule: view.state.values.blck_schedule.schedule_select.value,
    target_type: view.state.values.blck_target_type.target_type_select.selected_option.value,
    target_id: view.state.values.blck_target_type.target_type_select.selected_option.value === '@' ? view.state.values.blck_target_id.target_select.selected_option.value : view.state.values.blck_target_id.target_select.selected_channel,
    check_presence: view.state.values.blck_presence.check_presence_select.selected_options.length === 1 ? 'true' : 'false',
    channel_id: view.state.values.blck_channel.channel_select.selected_channel,
    header: view.state.values.blck_header.header_select.value,
    note: view.state.values.blck_note.note_select.value,
    is_active: view.state.values.blck_status.status_select.selected_option.value,
  }
  data.editRow(input)
  if (view.private_metadata.slice(view.private_metadata.lastIndexOf('|') + 1) == 'true') {
    try {
      let name = view.private_metadata.slice(view.private_metadata.indexOf('|') + 1, view.private_metadata.lastIndexOf('|')).replace(/[^a-z0-9]/gi, '')
      cronjobs[ name ].stop()
      console.log(`- cron deleted: ${name}`)
    } catch (err) {
      console.error(err)
    }
  }
  if (input.is_active == 'true') {
    newCron(input)
  }
  setTimeout(() => {  updateAppHome(body.user.id) }, 1000)
})

// acknowledge interaction: user group
app.action("target_select", async ({ack, body}) => {
  await ack()
})

// acknowledge interaction: channel
app.action("channel_select", async ({ack, body}) => {
  await ack()
})

// acknowledge interaction: cron del selcet
app.action("cron_del_select", async ({ack, body}) => {
  await ack()
})

// switch out options in cron edit view
app.action("target_type_select", async ({ack, body}) => {
  await ack()
  let view = JSON.parse(JSON.stringify(blck.editCron))
  view.callback_id = body.view.callback_id
  view.private_metadata = body.view.private_metadata
  if (body.view.state.values.blck_target_type.target_type_select.selected_option.value === '@') {
    view.blocks[4] = {
      type: "section",
      block_id: "blck_target_id",
      text: {
        type: "mrkdwn",
        text: "*select target user group*",
      },
      accessory: {
        action_id: "target_select",
        type: "external_select",
        placeholder: {
          type: "plain_text",
          text: "Select group",
        },
        min_query_length: 0,
      },
    }
    updateView(view, body.view.id)
  } else {
    view.blocks[4] = {
      type: "section",
      block_id: "blck_target_id",
      text: {
        type: "mrkdwn",
        text: "*select target channel*",
      },
      accessory: {
        action_id: "target_select",
        type: "channels_select",
        placeholder: {
          type: "plain_text",
          text: "Select channel",
        },
      },
    }
    updateView(view, body.view.id)
  }
})

// slack command tigger
app.command("/choose", async ({ack, command}) => {
  await ack()
  if (command.text == "") {
    sendMessage("#", command.channel_id, "false", blck.genericHeader, blck.genericNote, command.channel_id)
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
      sendMessage(targetType, targetId, checkPresence, blck.genericHeader, blck.genericNote, command.channel_id)
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
      sendMessage(targetType, targetId, checkPresence, blck.genericHeader, blck.genericNote, command.channel_id)
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
  console.log('⚡️ choosing-doggo is up and running!')
}

//start
startApp()