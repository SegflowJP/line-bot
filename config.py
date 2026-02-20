import os

class Config:
    # Line Messaging API Settings
    # These should be obtained from the Line Developers Console
    LINE_CHANNEL_ACCESS_TOKEN = os.environ.get('LINE_CHANNEL_ACCESS_TOKEN', 'YOUR_CHANNEL_ACCESS_TOKEN')
    LINE_CHANNEL_SECRET = os.environ.get('LINE_CHANNEL_SECRET', 'YOUR_CHANNEL_SECRET')
    
    # Manager's Line User ID to receive reports
    MANAGER_USER_ID = os.environ.get('MANAGER_USER_ID', 'YOUR_MANAGER_USER_ID')
    
    # Wake-up Check Settings
    CHECK_IN_START_TIME = "06:00" # 6:00 AM
    LATE_REPORT_TIME = "06:30"   # 6:30 AM
    
    # Database Settings
    SQLALCHEMY_DATABASE_URI = 'sqlite:///wakeup_bot.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
