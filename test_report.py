import datetime
from app import app, db, Worker, CheckIn

def run_test():
    with app.app_context():
        # Clear database for testing
        db.drop_all()
        db.create_all()

        # 1. Create workers
        w1 = Worker(line_user_id="U12345", name="Tanaka")
        w2 = Worker(line_user_id="U67890", name="Sato")
        w3 = Worker(line_user_id="Uabcde", name="Suzuki")
        db.session.add_all([w1, w2, w3])
        db.session.commit()
        print(f"--- 1. Workers Registered: {[w.name for w in Worker.query.all()]} ---")

        # 2. Simulate Tanaka and Sato checking in at 6:05 and 6:15
        today = datetime.date.today()
        c1 = CheckIn(worker_id=w1.id, check_in_date=today, check_in_time=datetime.time(6, 5), status='On Time')
        c2 = CheckIn(worker_id=w2.id, check_in_date=today, check_in_time=datetime.time(6, 15), status='On Time')
        db.session.add_all([c1, c2])
        db.session.commit()
        print(f"--- 2. Check-ins Recorded for Tanaka and Sato ---")

        # 3. Simulate Suzuki NOT checking in
        # Now run the reporting logic
        active_workers = Worker.query.filter_by(is_active=True).all()
        checked_in_ids = [c.worker_id for c in CheckIn.query.filter_by(check_in_date=today).all()]
        late_workers = [w for w in active_workers if w.id not in checked_in_ids]

        print(f"\n--- 3. Reporting Logic (at 06:30 AM) ---")
        if late_workers:
            report_text = f"⚠️ Late Workers Report ({today}):\n\n"
            for i, worker in enumerate(late_workers, 1):
                report_text += f"{i}. {worker.name} (No response)\n"
        else:
            report_text = f"✅ All workers are awake and checked in for {today}!"
        
        print(f"Report to Manager:\n{report_text}")

if __name__ == "__main__":
    run_test()
