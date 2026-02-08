import os
from datetime import datetime
from typing import Optional
from .db.models.user import User

LOG_FILE = "schedule_changes.log"
PROFILE_LOG_FILE = "profile_changes.log"

def log_schedule_change(
    author: User,
    target_user: User,
    date: str,
    action: str,
    details: str
):
    """
    Записує зміну в розкладі у файл логів.
    
    author: користувач, який вніс зміни
    target_user: користувач, розклад якого змінено
    date: дата в календарі, яка була змінена (або діапазон)
    action: тип дії (створено, оновлено, видалено)
    details: деталі зміни (тип зміни, час і т.д.)
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = (
        f"[{timestamp}] Автор: {author.email} (ID: {author.id}) | "
        f"Співробітник: {target_user.email} (ID: {target_user.id}) | "
        f"Дата: {date} | "
        f"Дія: {action} | "
        f"Деталі: {details}\n"
    )
    
    # Визначаємо шлях до файлу логів відносно кореня бекенду
    # Оскільки ми в backend/app/utils.py, лог буде в корені бекенду
    log_path = os.path.join(os.getcwd(), LOG_FILE)
    
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(log_entry)

def log_profile_change(
    author: User,
    target_user: User,
    action: str,
    details: str
):
    """
    Записує зміну в профілі у файл логів.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = (
        f"[{timestamp}] Автор: {author.email} (ID: {author.id}) | "
        f"Співробітник: {target_user.email} (ID: {target_user.id}) | "
        f"Дія: {action} | "
        f"Деталі: {details}\n"
    )
    
    log_path = os.path.join(os.getcwd(), PROFILE_LOG_FILE)
    
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(log_entry)
