const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const moment = require("moment");
const _ = require("lodash");
const axios = require("axios");
class Slack {
  // 색상으로 메시지를 꾸밀수 있습니다.
  static get Colors() {
    return {
      primary: "#007bff",
      info: "#17a2b8",
      success: "#28a745",
      warning: "#ffc107",
      danger: "#dc3545",
    };
  }

  // 메시지를 전송할 webhook 주소
  static get Channels() {
    return {
      general:
        "https://hooks.slack.com/services/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",
    };
  }
  static async sendMessage(message) {
    if (!message) {
      console.error("메시지 포멧이 없습니다.");
      return;
    }

    const data = {
      mrkdwn: true,
      text: "",
      attachments: [],
    };

    if (_.isString(message)) {
      data.text = message;
    } else {
      if (!message.title && !message.text) {
        console.error("메시지 내용이 없습니다.");
        return;
      }

      //message.ts = Math.floor(Date.now() / 1000);
      message.footer = `From 블록웨이브랩스 캘린더`;
      data.attachments.push(message);
    }

    await axios({
      url: this.Channels.general,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data,
    });
  }
}

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listEvents(auth) {
  const calendar = google.calendar({ version: "v3", auth });
  const res = await calendar.events.list({
    calendarId:
      "c_667463a7cb3fd2c9082daac4f59c25ee93413a1ad79275613d1454c088e81056@group.calendar.google.com",
    timeMin: new Date().toISOString(),
    timeMax: new Date(new Date().setHours(24, 0, 0, 0)),
    maxResults: 10,
    singleEvents: true,
    orderBy: "startTime",
  });
  const events = res.data.items;
  if (!events || events.length === 0) {
    console.log("일정이 없습니다.");
    return;
  }
  events.map(async (event, i) => {
    const start = event.start.dateTime || event.start.date;
    const date = new Date(start);
    const data = {
      time: `${moment(date).calendar()}`,
      summary: event.summary,
      //link: event.htmlLink,
    };
    const titleWithLink = `<${event.htmlLink}|${event.summary}>`;
    console.log(`${titleWithLink} - ${event.summary} - ${event.htmlLink}`);
    await Slack.sendMessage({
      color: Slack.Colors.success,
      title: titleWithLink,
      text: data.time,
    });
  });
}

authorize().then(listEvents).catch(console.error);
