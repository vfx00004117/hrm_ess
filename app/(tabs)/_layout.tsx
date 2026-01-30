import React from 'react';
import {Tabs} from "expo-router";
import {MaterialIcons} from "@expo/vector-icons";
import {useAuth} from "@/app/(auth)/AuthContext";

export default function TabLayout() {
    const { role, isReady } = useAuth();

    //не показуємо ролі employee вкладку requests
    if (!isReady) return null;
    const isManager = role === "manager";

    return (
        <Tabs>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Головна',
                    headerShown: false,
                    popToTopOnBlur: false,
                    freezeOnBlur: true,
                    tabBarIcon: ({ focused }) => (
                        <>
                            <MaterialIcons name="home" size={24} color='black'/>
                        </>
                    )
                }}
            />
            <Tabs.Screen
                name="schedule"
                options={{
                    title: 'Графік',
                    headerShown: false,
                    popToTopOnBlur: false,
                    freezeOnBlur: true,
                    tabBarIcon: ({ focused }) => (
                        <>
                            <MaterialIcons name="calendar-today" size={24} color='black'/>
                        </>
                    )
                }}
            />
            <Tabs.Screen
                name="services"
                options={{
                    title: 'Сервіси',
                    headerShown: false,
                    popToTopOnBlur: false,
                    freezeOnBlur: true,
                    tabBarIcon: ({ focused }) => (
                        <>
                            <MaterialIcons name="edit-document" size={24} color="black" />
                        </>
                    )
                }}
            />
            <Tabs.Screen
                name="requests"
                options={{
                    title: "Заявки",
                    headerShown: false,
                    popToTopOnBlur: false,
                    freezeOnBlur: true,
                    //перевіряємо роль, якщо manager - показуємо requests
                    href: isManager ? "/(tabs)/requests" : null,
                    tabBarIcon: ({ focused }) => (
                        <MaterialIcons name="assignment" size={24} color='black' />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Профіль',
                    headerShown: false,
                    popToTopOnBlur: false,
                    freezeOnBlur: true,
                    tabBarIcon: ({ focused }) => (
                        <>
                            <MaterialIcons name="person" size={24} color='black'/>
                        </>
                    )
                }}
            />
        </Tabs>
    );
}