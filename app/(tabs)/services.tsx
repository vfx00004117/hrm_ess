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
        <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
            <View className="flex-1 web:max-w-2xl web:mx-auto w-full px-4">
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
                </View>
            </View>
        </SafeAreaView>
    );
};

export default Services;