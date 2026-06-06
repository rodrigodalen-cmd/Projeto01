import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }
    const ok = await signIn(email.trim().toLowerCase(), password);
    if (!ok) {
      Alert.alert('Erro', 'E-mail ou senha incorretos.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.trophy}>🏆</Text>
          <Text style={styles.appName}>Bolão Copa</Text>
          <Text style={styles.tagline}>Aposte com os amigos. Ganhe junto.</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail-outline"
          />
          <Input
            label="Senha"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            isPassword
            icon="lock-closed-outline"
          />

          <Button
            title="Entrar"
            onPress={handleLogin}
            loading={isLoading}
            style={styles.loginBtn}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title="Criar conta gratuita"
            onPress={() => navigation.navigate('Register')}
            variant="outline"
          />
        </View>

        <Text style={styles.hint}>
          💡 Para testar: joao@email.com / 123456
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  trophy: {
    fontSize: 64,
    marginBottom: 12,
  },
  appName: {
    color: colors.secondary,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    gap: 0,
  },
  loginBtn: {
    marginTop: 8,
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
  },
});
