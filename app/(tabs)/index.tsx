import { Text, View } from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";

export default function Index() {
  return (
      <SafeAreaView className="flex-1">
          <View className="flex-1 justify-center items-center">
              <Text className="text-5xl text-primary font-bold text-center">
                  Welcome to the Employee Self-Service app!
              </Text>
          </View>
      </SafeAreaView>
  );
}
