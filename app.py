import os
import datetime
from flask import Flask, request, abort
from linebot.v3 import WebhookHandler
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.messaging import (
    Configuration,
    ApiClient,
    MessagingApi,
    ReplyMessageRequest,
    PushMessageRequest,
    TextMessage,
    FlexMessage,
    FlexContainer
)
from linebot.v3.webhooks import (
    MessageEvent,
    TextMessageContent,
    FollowEvent,
    PostbackEvent
)
from apscheduler.schedulers.background import BackgroundScheduler
from models import db, Worker, DailyProgress
from config import Config
import json

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

# Line API setup
configuration = Configuration(access_token=app.config['LINE_CHANNEL_ACCESS_TOKEN'])
handler = WebhookHandler(app.config['LINE_CHANNEL_SECRET'])

# Database Initialization
with app.app_context():
    db.create_all()

# --- Flex Message Templates ---

def get_3step_flex_message(step="wake_up", name="Worker"):
    """Returns the Flex Message for each step."""
    
    titles = {
        "wake_up": "Step 1: Wake Up! ☀️",
        "on_the_way": "Step 2: On The Way? 🚜",
        "arrived": "Step 3: Arrived! 🪵"
    }
    
    texts = {
        "wake_up": f"Good morning, {name}! Please confirm you are awake.",
        "on_the_way": "Are you heading to the site now?",
        "arrived": "Have you arrived at the workplace?"
    }
    
    buttons = {
        "wake_up": {"label": "I'm Awake! ☀️", "data": "action=wake_up"},
        "on_the_way": {"label": "I'm On My Way! 🚜", "data": "action=on_the_way"},
        "arrived": {"label": "I Have Arrived! 🪵", "data": "action=arrived"}
    }
    
    colors = {
        "wake_up": "#FFD700", # Gold
        "on_the_way": "#1E90FF", # Blue
        "arrived": "#32CD32" # Green
    }

    flex_json = {
        "type": "bubble",
        "header": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {"type": "text", "text": titles[step], "weight": "bold", "size": "xl", "color": "#ffffff"}
            ],
            "backgroundColor": colors[step]
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {"type": "text", "text": texts[step], "wrap": True, "align": "center"}
            ]
        },
        "footer": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "button",
                    "action": {
                        "type": "postback",
                        "label": buttons[step]["label"],
                        "data": buttons[step]["data"],
                        "displayText": buttons[step]["label"]
                    },
                    "style": "primary",
                    "color": colors[step]
                }
            ]
        }
    }
    return FlexMessage(altText=f"Step: {step}", contents=FlexContainer.from_json(json.dumps(flex_json)))

# --- Scheduler Tasks ---

def send_daily_wake_up():
    """Triggered at 6:00 AM to send Step 1."""
    with app.app_context():
        workers = Worker.query.filter_by(is_active=True).all()
        with ApiClient(configuration) as api_client:
            line_bot_api = MessagingApi(api_client)
            for worker in workers:
                try:
                    line_bot_api.push_message(
                        PushMessageRequest(
                            to=worker.line_user_id,
                            messages=[get_3step_flex_message("wake_up", worker.name or "Worker")]
                        )
                    )
                except Exception as e:
                    print(f"Error sending wake-up to {worker.name}: {e}")

def report_late_workers():
    """Triggered at 7:00 AM (example) to report status to manager."""
    today = datetime.date.today()
    with app.app_context():
        active_workers = Worker.query.filter_by(is_active=True).all()
        report_text = f"📊 Status Report ({today}):\n\n"
        
        for w in active_workers:
            prog = DailyProgress.query.filter_by(worker_id=w.id, date=today).first()
            status = "❌ No response"
            if prog:
                if prog.arrived_time: status = f"✅ Arrived ({prog.arrived_time.strftime('%H:%M')})"
                elif prog.on_the_way_time: status = f"🚜 On the way ({prog.on_the_way_time.strftime('%H:%M')})"
                elif prog.wake_up_time: status = f"☀️ Awake ({prog.wake_up_time.strftime('%H:%M')})"
            
            report_text += f"• {w.name or 'Unknown'}: {status}\n"

        with ApiClient(configuration) as api_client:
            line_bot_api = MessagingApi(api_client)
            try:
                line_bot_api.push_message(
                    PushMessageRequest(
                        to=app.config['MANAGER_USER_ID'],
                        messages=[TextMessage(text=report_text)]
                    )
                )
            except Exception as e:
                print(f"Error sending report to manager: {e}")

