import type { ScheduleEntry } from "./types";

export const pad2 = (n: number) => String(n).padStart(2, "0");

export const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

export const ymFromDate = (date: string) => date.slice(0, 7);
export const firstOfMonth = (ym: string) => `${ym}-01`;

export const getAdjacentDate = (dateStr: string, delta: number) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + delta);
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

export function bgForEntry(e: ScheduleEntry) {
    switch (e.type) {
        case "shift":
            return "#BFD7FF";
        case "vacation":
            return "#CFF0D8";
        case "sick":
            return "#F2AFAF";
        case "trip":
            return "#FFD29A";
        case "off":
            return "#9FE0B5";
        default:
            return "#FEF3C7";
    }
}
