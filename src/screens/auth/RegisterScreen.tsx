import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { signUp, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !phone || !pixKey || !password) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não conferem.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    await signUp(name, email.trim().toLowerCase(), phone, pixKey, password);
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
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>É grátis e rápido 🎉</Text>

        <View style={styles.form}>
          <Input
            label="Nome completo"
            placeholder="Seu nome"
            value={name}
            onChangeText={setName}
            icon="person-outline"
          />
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
            label="WhatsApp / Telefone"
            placeholder="(11) 99999-9999"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            icon="call-outline"
          />
          <Input
            label="Chave Pix"
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            value={pixKey}
            onChangeText={setPixKey}
            autoCapitalize="none"
            icon="qr-code-outline"
          />
          <View style={styles.pixInfo}>
            <Ionicons name="information-circle-outline" size={14} color={colors.pix} />
            <Text style={styles.pixInfoText}>
              Sua chave Pix será usada para receber prêmios
            </Text>
          </View>
          <Input
            label="Senha"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChangeText={setPassword}
            isPassword
            icon="lock-closed-outline"
          />
          <Input
            label="Confirmar senha"
            placeholder="Repita a senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            isPassword
            icon="lock-closed-outline"
          />

          <Button
            title="Criar minha conta"
            onPress={handleRegister}
            loading={isLoading}
            style={styles.btn}
          />
        </View>
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
  },
  topBar: {
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    marginBottom: 32,
  },
  form: {},
  pixInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  pixInfoText: {
    color: colors.pix,
    fontSize: 12,
  },
  btn: {
    marginTop: 8,
  },
});
