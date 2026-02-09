import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl
} from 'react-native';
import {SafeAreaView} from "react-native-safe-area-context";
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/app/(auth)/AuthContext';
import { API_BASE_URL } from '@/lib/config';
import { getAllServiceRequests, updateServiceRequestStatus, ServiceRequest } from '@/lib/api/services';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface StaffRequestsProps {
    onBack: () => void;
}

export default function StaffRequests({ onBack }: StaffRequestsProps) {
    const { token } = useAuth();
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { errorText, handleError, clearError } = useErrorHandler();

    const fetchRequests = async () => {
        clearError();
        try {
            const data = await getAllServiceRequests(API_BASE_URL, token!);
            setRequests(data);
        } catch (e: any) {
            handleError(e, "Не вдалося завантажити заявки");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchRequests();
    };

    const handleAction = async (requestId: number, status: 'approved' | 'rejected') => {
        clearError();
        try {
            await updateServiceRequestStatus(API_BASE_URL, token!, requestId, status);
            Alert.alert("Успіх", `Заявку ${status === 'approved' ? 'схвалено' : 'відхилено'}`);
            fetchRequests();
        } catch (e: any) {
            handleError(e);
        }
    };

    const renderItem = ({ item }: { item: ServiceRequest }) => (
        <View className="bg-white rounded-[15px] p-[15px] mb-[15px] shadow-sm">
            <View className="flex-row justify-between items-start mb-[15px]">
                <View className="flex-1 mr-2">
                    <Text className="text-[16px] font-bold">{item.user_full_name || item.user_email}</Text>
                    <Text className="text-[12px] text-[#666]">{item.user_email}</Text>
                </View>
                <View className={`shrink-0 px-[10px] py-[5px] rounded-[10px] ${getStatusBgClass(item.status)}`}>
                    <Text className="text-white text-[12px] font-bold">
                        {item.status === 'pending' ? 'Очікує' : item.status === 'approved' ? 'Схвалено' : 'Відхилено'}
                    </Text>
                </View>
            </View>

            <View className="mb-[15px]">
                <View className="flex-row items-center mb-[5px]">
                    <MaterialIcons name="info" size={18} color="#666" />
                    <Text className="ml-[10px] text-[14px] text-[#333]">
                        {item.type === 'off' ? 'Вихідний' : item.type === 'vacation' ? 'Відпустка' : 'Лікарняний'}
                    </Text>
                </View>
                <View className="flex-row items-center mb-[5px]">
                    <MaterialIcons name="date-range" size={18} color="#666" />
                    <Text className="ml-[10px] text-[14px] text-[#333]">{item.start_date} - {item.end_date}</Text>
                </View>
            </View>

            {item.status === 'pending' && (
                <View className="flex-row justify-between border-t border-[#eee] pt-[15px]">
                    <TouchableOpacity
                        className="flex-[0.48] py-[10px] rounded-[8px] items-center bg-[#ffebee] border border-[#f44336]"
                        onPress={() => handleAction(item.id, 'rejected')}
                    >
                        <Text className="font-bold text-[14px] text-[#f44336]">Відхилити</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="flex-[0.48] py-[10px] rounded-[8px] items-center bg-[#e8f5e9] border border-[#4caf50]"
                        onPress={() => handleAction(item.id, 'approved')}
                    >
                        <Text className="font-bold text-[14px] text-[#4caf50]">Схвалити</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#2196F3" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#f5f5f5]" edges={['top']}>
            <View className="flex-1 web:max-w-2xl web:mx-auto w-full px-5 pt-3">
                <View className="flex-row items-center mb-[20px]">
                    <TouchableOpacity onPress={onBack} className="mr-[15px]">
                        <MaterialIcons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <Text className="text-[20px] font-bold">Заявки на зміни</Text>
                </View>

                <FlatList
                    data={requests}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View className="items-center mt-[50px]">
                            <Text className="text-[16px] text-[#999]">Немає нових заявок</Text>
                        </View>
                    }
                    contentContainerClassName="pb-5"
                />

                {errorText ? (
                    <View className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-4">
                        <Text className="text-red-700">{errorText}</Text>
                        <TouchableOpacity onPress={clearError} className="mt-3 bg-black/10 px-4 py-3 rounded-xl self-start">
                            <Text className="text-[#111827]">Закрити</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}
            </View>
        </SafeAreaView>
    );
}

const getStatusBgClass = (status: string) => {
    switch (status) {
        case 'pending': return 'bg-[#FFC107]';
        case 'approved': return 'bg-[#4CAF50]';
        case 'rejected': return 'bg-[#F44336]';
        default: return 'bg-[#9E9E9E]';
    }
};
