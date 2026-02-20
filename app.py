import os
from flask import Flask, request, abort
import requests
import hashlib
import hmac
import base64
import json

app = Flask(__name__)

# Correct use of environment variables
CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET")
CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")


@app.route("/")
def home():
    return "Bot is running 🚀"


@app.route("/webhook", methods=["POST"])
def webhook():
    try:
        body = request.get_data(as_text=True)
        signature = request.headers.get("X-Line-Signature")

        # Check environment variables
        if not CHANNEL_SECRET or not CHANNEL_ACCESS_TOKEN:
            return "Missing environment variables", 500

        # Validate signature
        hash_value = hmac.new(
            CHANNEL_SECRET.encode("utf-8"),
            body.encode("utf-8"),
            hashlib.sha256
        ).digest()

        expected_signature = base64.b64encode(hash_value).decode("utf-8")

        if signature != expected_signature:
            return "Bad signature", 400

        # After verifying, just return OK
        # You can add actual event logic here later
        return "OK", 200

    except Exception as e:
        print("ERROR:", e)
        return "ERROR", 500
