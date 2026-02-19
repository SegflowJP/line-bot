import os

class Config:
    # Line Messaging API Settings
    # These should be obtained from the Line Developers Console
    LINE_CHANNEL_ACCESS_TOKEN = os.environ.get('RpTjCFT+6LnqwwDanjRFJjf+8+UUDRWGcxTVRWZSMdGIp6P3e1RIkL4iIQsF6rb1AIA42aaeZu60Q9MAgYGrgOJ1hN7aoMGsYN68jwKXFmpDIlwMHsoHPEhBRNx9PMUQ6toQAC+lBjO0godl1SwrYQdB04t89/1O/w1cDnyilFU=', 'RpTjCFT+6LnqwwDanjRFJjf+8+UUDRWGcxTVRWZSMdGIp6P3e1RIkL4iIQsF6rb1AIA42aaeZu60Q9MAgYGrgOJ1hN7aoMGsYN68jwKXFmpDIlwMHsoHPEhBRNx9PMUQ6toQAC+lBjO0godl1SwrYQdB04t89/1O/w1cDnyilFU=')
    LINE_CHANNEL_SECRET = os.environ.get('2610ad3b734526f5d9dfac540c4aba44', '2610ad3b734526f5d9dfac540c4aba44')
    
    # Manager's Line User ID to receive reports
    MANAGER_USER_ID = os.environ.get('U1c537b1aaabb943df75b40cd148eab2e', 'U1c537b1aaabb943df75b40cd148eab2e')
    
    # Wake-up Check Settings
    CHECK_IN_START_TIME = "06:00" # 6:00 AM
    LATE_REPORT_TIME = "06:30"   # 6:30 AM
    
    # Database Settings
    SQLALCHEMY_DATABASE_URI = 'sqlite:///wakeup_bot.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
