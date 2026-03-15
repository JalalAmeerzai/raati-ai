import os
import shutil
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
RESULTS_FILE = DATA_DIR / "results.csv"

def reset_data():
    if RESULTS_FILE.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"results_backup_{timestamp}.csv"
        backup_path = DATA_DIR / backup_name
        
        shutil.move(str(RESULTS_FILE), str(backup_path))
        print(f"Renamed {RESULTS_FILE} to {backup_path}")
    else:
        print("No results.csv found to reset.")

if __name__ == "__main__":
    reset_data()
