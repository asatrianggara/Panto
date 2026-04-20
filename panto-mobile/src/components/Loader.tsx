import { View, ActivityIndicator, Text } from 'react-native';
import { colors } from '../theme/colors';

export default function Loader({ label }: { label?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? (
        <Text style={{ marginTop: 12, color: colors.textSub, fontSize: 14 }}>{label}</Text>
      ) : null}
    </View>
  );
}
