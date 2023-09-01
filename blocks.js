const genericHeader = "*Pluto hat, nach intensivem Nachdenken, eine Entscheidung getroffen!*\n*Ausgwählt wurde:*";

const genericNote = ":cool-doge:";

const messageTpl = [
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: "<no message defined>",
    },
    accessory: {
      type: "image",
      image_url: "",
      alt_text: "user image",
    },
    fields: [
      {
        type: "mrkdwn",
        text: ">",
      },
    ],
  },
  {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "*History:*",
      },
    ],
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: "<no message defined>",
    },
    accessory: {
      type: "button",
      text: {
        type: "plain_text",
        text: "pick someone else",
        emoji: true,
      },
      action_id: "reroll_button",
    },
  },
];

const cronConfig = {
  type: "home",
  blocks: [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Choosing Doggo's scheduled selections | :confused_dog:",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "Here you can schedule selctions, which will be executed regularly. For scheduling a cron expression is used. (<https://www.npmjs.com/package/node-cron|Reference>)",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: " ",
      },
      accessory: {
        type: "button",
        style: "primary",
        text: {
          type: "plain_text",
          text: "add",
          emoji: true,
        },
        value: "placeholder",
        action_id: "add_cron",
      },
    },
    {
      type: "divider",
    },
  ],
};

const cronRow = {
  type: "section",
  text: {
    type: "mrkdwn",
    text: "<placeholder>",
  },
  accessory: {
    type: "button",
    text: {
      type: "plain_text",
      text: "edit",
      emoji: true,
    },
    value: "placeholder",
    action_id: "edit_cron",
  },
};

const deleteCron = {
  type: "section",
  text: {
    type: "mrkdwn",
    text: " ",
  },
  accessory: {
    type: "button",
    style: "danger",
    text: {
      type: "plain_text",
      text: "delete",
      emoji: true,
    },
    value: "placeholder",
    action_id: "delete_cron",
  },
};

const divider = {
  type: "divider",
};

const editCron = {
  type: "modal",
  callback_id: "",
  private_metadata: "",
  title: {
    type: "plain_text",
    text: "schedule configurator",
    emoji: true,
  },
  submit: {
    type: "plain_text",
    text: "Save",
    emoji: true,
  },
  close: {
    type: "plain_text",
    text: "Cancel",
    emoji: true,
  },
  blocks: [
    {
      type: "input",
      block_id: "blck_name",
      element: {
        type: "plain_text_input",
        action_id: "name_select",
        initial_value: "",
      },
      label: {
        type: "plain_text",
        text: "name",
        emoji: true,
      },
    },
    {
      type: "input",
      block_id: "blck_status",
      element: {
        type: "static_select",
        placeholder: {
          type: "plain_text",
          text: "Select enabled or disabled",
          emoji: true,
        },
        options: [
          {
            text: {
              type: "plain_text",
              text: "enabled",
              emoji: true,
            },
            value: "true",
          },
          {
            text: {
              type: "plain_text",
              text: "disabled",
              emoji: true,
            },
            value: "false",
          },
        ],
        action_id: "status_select",
      },
      label: {
        type: "plain_text",
        text: "status",
        emoji: true,
      },
    },
    {
      type: "input",
      block_id: "blck_schedule",
      element: {
        type: "plain_text_input",
        action_id: "schedule_select",
        initial_value: "",
        placeholder: {
          type: "plain_text",
          text: "z.B. 0 11 * * 1",
        },
      },
      label: {
        type: "plain_text",
        text: "cron schedule (* * * * *)",
        emoji: true,
      },
    },
    {
      type: "section",
      block_id: "blck_target_type",
      text: {
        type: "mrkdwn",
        text: "*select target type*",
      },
      accessory: {
        type: "radio_buttons",
        action_id: "target_type_select",
        initial_option: {
          value: "@",
          text: {
            type: "plain_text",
            text: "user group",
          },
        },
        options: [
          {
            value: "@",
            text: {
              type: "plain_text",
              text: "user group",
            },
          },
          {
            value: "#",
            text: {
              type: "plain_text",
              text: "channel",
            },
          },
        ],
      },
    },
    {
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
    },
    {
      type: "input",
      block_id: "blck_presence",
      optional: true,
      element: {
        type: "checkboxes",
        options: [
          {
            text: {
              type: "plain_text",
              text: 'Filter | only allow selection of someone with status "active"',
              emoji: true,
            },
            value: "true",
          },
        ],
        action_id: "check_presence_select",
      },
      label: {
        type: "plain_text",
        text: "slack presence check",
        emoji: true,
      },
    },
    {
      type: "section",
      block_id: "blck_channel",
      text: {
        type: "mrkdwn",
        text: "*channel to post selection message to*",
      },
      accessory: {
        action_id: "channel_select",
        type: "channels_select",
        placeholder: {
          type: "plain_text",
          text: "Select channel",
        },
      },
    },
    {
      type: "input",
      block_id: "blck_header",
      element: {
        type: "plain_text_input",
        multiline: true,
        action_id: "header_select",
        initial_value: "",
      },
      label: {
        type: "plain_text",
        text: "message (text field 1) | use slack markdown",
        emoji: true,
      },
    },
    {
      type: "input",
      block_id: "blck_note",
      element: {
        type: "plain_text_input",
        multiline: true,
        action_id: "note_select",
        initial_value: "",
      },
      label: {
        type: "plain_text",
        text: "additional notes (text field 2) | use slack markdown",
        emoji: true,
      },
    },
  ],
};

const cronDeletion = {
  type: "modal",
  callback_id: "cron_deletion",
  title: {
    type: "plain_text",
    text: "Task Deletion",
    emoji: true,
  },
  submit: {
    type: "plain_text",
    text: "DELETE",
    emoji: true,
  },
  close: {
    type: "plain_text",
    text: "Close",
    emoji: true,
  },
  blocks: [
    {
      type: "section",
      block_id: "blck_select",
      text: {
        type: "mrkdwn",
        text: "Select scheduled selections you want to DELETE",
      },
      accessory: {
        action_id: "cron_del_select",
        type: "multi_external_select",
        placeholder: {
          type: "plain_text",
          text: "Search taks to delete",
        },
        min_query_length: 0,
      },
    },
  ],
};

module.exports = {
  messageTpl,
  cronConfig,
  cronRow,
  divider,
  editCron,
  deleteCron,
  cronDeletion,
  genericHeader,
  genericNote,
};