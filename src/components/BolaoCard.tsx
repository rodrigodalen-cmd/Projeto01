import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Bolao } from '../types';
import { colors } from '../theme/colors';

interface BolaoCardProps {
  bolao: Bolao;
  onPress: () => void;
  userId?: string;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function BolaoCard({ bolao, onPress, userId }: BolaoCardProps) {
  const isCreator = bolao.creatorId === userId;
  const myBet = bolao.participants.find(p => p.userId === userId);
  const hasPaid = myBet?.hasPaid ?? false;
  const paidCount = bolao.participants.filter(p => p.hasPaid).length;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{bolao.title}</Text>
          {isCreator && (
            <View style={styles.creatorBadge}>
              <Text style={styles.creatorText}>Criador</Text>
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, styles[`status_${bolao.status}`]]}>
          <Text style={styles.statusText}>
            {bolao.status === 'open' ? 'Aberto' : bolao.status === 'closed' ? 'Encerrado' : 'Finalizado'}
          </Text>
        </View>
      </View>

      <View style={styles.matchRow}>
        <Text style={styles.teams}>
          {bolao.game.homeTeam.flag} {bolao.game.homeTeam.code} vs {bolao.game.awayTeam.code} {bolao.game.awayTeam.flag}
        </Text>
        {bolao.hasPassword && (
          <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatCurrency(bolao.betAmount)}</Text>
          <Text style={styles.statLabel}>por aposta</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatCurrency(bolao.prizePool)}</Text>
          <Text style={styles.statLabel}>prêmio</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{paidCount}/{bolao.maxParticipants}</Text>
          <Text style={styles.statLabel}>pagantes</Text>
        </View>
      </View>

      {myBet && (
        <View style={[styles.myStatus, hasPaid ? styles.paidStatus : styles.pendingStatus]}>
          <Ionicons
            name={hasPaid ? 'checkmark-circle' : 'time-outline'}
            size={14}
            color={hasPaid ? colors.success : colors.warning}
          />
          <Text style={[styles.myStatusText, { color: hasPaid ? colors.success : colors.warning }]}>
            {hasPaid ? 'Pix confirmado' : 'Aguardando pagamento'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  creatorBadge: {
    backgroundColor: colors.primary + '33',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  creatorText: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  status_open: { backgroundColor: colors.success + '33' },
  status_closed: { backgroundColor: colors.warning + '33' },
  status_finished: { backgroundColor: colors.error + '33' },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teams: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  statValue: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  myStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  paidStatus: { backgroundColor: colors.success + '1A' },
  pendingStatus: { backgroundColor: colors.warning + '1A' },
  myStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
