export type EntryType = "shift" | "off" | "vacation" | "sick" | "trip" | "other";

export type ScheduleEntry = {
    date: string;
    type: EntryType;
    start_time?: string | null;
    end_time?: string | null;
    title?: string | null;
};

export type DeptEmployee = {
    user_id: number;
    email: string;
    full_name?: string | null;
};
