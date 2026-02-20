import os
from flask import Flask, request, abort
import requests
import hashlib
import hmac
import base64
import json

app = Flask(__name__)

# ✅ اقرأ من Environment Variables
CHANNEL_SECRET = os.getenv("2610ad3b734526f5d9dfac540c4aba44")
CHANNEL_ACCESS_TOKEN = os.getenv("RpTjCFT+6LnqwwDanjRFJjf+8+UUDRWGcxTVRWZSMdGIp6P3e1RIkL4iIQsF6rb1AIA42aaeZu60Q9MAgYGrgOJ1hN7aoMGsYN68jwKXFmpDIlwMHsoHPEhBRNx9PMUQ6toQAC+lBjO0godl1SwrYQdB04t89/1O/w1cDnyilFU=")


@app.route("/")
def home():
    return "Bot is running 🚀"


@app.route("/webhook", methods=["POST"])
def webhook():
    try:
        body = request.get_data(as_text=True)
        signature = request.headers.get("X-Line-Signature")

        if not CHANNEL_SECRET or not CHANNEL_ACCESS_TOKEN:
            return "Missing environment variables", 500

        # Verify signature
        hash = hmac.new(
            CHANNEL_SECRET.encode("utf-8"),
            body.encode("utf-8"),
            hashlib.sha256
        ).digest()

        expected_signature = base64.b64encode(hash).decode("utf-8")

        if signature != expected_signature:
            return "Bad signature", 400

        events = json.loads(body).get("events", [])

        for event in events:
            if event["type"] == "message":
                if event["message"]["type"] == "text":
                    reply_token = event["replyToken"]
                    user_message = event["message"]["text"]
                    reply_message(reply_token, f"You said: {user_message}")

        return "OK", 200

    except Exception as e:
        print("ERROR:", e)
        return "ERROR", 500


def reply_message(reply_token, text):
    url = "https://api.line.me/v2/bot/message/reply"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {CHANNEL_ACCESS_TOKEN}"
    }

    data = {
        "replyToken": reply_token,
        "messages": [
            {
                "type": "text",
                "text": text
            }
        ]
    }

    # ضع timeout حتى لا يحدث webhook timeout
    requests.post(url, headers=headers, json=data, timeout=5)
