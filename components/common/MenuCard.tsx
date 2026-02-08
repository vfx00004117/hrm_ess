import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface MenuCardProps {
    title: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    onPress?: () => void;
    iconColor?: string;
    backgroundColor?: string;
}

export const MenuCard: React.FC<MenuCardProps> = ({ 
    title, 
    icon, 
    onPress, 
    iconColor = "#2196F3",
    backgroundColor = "#E3F2FD" 
}) => {
    return (
        <TouchableOpacity
            className="w-[45%] h-[150px] bg-white rounded-[15px] p-5 items-center mb-5 shadow-sm"
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View 
                className="w-[60px] h-[60px] rounded-[30px] justify-center items-center mb-[10px]"
                style={{ backgroundColor }}
            >
                <MaterialIcons name={icon} size={32} color={iconColor} />
            </View>
            <Text className="text-[16px] font-semibold text-center" numberOfLines={2}>
                {title}
            </Text>
        </TouchableOpacity>
    );
};
