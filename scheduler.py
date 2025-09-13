from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from caldav import DAVClient
from flask import Flask, request
from icalendar import Calendar
from linebot.v3.messaging import FlexMessage
from linebot.v3.messaging import (
    MessagingApi,
    ReplyMessageRequest,
    PushMessageRequest,
    TextMessage,
    QuickReply,
    QuickReplyItem,
)
from linebot.v3.messaging.api_client import ApiClient
from linebot.v3.messaging.configuration import Configuration
from linebot.v3.messaging.models import MessageAction
from linebot.v3.webhook import WebhookHandler

app = Flask(__name__)
import pygsheets
import re
from teacher_manager import TeacherManager

today = datetime.now().date()
gc = pygsheets.authorize(service_account_file="key.json")
import pytz
import requests
import json


pattern_TS = (
    r"^(.*?):(.*?):(.*?):(\d{4}/\d{2}/\d{2}):([\d:]+-[\d:]+):(.*?):(\d+):([A-Z]+)$"
)
teacher_signin = "https://script.google.com/macros/s/AKfycbxfj5fwNIc8ncbqkOm763yo6o06wYPHm2nbfd_1yLkHlakoS9FtYfYJhvGCaiAYh_vjIQ/exec"
TS_headers = {"Content-Type": "application/json"}
"""
TS_payload = json.dumps({
  "action": "appendTeacherCourse",
  "teacherName": "test",
  "sheetName": "報表",
  "課程名稱": "AI 影像辨識",
  "上課時間": "15:00-16:30",
  "日期": "2025/07/23",
  "人數助教": "10",
  "課程內容": "YOLO 模型實作與 ChatGPT 應用"
})


TS_response = requests.request("POST", teacher_signin, headers=headers, data=TS_payload)
"""

tz = pytz.timezone("Asia/Taipei")
survey_url = "https://docs.google.com/spreadsheets/d/1o8Q9avYfh3rSVvkJruPJy7drh5dQqhA_-icT33jBX8s/"
quick_reply = None
sh = gc.open_by_url(survey_url)

ws = sh.worksheet_by_title("teacher_lineid")

# 初始化老師管理器
teacher_manager = TeacherManager(gc, survey_url)
# Synology CalDAV 設定  https://funlearnbar.synology.me:9102/caldav/
url = "https://funlearnbar.synology.me:9102/caldav/"
username = "testacount"
password = "testacount"

# LINE API 設定

access_token = "LaeRrV+/XZ6oCJ2ZFzAFlZXHX822l50NxxM2x6vBkuoux4ptr6KjFJcIXL6pNJel2dKbZ7nxachvxvKrKaMNchMqGTywUl4KMGXhxd/bdiDM7M6Ad8OiXF+VzfhlSMXfu1MbDfxdwe0z/NLYHzadyQdB04t89/1O/w1cDnyilFU="

# 管理員設定
ADMIN_USER_ID = "Udb51363eb6fdc605a6a9816379a38103"  # Tim 的 user_id
secret = "e5fabb4dd0acaa50524ae225ce54efe9"

configuration = Configuration(access_token=access_token)
api_client = ApiClient(configuration)
messaging_api = MessagingApi(api_client)
handler = WebhookHandler(secret)

# ✅ 已註冊的用戶 (簡易版: 用列表暫存)
registered_users = []


# ✅ 抓取日曆事件
"""
def get_calendar_events(ta_name):
    now = datetime.now(tz)
    client = DAVClient(url, username=username, password=password)
    principal = client.principal()
    calendars = principal.calendars()
    try:
        for calendar in calendars:
            if ta_name == calendar.name:
"""


# ✅ 主動推播訊息
def push_message_to_user(user_id, message_text):
    try:
        messaging_api.push_message(
            PushMessageRequest(to=user_id, messages=[TextMessage(text=message_text)])
        )
        print(f"已推播給 {user_id}: {message_text}")
    except Exception as e:
        print(f"推播失敗: {str(e)}")


