import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useBolao } from '../../context/BolaoContext';
import { GameCard } from '../../components/GameCard';
import { BolaoCard } from '../../components/BolaoCard';
import { colors } from '../../theme/colors';
import { mockGames } from '../../data/games';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

export function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { getUserBoloes } = useBolao();
  const [refreshing, setRefreshing] = React.useState(false);

  const myBoloes = user ? getUserBoloes(user.id) : [];
  const upcomingGames = mockGames.filter(g => g.status === 'upcoming').slice(0, 4);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {user?.name.split(' ')[0]} 👋</Text>
          <Text style={styles.subGreeting}>Copa do Mundo 2026 · USA/CAN/MEX</Text>
        </View>
        <View style={styles.trophyBadge}>
          <Text style={styles.trophyEmoji}>🏆</Text>
        </View>
      </View>

      {/* Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>🇧🇷 Brasil na Copa 2026</Text>
        <Text style={styles.bannerSub}>Crie seu bolão e aposte com os amigos!</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateBolao')}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={18} color="#0D1B2A" />
          <Text style={styles.createBtnText}>Criar Bolão</Text>
        </TouchableOpacity>
      </View>

      {/* Meus Bolões */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Meus Bolões</Text>
          {myBoloes.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{myBoloes.length}</Text>
            </View>
          )}
        </View>

        {myBoloes.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>Nenhum bolão ainda</Text>
            <Text style={styles.emptyText}>
              Crie um bolão ou entre com um link de convite
            </Text>
            <TouchableOpacity
              style={styles.joinBtn}
              onPress={() => navigation.navigate('JoinBolao', { code: '' })}
            >
              <Text style={styles.joinBtnText}>Entrar com código</Text>
            </TouchableOpacity>
          </View>
        ) : (
          myBoloes.map(bolao => (
            <BolaoCard
              key={bolao.id}
              bolao={bolao}
              userId={user?.id}
              onPress={() => navigation.navigate('BolaoDetail', { bolaoId: bolao.id })}
            />
          ))
        )}
      </View>

      {/* Próximos Jogos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Próximos Jogos da Copa</Text>
        <Text style={styles.sectionSub}>Toque em um jogo para criar um bolão</Text>
        {upcomingGames.map(game => (
          <GameCard
            key={game.id}
            game={game}
            onPress={() => navigation.navigate('CreateBolao')}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  greeting: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  subGreeting: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  trophyBadge: {
    backgroundColor: colors.surface,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  trophyEmoji: { fontSize: 24 },
  banner: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  bannerSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 16,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  createBtnText: {
    color: '#0D1B2A',
    fontSize: 14,
    fontWeight: '800',
  },
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 12,
    marginTop: -8,
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  joinBtn: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  joinBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
