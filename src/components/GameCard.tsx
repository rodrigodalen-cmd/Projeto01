import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Game } from '../types';
import { colors } from '../theme/colors';

interface GameCardProps {
  game: Game;
  onPress?: () => void;
  selected?: boolean;
  compact?: boolean;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${day} ${months[Number(month) - 1]}`;
}

export function GameCard({ game, onPress, selected, compact }: GameCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.selectedCard, compact && styles.compactCard]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.stageBadge}>
        <Text style={styles.stageText}>{game.stage}{game.group ? ` · ${game.group}` : ''}</Text>
        <Text style={styles.dateText}>{formatDate(game.date)} · {game.time}</Text>
      </View>

      <View style={styles.matchRow}>
        <View style={styles.teamBlock}>
          <Text style={styles.flag}>{game.homeTeam.flag}</Text>
          <Text style={styles.teamName}>{game.homeTeam.name}</Text>
          <Text style={styles.teamCode}>{game.homeTeam.code}</Text>
        </View>

        <View style={styles.vsBlock}>
          {game.status === 'finished' ? (
            <Text style={styles.score}>
              {game.homeScore} - {game.awayScore}
            </Text>
          ) : (
            <Text style={styles.vs}>VS</Text>
          )}
          {game.status === 'live' && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>AO VIVO</Text>
            </View>
          )}
        </View>

        <View style={[styles.teamBlock, styles.teamRight]}>
          <Text style={styles.flag}>{game.awayTeam.flag}</Text>
          <Text style={styles.teamName}>{game.awayTeam.name}</Text>
          <Text style={styles.teamCode}>{game.awayTeam.code}</Text>
        </View>
      </View>

      {!compact && (
        <Text style={styles.venue} numberOfLines={1}>
          📍 {game.venue}
        </Text>
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
  },
  selectedCard: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.surfaceLight,
  },
  compactCard: {
    padding: 12,
    marginBottom: 0,
  },
  stageBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stageText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  teamRight: {
    alignItems: 'center',
  },
  flag: {
    fontSize: 36,
  },
  teamName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  teamCode: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  vsBlock: {
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 4,
  },
  vs: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: '900',
  },
  score: {
    color: colors.secondary,
    fontSize: 22,
    fontWeight: '900',
  },
  liveBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  venue: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 10,
    textAlign: 'center',
  },
});