# ✅ Webhook 處理
@app.route("/", methods=["POST"])
def linebot():
    body = request.get_data(as_text=True)

    try:
        json_data = json.loads(body)
        signature = request.headers["X-Line-Signature"]
        handler.handle(body, signature)

        tk = json_data["events"][0]["replyToken"]
        msg_type = json_data["events"][0]["message"]["type"]
        user_id = json_data["events"][0]["source"]["userId"]
        if msg_type == "有上課" or msg_type == "沒上課":
            teacher_name = get_name_by_user_id(user_id)

        if msg_type == "text":
            msg = json_data["events"][0]["message"]["text"]

            # 管理員測試功能
            if user_id == ADMIN_USER_ID:
                if msg == "測試系統":
                    reply_text = "🔍 正在測試系統狀態...\n\n"
                    
                    # 測試 CalDAV 連線
                    try:
                        client = DAVClient(url, username=username, password=password)
                        principal = client.principal()
                        calendars = principal.calendars()
                        reply_text += f"✅ CalDAV 連線正常 ({len(calendars)} 個行事曆)\n"
                    except Exception as e:
                        reply_text += f"❌ CalDAV 連線失敗: {str(e)[:50]}...\n"
                    
                    # 測試老師資料
                    try:
                        teacher_data = teacher_manager.get_teacher_data(force_refresh=True)
                        reply_text += f"✅ 老師資料正常 ({len(teacher_data)} 位老師)\n"
                    except Exception as e:
                        reply_text += f"❌ 老師資料失敗: {str(e)[:50]}...\n"
                    
                    # 測試 LINE API
                    try:
                        reply_text += "✅ LINE API 正常\n"
                    except Exception as e:
                        reply_text += f"❌ LINE API 失敗: {str(e)[:50]}...\n"
                    
                    reply_text += "\n🚀 系統狀態檢查完成！"
                    
                    # 發送回覆
                    messaging_api.reply_message(
                        ReplyMessageRequest(
                            reply_token=tk, 
                            messages=[TextMessage(text=reply_text)]
                        )
                    )
                    return "OK"
                    
                elif msg == "測試通知":
                    reply_text = "📱 正在發送測試通知..."
                    try:
                        send_notification(ADMIN_USER_ID, "🧪 這是一則測試通知！\n\n系統運作正常 ✅")
                        reply_text += "\n✅ 測試通知已發送！"
                    except Exception as e:
                        reply_text += f"\n❌ 測試通知失敗: {str(e)}"
                    
                    # 發送回覆
                    messaging_api.reply_message(
                        ReplyMessageRequest(
                            reply_token=tk, 
                            messages=[TextMessage(text=reply_text)]
                        )
                    )
                    return "OK"
                
                elif msg == "檢查行事曆":
                    reply_text = "📅 正在檢查行事曆事件...\n\n"
                    try:
                        # 檢查今天的事件
                        today = datetime.now().date()
                        events_today = read_calendar_events()
                        
                        if events_today:
                            reply_text += f"📊 今天有 {len(events_today)} 個事件：\n"
                            for event in events_today[:5]:  # 只顯示前5個
                                reply_text += f"• {event['title']} ({event['start_time']})\n"
                        else:
                            reply_text += "📭 今天沒有事件"
                    except Exception as e:
                        reply_text += f"❌ 檢查失敗: {str(e)}"
                    
                    # 發送回覆
                    messaging_api.reply_message(
                        ReplyMessageRequest(
                            reply_token=tk, 
                            messages=[TextMessage(text=reply_text)]
                        )
                    )
                    return "OK"
                
                elif msg == "重新載入老師":
                    reply_text = "🔄 正在重新載入老師資料...\n"
                    try:
                        teacher_data = teacher_manager.get_teacher_data(force_refresh=True)
                        reply_text += f"✅ 已重新載入 {len(teacher_data)} 位老師的資料"
                    except Exception as e:
                        reply_text += f"❌ 重新載入失敗: {str(e)}"
                    
                    # 發送回覆
                    messaging_api.reply_message(
                        ReplyMessageRequest(
                            reply_token=tk, 
                            messages=[TextMessage(text=reply_text)]
                        )
                    )
                    return "OK"
                
                elif msg == "管理員幫助":
                    reply_text = """🔧 管理員測試命令：

📋 系統測試：
• 測試系統 - 檢查所有組件狀態
• 測試通知 - 發送測試通知
• 檢查行事曆 - 查看今天的事件
• 重新載入老師 - 重新載入老師資料

💡 使用方式：
直接發送上述命令即可測試對應功能"""
                    
                    # 發送回覆
                    messaging_api.reply_message(
                        ReplyMessageRequest(
                            reply_token=tk, 
                            messages=[TextMessage(text=reply_text)]
                        )
                    )
                    return "OK"
                
                else:
                    # 如果不是管理員命令，繼續正常處理
                    pass

            # 讀取 Google Sheet 最新資料
            df_sheet = ws.get_as_df(start="A1", empty_value="")
            user_rows = df_sheet[df_sheet["ID"] == user_id]
            # 啟動註冊流程
            if msg == "剩餘課堂查詢":
                clsss_num_url = "https://script.google.com/macros/s/AKfycbxfj5fwNIc8ncbqkOm763yo6o06wYPHm2nbfd_1yLkHlakoS9FtYfYJhvGCaiAYh_vjIQ/dev"
                #
                clsss_num_payload = json.dumps(
                    {"action": "checkStudentName", "name": "Raily"}
                )
                clsss_num_headers = {"Content-Type": "application/json"}

                clsss_num_response = requests.request(
                    "POST",
                    clsss_num_url,
                    headers=clsss_num_headers,
                    data=clsss_num_payload,
                )

                content_str = clsss_num_response.content.decode("utf-8")

                # 再解析 JSON
                data = json.loads(content_str)

                # 取出 remaining
                remaining = data["data"]["remaining"]
                text = "家長您好，目前小孩剩餘" + str(remaining) + "堂課"
                messaging_api.reply_message(
                    ReplyMessageRequest(
                        reply_token=tk,
                        messages=[TextMessage(text=text)],
                    )
                )

            if msg == "註冊":
                if not user_rows.empty:
                    reply_text = "你已經註冊過囉！"
                else:
                    last_row = len(df_sheet) + 2
                    ws.update_value(f"A{last_row}", user_id)
                    ws.update_value(f"B{last_row}", "")
                    ws.update_value(f"C{last_row}", "registering")  # 狀態欄設定為註冊中

                    reply_text = "請輸入你的名稱："
                messaging_api.reply_message(
                    ReplyMessageRequest(
                        reply_token=tk, messages=[TextMessage(text=reply_text)]
                    )
                )

            # 修改名稱流程
            elif msg == "修改名稱":
                if not user_rows.empty:
                    row_index = user_rows.index[0] + 2
                    ws.update_value(f"C{row_index}", "modifying")  # 狀態欄設定為修改中
                    reply_text = "請輸入你要修改的新名稱："
                else:
                    reply_text = "你尚未註冊，請先輸入「註冊」開始註冊流程。"
                messaging_api.reply_message(
                    ReplyMessageRequest(
                        reply_token=tk, messages=[TextMessage(text=reply_text)]
                    )
                )

            # 如果正在註冊或修改名稱
            elif not user_rows.empty and (
                df_sheet.loc[user_rows.index[0], "狀態"] == "registering"
                or df_sheet.loc[user_rows.index[0], "狀態"] == "modifying"
            ):
                row_index = user_rows.index[0] + 2
                user_name = df_sheet.loc[user_rows.index[0], "用戶名稱"]
                user_status = df_sheet.loc[user_rows.index[0], "狀態"]

                if user_status == "registering":
                    ws.update_value(f"B{row_index}", msg)
                    ws.update_value(f"C{row_index}", "")  # 清除狀態
                    reply_text = f"✅ {msg}，你已成功註冊！"

                elif user_status == "modifying":
                    ws.update_value(f"B{row_index}", msg)
                    ws.update_value(f"C{row_index}", "")  # 清除狀態
                    reply_text = f"✅ 你的名稱已修改為：{msg}"

            # 其他功能
            elif msg == "查詢名單":
                if not df_sheet.empty:
                    name_list = [
                        f"{name} ({uid})"
                        for uid, name in zip(df_sheet["ID"], df_sheet["用戶名稱"])
                    ]
                    reply_text = "目前註冊用戶：\n" + "\n".join(name_list)
                else:
                    reply_text = "目前沒有註冊用戶。"
                messaging_api.reply_message(
                    ReplyMessageRequest(
                        reply_token=tk, messages=[TextMessage(text=reply_text)]
                    )
                )

            elif re.match(pattern_TS, msg):
                match_TS = re.match(pattern_TS, msg)
                calendar_name = match_TS.group(1)
                summary = match_TS.group(2)
                lesson_name = match_TS.group(3)
                formatted_date = match_TS.group(4)
                time_range = match_TS.group(5)
                TA = match_TS.group(6)
                student_number = match_TS.group(7)
                flag = match_TS.group(8)
                TS_payload = json.dumps(
                    {
                        "action": "appendTeacherCourse",
                        "teacherName": calendar_name,
                        "sheetName": "報表",
                        "課程名稱": summary,
                        "上課時間": time_range,
                        "日期": formatted_date,
                        "人數助教": student_number,
                        "課程內容": lesson_name,
                    }
                )
                if flag == "YES":
                    TS_response = requests.request(
                        "POST", teacher_signin, headers=TS_headers, data=TS_payload
                    )
                    if TA != "nan":
                        TS_response = requests.request(
                            "POST", teacher_signin, headers=TS_headers, data=TS_payload
                        )

            elif msg == "FLB":
                quick_reply = QuickReply(
                    items=[
                        QuickReplyItem(action=MessageAction(label="註冊", text="註冊")),
                        QuickReplyItem(
                            action=MessageAction(label="查詢名單", text="查詢名單")
                        ),
                        QuickReplyItem(
                            action=MessageAction(label="修改名稱", text="修改名稱")
                        ),
                    ]
                )
                reply_text = "請點擊下方按鈕選擇功能"
                messaging_api.reply_message(
                    ReplyMessageRequest(
                        reply_token=tk,
                        messages=[
                            TextMessage(text=reply_text, quick_reply=quick_reply)
                        ],
                    )
                )

                return "OK"

    except Exception as e:
        print("error: " + str(e))
        print("body: " + body)

    return "OK"


