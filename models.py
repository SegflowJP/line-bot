from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Worker(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    line_user_id = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class DailyProgress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    worker_id = db.Column(db.Integer, db.ForeignKey('worker.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    
    # Step 1: Wake Up
    wake_up_time = db.Column(db.Time, nullable=True)
    
    # Step 2: On The Way
    on_the_way_time = db.Column(db.Time, nullable=True)
    
    # Step 3: Arrived
    arrived_time = db.Column(db.Time, nullable=True)

    worker = db.relationship('Worker', backref=db.backref('progress_logs', lazy=True))
