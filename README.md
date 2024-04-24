# slack-googleCalendar
## 📌 개요

구글 캘린더에 있는 일정을 채널의 슬랙으로 보내주는 알림봇을 만들어달라고 하셔서 가벼운 마음에 만들겠다고 말씀드렸다. 하지만 팀 캘린더를 위한 google캘린더가 잠정중단이 되었다. 대안이라는 구글 캘린더는 채널에 메시지를 보내줄 수 없다. PM님은 채널에 메시지를 보내주길 원하셔서 어쩔 수 없이 google calendar api와 slack api를 사용해서, 거기에 쉘 스크립트까지 이용해서 기능을 구현하게 되었다.

![image](https://user-images.githubusercontent.com/70741257/226845717-46a0b3d1-22f7-4b5b-912d-3a459e722413.png)

## 💻작업한 내용

[Node.js 빠른 시작      |  Google Calendar  |  Google Developers](https://developers.google.com/calendar/api/quickstart/nodejs?hl=ko)

파이썬을 이용한 이유는 일정을 가져오려면 캘린더 id가 있어야 하는데 예시 코드가 자바, 파이썬, php, 루비밖에 없었다.

[CalendarList: list  |  Google Calendar  |  Google Developers](https://developers.google.com/calendar/api/v3/reference/calendarList/list?hl=ko)

그래서 파이썬을 통해 캘린더 id를 가져와서 이를 이용해 조회했다. 

```python
from __future__ import print_function

import datetime
import os.path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

def main():
"""Shows basic usage of the Google Calendar API.
    Prints the start and name of the next 10 events on the user's calendar.
    """
creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    try:
        service = build('calendar', 'v3', credentials=creds)
        page_token = None
        while True:
            calendar_list = service.calendarList().list(pageToken=page_token).execute()
            print(calendar_list['items'])
            for calendar_list_entry in calendar_list['items']:
                print
                (calendar_list_entry['summary'])
            page_token = calendar_list.get('nextPageToken')
            if not page_token:
                break

        print('break');
        # Call the Calendar API
        now = datetime.datetime.utcnow().isoformat() + 'Z'  # 'Z' indicates UTC time
        print('Getting the upcoming 10 events')
        events_result = service.events().list(calendarId='c_667463a7cb3fd2c9082daac4f59c25ee93413a1ad79275613d1454c088e81056@group.calendar.google.com', timeMin=now,
                                              maxResults=10, singleEvents=True,
                                              orderBy='startTime').execute()
        events = events_result.get('items', [])

        if not events:
            print('No upcoming events found.')
            return

        # Prints the start and name of the next 10 events
        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            print(start, event['summary'],event['htmlLink'])

        # Prints the start and name of the next 10 events
        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            print(start, event['htmlLink'])

    except HttpError as error:
        print('An error occurred: %s' % error)

if __name__ == '__main__':
    main()
```

```jsx
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
```

쉘스크립트를 이용해서 코드를 자동실행하려고 했는데 터미널을 끄면 그게 안되고 노드 스케쥴러 같은 애들도 있다고는 하지만 그러려면 서버에 올려야 작동할 것 같다.

## 📚배운 점

다음번에는 메시지 템플릿을 이용해서 하는 것도 해봐야겠다.

[Building with Block Kit](https://api.slack.com/block-kit/building)

[슬랙 메시지를 커스텀하는 방법과 메시지 템플릿들](https://teki.tistory.com/60)