# Setup Scheduler
scheduler = BackgroundScheduler()
# Schedule Step 1 at 6:00 AM
scheduler.add_job(send_daily_wake_up, 'cron', hour=6, minute=0)
# Schedule Manager Report at 7:00 AM
scheduler.add_job(report_late_workers, 'cron', hour=7, minute=0)
scheduler.start()

# --- Webhook Handler ---

@app.route("/webhook", methods=["POST"])
def webhook():
    signature = request.headers.get("X-Line-Signature")

    body = request.get_data(as_text=True)

    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        abort(400)

    return "OK"


@handler.add(FollowEvent)
def handle_follow(event):
    user_id = event.source.user_id
    with app.app_context():
        worker = Worker.query.filter_by(line_user_id=user_id).first()
        if not worker:
            worker = Worker(line_user_id=user_id)
            db.session.add(worker)
            db.session.commit()
    
    with ApiClient(configuration) as api_client:
        line_bot_api = MessagingApi(api_client)
        line_bot_api.reply_message(
            ReplyMessageRequest(
                reply_token=event.reply_token,
                messages=[TextMessage(text="Welcome! Please reply with your full name to register for the wake-up system.")]
            )
        )

@handler.add(MessageEvent, message=TextMessageContent)
def handle_message(event):
    user_id = event.source.user_id
    text = event.message.text
    with app.app_context():
        worker = Worker.query.filter_by(line_user_id=user_id).first()
        if worker and not worker.name:
            worker.name = text
            db.session.commit()
            reply = f"Registered as {text}. You will receive alerts every morning."
        else:
            reply = "Received. Contact manager for assistance."
        
        with ApiClient(configuration) as api_client:
            line_bot_api = MessagingApi(api_client)
            line_bot_api.reply_message(
                ReplyMessageRequest(reply_token=event.reply_token, messages=[TextMessage(text=reply)])
            )

@handler.add(PostbackEvent)
def handle_postback(event):
    user_id = event.source.user_id
    data = event.postback.data
    today = datetime.date.today()
    now = datetime.datetime.now().time()
    
    with app.app_context():
        worker = Worker.query.filter_by(line_user_id=user_id).first()
        if not worker: return
        
        prog = DailyProgress.query.filter_by(worker_id=worker.id, date=today).first()
        if not prog:
            prog = DailyProgress(worker_id=worker.id, date=today)
            db.session.add(prog)
        
        next_step = None
        if data == "action=wake_up":
            prog.wake_up_time = now
            next_step = "on_the_way"
        elif data == "action=on_the_way":
            prog.on_the_way_time = now
            next_step = "arrived"
        elif data == "action=arrived":
            prog.arrived_time = now
            reply_text = f"Great! Have a safe work day, {worker.name}."
        
        db.session.commit()
        
        with ApiClient(configuration) as api_client:
            line_bot_api = MessagingApi(api_client)
            if next_step:
                # Send the NEXT step message immediately
                line_bot_api.reply_message(
                    ReplyMessageRequest(
                        reply_token=event.reply_token,
                        messages=[get_3step_flex_message(next_step, worker.name)]
                    )
                )
            else:
                line_bot_api.reply_message(
                    ReplyMessageRequest(
                        reply_token=event.reply_token,
                        messages=[TextMessage(text=reply_text)]
                    )
                )

if __name__ == "__main__":
    app.run(port=5000)