def read_calendar_events():
    """
    讀取行事曆事件並發送自動通知
    使用新的老師管理系統進行模糊比對
    """
    now = datetime.now(tz)
    client = DAVClient(url, username=username, password=password)
    principal = client.principal()
    calendars = principal.calendars()
    
    try:
        for calendar in calendars:
            events = calendar.events()
            print(f"📅 檢查行事曆: {calendar.name}")

            for event in events:
                cal = Calendar.from_ical(event.data)
                for component in cal.walk():
                    if component.name == "VEVENT":
                        summary = component.get("summary")
                        start = component.get("dtstart").dt
                        describe = component.get("description")
                        location = component.get("location")
                        
                        # 使用新的老師管理器解析描述
                        parsed_info = teacher_manager.parse_calendar_description(describe)
                        
                        if not parsed_info["teachers"] and not parsed_info["assistants"]:
                            print("⚠️ 無法從描述中解析老師資訊")
                            continue
                            
                        # 解析時間資訊
                        pattern = (
                            r"時間:\s*(\d{8})\s+"
                            r"([0-2]?\d:[0-5]\d-[0-2]?\d:[0-5]\d)\s+"
                            r"班級:(.+?)\s+"
                            r"講師:\s*([^()]+?)\s*\((https?://[^)]+)\)\s+"
                            r"助教:\s*([^()]+?)(?:\s*\((https?://[^)]+)\))?\s+"
                            r"教案:\s*(.*)$"
                        )

                        m = re.search(pattern, describe)
                        if m:
                            date_raw = m.group(1).strip()
                            time_range = m.group(2).strip()
                            lesson_name = m.group(3).strip()
                            teacher = m.group(4).strip()
                            teacher_url = m.group(5).strip()
                            assistant = m.group(6).strip()
                            ta_url = m.group(7).strip() if m.group(7) else None
                            lesson_url = m.group(8).strip()

                            # 日期轉格式
                            formatted_date = datetime.strptime(date_raw, "%Y%m%d").strftime(
                                "%Y/%m/%d"
                            )
                        else:
                            print("⚠️ 無法解析時間格式")
                            continue

                        # 檢查時間是否在 30 分鐘內
                        if isinstance(start, datetime):
                            time_diff = (start - now).total_seconds() / 60
                        else:
                            # 如果 start 是 date，補上時間
                            start = datetime.combine(
                                start, datetime.min.time()
                            ).replace(tzinfo=tz)
                            time_diff = (start - now).total_seconds() / 60
                            
                        if 1 <= time_diff <= 30:
                            print(f"🔔 發現即將開始的課程: {summary} ({time_diff:.1f} 分鐘後)")
                            
                            # 獲取需要通知的對象
                            notification_recipients = teacher_manager.get_notification_recipients(
                                calendar.name, describe
                            )
                            
                            if not notification_recipients:
                                print("⚠️ 找不到通知對象，跳過此事件")
                                continue
                            
                            # 建立通知訊息
                            message = (
                                "🔔 半小時後即將開始的課程！！！\n"
                                + f"📅 課程時間：{time_range}\n"
                                + f"📚 課程名稱：{lesson_name}\n"
                                + f"👨‍🏫 講師：{teacher}\n"
                                + f"👨‍💼 助教：{assistant if assistant != 'nan' else '無'}\n"
                                + f"🔗 課程連結：{lesson_url}\n"
                                + f"📝 簽到連結：https://liff.line.me/1657746214-wPgd2qQn"
                            )
                            
                            # 建立地圖訊息
                            flex_content = {
                                "type": "bubble",
                                "body": {
                                    "type": "box",
                                    "layout": "vertical",
                                    "contents": [
                                        {
                                            "type": "text",
                                            "text": "📍 上課地點",
                                            "weight": "bold",
                                            "size": "xl",
                                        },
                                        {
                                            "type": "text",
                                            "text": location or "地點待確認",
                                            "margin": "md",
                                        },
                                        {
                                            "type": "button",
                                            "style": "primary",
                                            "action": {
                                                "type": "uri",
                                                "label": "🗺️ 打開地圖",
                                                "uri": f"https://www.google.com/maps?q={location or ''}",
                                            },
                                        },
                                    ],
                                },
                            }
                            map_msg = FlexMessage(altText="上課地點", contents=flex_content)
                            
                            # 建立快速回覆按鈕
                            quick_reply = QuickReply(
                                items=[
                                    QuickReplyItem(
                                        action=MessageAction(
                                            label="✅上課 １～2人",
                                            text=f"{calendar.name}:{summary}:{lesson_name}:{formatted_date}:{time_range}:{assistant}:1:YES",
                                        )
                                    ),
                                    QuickReplyItem(
                                        action=MessageAction(
                                            label="✅上課 3人含以上",
                                            text=f"{calendar.name}:{summary}:{lesson_name}:{formatted_date}:{time_range}:{assistant}:3:YES",
                                        )
                                    ),
                                    QuickReplyItem(
                                        action=MessageAction(
                                            label="✅上課 到府或客製化",
                                            text=f"{calendar.name}:{summary}:{lesson_name}:{formatted_date}:{time_range}:{assistant}:99:YES",
                                        )
                                    ),
                                    QuickReplyItem(
                                        action=MessageAction(
                                            label="❌沒上課",
                                            text=f"{calendar.name}:{summary}:{lesson_name}:{formatted_date}:{time_range}:{assistant}:-1:NO",
                                        )
                                    ),
                                ]
                            )
                            
                            # 發送通知給所有相關人員
                            for user_id in notification_recipients:
                                try:
                                    messaging_api.push_message(
                                        PushMessageRequest(
                                            to=user_id,
                                            messages=[
                                                TextMessage(text=message, quick_reply=quick_reply), 
                                                map_msg
                                            ],
                                        )
                                    )
                                    print(f"✅ 已發送通知給 {user_id}")
                                except Exception as e:
                                    print(f"❌ 發送通知失敗 ({user_id}): {e}")
                            
                            print(f"✅ 已推播課程提醒給 {len(notification_recipients)} 位老師")
        else:
            print("✅ 沒有即將到來的事件")

    except Exception as e:
        print(f"❌ 行事曆讀取失敗: {e}")


