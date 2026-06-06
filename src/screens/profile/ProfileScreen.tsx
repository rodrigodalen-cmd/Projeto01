import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useBolao } from '../../context/BolaoContext';
import { colors } from '../../theme/colors';

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { getUserBoloes } = useBolao();

  const myBoloes = user ? getUserBoloes(user.id) : [];
  const created = myBoloes.filter(b => b.creatorId === user?.id).length;
  const participated = myBoloes.filter(b => b.creatorId !== user?.id).length;
  const totalPaid = myBoloes.reduce((sum, b) => {
    const myBet = b.participants.find(p => p.userId === user?.id);
    return sum + (myBet?.hasPaid ? b.betAmount : 0);
  }, 0);

  const handleSignOut = () => {
    Alert.alert('Sair', 'Tem certeza que quer sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: signOut },
    ]);
  };

  if (!user) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Perfil</Text>

      {/* Avatar e nome */}
      <View style={styles.avatarCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsCard}>
        <StatBlock value={created} label="Bolões criados" icon="trophy-outline" />
        <View style={styles.statDivider} />
        <StatBlock value={participated} label="Participações" icon="people-outline" />
        <View style={styles.statDivider} />
        <StatBlock
          value={`R$${totalPaid}`}
          label="Total apostado"
          icon="cash-outline"
          color={colors.pix}
        />
      </View>

      {/* Dados */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meus dados</Text>

        <InfoRow icon="call-outline" label="Telefone" value={user.phone} />
        <InfoRow icon="qr-code-outline" label="Chave Pix" value={user.pixKey} pixColor />
      </View>

      {/* Sobre */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sobre o app</Text>

        <View style={styles.aboutCard}>
          <Text style={styles.aboutItem}>🏆 Bolão Copa v1.0.0</Text>
          <Text style={styles.aboutItem}>🇧🇷 Feito para a Copa do Mundo 2026</Text>
          <Text style={styles.aboutItem}>💰 Taxa de 10% sobre o prêmio</Text>
          <Text style={styles.aboutItem}>🔒 Máximo 50 participantes por bolão</Text>
          <Text style={styles.aboutItem}>⚖️ Apenas para uso entre amigos</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.signOutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatBlock({ value, label, icon, color }: { value: number | string; label: string; icon: any; color?: string }) {
  return (
    <View style={styles.statBlock}>
      <Ionicons name={icon} size={20} color={color || colors.primary} />
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, pixColor }: { icon: any; label: string; value: string; pixColor?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={pixColor ? colors.pix : colors.textSecondary} />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, pixColor && { color: colors.pix }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 60 },
  pageTitle: { color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: 24, marginTop: 8 },
  avatarCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 28,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '900' },
  userName: { color: colors.text, fontSize: 20, fontWeight: '800' },
  userEmail: { color: colors.textMuted, fontSize: 13 },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBlock: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: colors.border },
  statValue: { color: colors.secondary, fontSize: 18, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoContent: { flex: 1 },
  infoLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 2 },
  aboutCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aboutItem: { color: colors.textSecondary, fontSize: 13 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.error + '1A',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.error + '33',
  },
  signOutText: { color: colors.error, fontSize: 15, fontWeight: '700' },
});
