import React, { useState } from 'react';
import {
    Text,
    View,
} from 'react-native';
import {SafeAreaView} from "react-native-safe-area-context";
import { MenuCard } from '@/components/common/MenuCard';
import ScheduleRequest from '@/components/services/ScheduleRequest';

const Services = () => {
    const [view, setView] = useState<'menu' | 'schedule_request'>('menu');

    if (view === 'schedule_request') {
        return <ScheduleRequest onBack={() => setView('menu')} />;
    }

    return (
        <SafeAreaView className="flex-1 bg-slate-50 px-4" edges={['top']}>
            <Text className="text-3xl font-bold mb-3">Сервіси</Text>
            <View className="flex-row flex-wrap justify-between">
                <MenuCard
                    title="Графіки"
                    icon="calendar-month"
                    onPress={() => setView('schedule_request')}
                />
                <MenuCard
                    title="[placeholder]"
                    icon="archive"
                />
                <MenuCard
                    title="[placeholder]"
                    icon="monetization-on"
                />
                <MenuCard
                    title="[placeholder]"
                    icon="file-copy"
                />
                {/* Інші сервіси можна додати тут */}
            </View>
        </SafeAreaView>
    );
};

export default Services;