def morning_summary():
    """
    每日早上推播今日課程總覽
    使用新的老師管理系統進行智能通知
    """
    client = DAVClient(url, username=username, password=password)
    principal = client.principal()
    calendars = principal.calendars()
    
    try:
        today = datetime.now().date()
        events_by_teacher = {}  # 按老師分組的事件

        for calendar in calendars:
            events = calendar.events()
            print(f"📅 檢查今日行事曆: {calendar.name}")

            for event in events:
                raw = event._get_data()

                # 如果 NAS 回傳錯誤格式，跳過
                if raw.strip().startswith("<?xml"):
                    print("⚠️ 回傳的是 XML，跳過")
                    continue

                cal = Calendar.from_ical(raw)
                for component in cal.walk():
                    if component.name == "VEVENT":
                        summary = component.get("summary")
                        start = component.get("dtstart").dt
                        describe = component.get("description")
                        
                        if isinstance(start, datetime) and start.date() == today:
                            # 獲取需要通知的對象
                            notification_recipients = teacher_manager.get_notification_recipients(
                                calendar.name, describe
                            )
                            
                            # 為每個相關老師記錄事件
                            for user_id in notification_recipients:
                                if user_id not in events_by_teacher:
                                    events_by_teacher[user_id] = []
                                events_by_teacher[user_id].append(
                                    f"📅 {summary}：{start.strftime('%H:%M')}"
                                )

        # 發送個人化的今日總覽給每位老師
        for user_id, events_today in events_by_teacher.items():
            if events_today:
                message = "🌅 早安！今日課程提醒：\n" + "\n".join(events_today)
                try:
                    messaging_api.push_message(
                        PushMessageRequest(
                            to=user_id, 
                            messages=[TextMessage(text=message)]
                        )
                    )
                    print(f"✅ 已推播今日總覽給 {user_id}")
                except Exception as e:
                    print(f"❌ 推播失敗 ({user_id}): {e}")
            else:
                print(f"ℹ️ {user_id} 今日無課程")

        if not events_by_teacher:
            print("✅ 今日無任何課程事件")

    except Exception as e:
        print(f"❌ 行事曆讀取失敗: {e}")


