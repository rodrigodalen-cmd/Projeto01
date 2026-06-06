import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useBolao } from '../../context/BolaoContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { GameCard } from '../../components/GameCard';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinBolao'>;

export function JoinBolaoScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const { getBolaoByCode, joinBolao } = useBolao();

  const [code, setCode] = useState(route.params?.code || '');
  const [password, setPassword] = useState('');
  const [found, setFound] = useState<ReturnType<typeof getBolaoByCode>>(undefined);

  useEffect(() => {
    if (code.length === 8) {
      setFound(getBolaoByCode(code));
    } else {
      setFound(undefined);
    }
  }, [code]);

  const handleJoin = () => {
    if (!found) return;
    if (found.hasPassword && !password.trim()) {
      Alert.alert('Senha necessária', 'Digite a senha para entrar neste bolão.');
      return;
    }
    const ok = joinBolao(found.id, found.hasPassword ? password : undefined, user?.id, user?.name);
    if (!ok) {
      if (found.participants.length >= found.maxParticipants) {
        Alert.alert('Bolão lotado', 'Este bolão já atingiu o limite de participantes.');
      } else {
        Alert.alert('Senha incorreta', 'A senha digitada está errada.');
      }
      return;
    }
    navigation.replace('BolaoDetail', { bolaoId: found.id });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Entrar no Bolão</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.label}>Código do bolão</Text>
        <Text style={styles.sub}>Digite o código de 8 caracteres enviado pelo seu amigo</Text>

        <Input
          placeholder="Ex: COPA2026"
          value={code}
          onChangeText={v => setCode(v.toUpperCase())}
          autoCapitalize="characters"
          maxLength={8}
          icon="key-outline"
          style={styles.codeInput}
        />

        {found && (
          <View style={styles.foundBox}>
            <View style={styles.foundHeader}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.foundTitle}>Bolão encontrado!</Text>
            </View>

            <Text style={styles.bolaoTitle}>{found.title}</Text>

            <GameCard game={found.game} compact />

            <View style={styles.infoRow}>
              <InfoChip icon="cash-outline" value={`R$ ${found.betAmount}`} />
              <InfoChip icon="people-outline" value={`${found.participants.length}/${found.maxParticipants}`} />
              {found.hasPassword && <InfoChip icon="lock-closed-outline" value="Com senha" />}
            </View>

            {found.hasPassword && (
              <Input
                label="Senha do bolão"
                placeholder="Digite a senha"
                value={password}
                onChangeText={setPassword}
                isPassword
                icon="lock-closed-outline"
              />
            )}

            <Button title="Entrar no bolão 🎯" onPress={handleJoin} />
          </View>
        )}

        {code.length === 8 && !found && (
          <View style={styles.notFound}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
            <Text style={styles.notFoundText}>Bolão não encontrado com esse código.</Text>
            <Text style={styles.notFoundSub}>Verifique o código e tente novamente.</Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function InfoChip({ icon, value }: { icon: any; value: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={13} color={colors.textSecondary} />
      <Text style={styles.chipText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 20 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    marginTop: 8,
  },
  topTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  label: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sub: { color: colors.textMuted, fontSize: 13, marginBottom: 20 },
  codeInput: { fontSize: 24, letterSpacing: 4, fontWeight: '900', textAlign: 'center' },
  foundBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.success + '44',
    gap: 12,
    marginTop: 8,
  },
  foundHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  foundTitle: { color: colors.success, fontSize: 14, fontWeight: '700' },
  bolaoTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  infoRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  notFound: {
    alignItems: 'center',
    marginTop: 32,
    gap: 8,
  },
  notFoundText: { color: colors.error, fontSize: 15, fontWeight: '700' },
  notFoundSub: { color: colors.textMuted, fontSize: 13 },
});
