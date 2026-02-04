from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import Base, engine

from .models import work_entry

from .routers import auth, department, employee, schedule

app = FastAPI(title="HRM Auth API")

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(employee.router)
app.include_router(department.router)
app.include_router(schedule.router)