def get_user_id_by_name(user_name):
    """
    傳入用戶名稱，回傳對應的 user_id。
    如果找不到，回傳 None。
    """
    try:
        df_sheet = ws.get_as_df(start="A1", empty_value="")
        df_sheet.columns = df_sheet.columns.str.strip()  # 去除欄位前後空格

        matched_rows = df_sheet[df_sheet["用戶名稱"] == user_name]

        if not matched_rows.empty:
            user_id = matched_rows.iloc[0]["ID"]
            return user_id
        else:
            return None

    except Exception as e:
        print(f"❌ 讀取 Google Sheet 發生錯誤: {e}")
        return None


def get_name_by_user_id(user_id):
    """
    傳入 user_id，回傳對應的用戶名稱。
    如果找不到，回傳 None。
    """
    try:
        df_sheet = ws.get_as_df(start="A1", empty_value="")
        df_sheet.columns = df_sheet.columns.str.strip()  # 去除欄位前後空格

        matched_rows = df_sheet[df_sheet["ID"] == user_id]

        if not matched_rows.empty:
            user_name = matched_rows.iloc[0]["用戶名稱"]
            return user_name
        else:
            return None

    except Exception as e:
        print(f"❌ Google Sheet 讀取錯誤: {e}")
        return None


if __name__ == "__main__":
    client = DAVClient(url, username=username, password=password)
    principal = client.principal()
    calendars = principal.calendars()
    scheduler = BackgroundScheduler()

    # 每天早上 8:00 推播今日行事曆總覽
    scheduler.add_job(morning_summary, "cron", hour=8, minute=0)

    # 每 10 分鐘檢查 30 分鐘內即將開始的事件
    scheduler.add_job(read_calendar_events, "interval", minutes=1)

    scheduler.start()

    app.run(host='0.0.0.0', port=8080, debug=True)
