import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from "react-native-safe-area-context";
import StaffRequests from '@/components/staff/StaffRequests';
import StaffManager from '@/components/staff/StaffManager';
import { MenuCard } from '@/components/common/MenuCard';

export default function StaffScreen() {
    const [view, setView] = useState<'menu' | 'requests' | 'employees'>('menu');

    if (view === 'requests') {
        return (
            <StaffRequests onBack={() => setView('menu')} />
        );
    }

    if (view === 'employees') {
        return (
            <StaffManager onBack={() => setView('menu')} />
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#f5f5f5]" edges={['top']}>
            <View className="flex-1 web:max-w-2xl web:mx-auto w-full px-4">
                <Text className="text-3xl font-bold mb-3">Персонал</Text>
                <View className="flex-row flex-wrap justify-between">
                    <MenuCard
                        title="Заявки"
                        icon="assignment"
                        onPress={() => setView('requests')}
                    />

                    <MenuCard
                        title="Співробітники"
                        icon="people"
                        onPress={() => setView('employees')}
                    />

                    <MenuCard
                        title="[placeholder]"
                        icon="bar-chart"
                    />

                    <MenuCard
                        title="[placeholder]"
                        icon="settings"
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}
