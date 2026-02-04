import { LocaleConfig } from "react-native-calendars";

export function setupCalendarLocaleUA() {
    LocaleConfig.locales.ua = {
        monthNames: [
            "Січень","Лютий","Березень","Квітень","Травень","Червень",
            "Липень","Серпень","Вересень","Жовтень","Листопад","Грудень",
        ],
        monthNamesShort: ["Січ","Лют","Бер","Кві","Тра","Чер","Лип","Сер","Вер","Жов","Лис","Гру"],
        dayNames: ["Понеділок","Вівторок","Середа","Четвер","Пʼятниця","Субота","Неділя"],
        dayNamesShort: ["Пн","Вт","Ср","Чт","Пт","Сб","Нд"],
        today: "Сьогодні",
    };

    LocaleConfig.defaultLocale = "ua";
}
