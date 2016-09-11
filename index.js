"use strict";

const Botkit = require("botkit");
const webshot = require("webshot");
const tempfile = require("tempfile");
const fs = require("fs");
const request = require("request");

const requiredEnvVars = [
  "REDASH_HOST",
  "REDASH_API_KEY",
  "SLACK_BOT_TOKEN"
];
const startupCheckPassed = requiredEnvVars.every((key) => { return process.env[key]; });
if (!startupCheckPassed) {
  console.error(`Error: Specify ${requiredEnvVars.join(", ")} in environment values`);
  process.exit(1);
}

const redashHost = process.env.REDASH_HOST;
const redashApiKey = process.env.REDASH_API_KEY;
const slackBotToken = process.env.SLACK_BOT_TOKEN;

const controller = Botkit.slackbot({
  debug: !!process.env.DEBUG
});

const bot = controller.spawn({
  token: slackBotToken
}).startRTM();

controller.hears(`${redashHost}/queries/([0-9]+)#([0-9]+)`, ["direct_message", "direct_mention", "mention"], (bot, message) => {
  const queryId = message.match[1];
  const visualizationId =  message.match[2];
  const queryUrl = `${redashHost}/queries/${queryId}#${visualizationId}`;
  const embedUrl = `${redashHost}/embed/query/${queryId}/visualization/${visualizationId}?api_key=${redashApiKey}`;

  bot.reply(message, `Taking screenshot of ${queryUrl}`);
  bot.botkit.log(queryUrl);
  bot.botkit.log(embedUrl);

  const outputFile = tempfile(".png");
  const webshotOptions = {
    screenSize: {
      width: 720,
      height: 360
    },
    shotSize: {
      width: 720,
      height: "all"
    }
  };

  webshot(embedUrl, outputFile, webshotOptions, (err) => {
    if (err) {
      const msg = `Something wrong happend in take a screen capture : ${err}`;
      bot.reply(message, msg);
      return bot.botkit.log.error(msg);
    }

    bot.botkit.log(outputFile);
    bot.botkit.log(Object.keys(message));
    bot.botkit.log(message.user + ":" + message.type + ":" + message.channel + ":" + message.text);

    const options = {
      token: slackBotToken,
      filename: `query-${queryId}-visualization-${visualizationId}.png`,
      file: fs.createReadStream(outputFile),
      channels: message.channel
    };

    // bot.api.file.upload cannot upload binary file correctly, so directly call Slack API.
    request.post({ url: "https://api.slack.com/api/files.upload", formData: options }, (err, resp, body) => {
      if (err) {
        const msg = `Something wrong happend in file upload : ${err}`;
        bot.reply(message, msg);
        bot.botkit.log.error(msg);
      } else if (resp.statusCode == 200) {
        bot.botkit.log("ok");
      } else {
        const msg = `Something wrong happend in file upload : status code=${resp.statusCode}`;
        bot.reply(message, msg);
        bot.botkit.log.error(msg);
      }
    });
  });
});
