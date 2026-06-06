import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useBolao } from '../../context/BolaoContext';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'MakeBet'>;

function ScoreSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.scoreSelector}>
      <TouchableOpacity
        style={styles.scoreBtn}
        onPress={() => onChange(Math.max(0, value - 1))}
      >
        <Ionicons name="remove" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.scoreValue}>{value}</Text>
      <TouchableOpacity
        style={styles.scoreBtn}
        onPress={() => onChange(Math.min(20, value + 1))}
      >
        <Ionicons name="add" size={24} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

export function MakeBetScreen({ route, navigation }: Props) {
  const { bolaoId } = route.params;
  const { user } = useAuth();
  const { getBolaoById, makeBet } = useBolao();

  const bolao = getBolaoById(bolaoId);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  if (!bolao || !user) return null;

  const handleConfirm = () => {
    Alert.alert(
      'Confirmar palpite?',
      `${bolao.game.homeTeam.flag} ${bolao.game.homeTeam.name} ${homeScore} × ${awayScore} ${bolao.game.awayTeam.name} ${bolao.game.awayTeam.flag}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            makeBet(bolaoId, user.id, user.name, homeScore, awayScore);
            Alert.alert(
              '✅ Palpite registrado!',
              `Agora pague ${bolao.betAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} via Pix para confirmar sua participação.`,
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          },
        },
      ]
    );
  };

  const getResult = () => {
    if (homeScore > awayScore) return `Vitória do ${bolao.game.homeTeam.name}`;
    if (awayScore > homeScore) return `Vitória do ${bolao.game.awayTeam.name}`;
    return 'Empate';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Meu Palpite</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.bolaoName}>{bolao.title}</Text>

      {/* Placar */}
      <View style={styles.matchCard}>
        <View style={styles.teamCol}>
          <Text style={styles.flagBig}>{bolao.game.homeTeam.flag}</Text>
          <Text style={styles.teamNameBig}>{bolao.game.homeTeam.name}</Text>
          <Text style={styles.teamCode}>{bolao.game.homeTeam.code}</Text>
        </View>

        <View style={styles.centerCol}>
          <Text style={styles.vsLabel}>PLACAR FINAL</Text>
          <View style={styles.scoresRow}>
            <ScoreSelector value={homeScore} onChange={setHomeScore} />
            <Text style={styles.scoreDash}>×</Text>
            <ScoreSelector value={awayScore} onChange={setAwayScore} />
          </View>
          <View style={styles.resultBadge}>
            <Text style={styles.resultText}>{getResult()}</Text>
          </View>
        </View>

        <View style={styles.teamCol}>
          <Text style={styles.flagBig}>{bolao.game.awayTeam.flag}</Text>
          <Text style={styles.teamNameBig}>{bolao.game.awayTeam.name}</Text>
          <Text style={styles.teamCode}>{bolao.game.awayTeam.code}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.infoText}>{bolao.game.date} · {bolao.game.time}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.infoText}>{bolao.game.venue}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={16} color={colors.pix} />
          <Text style={[styles.infoText, { color: colors.pix }]}>
            Valor da aposta: {bolao.betAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} via Pix
          </Text>
        </View>
      </View>

      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>💡 Como funciona</Text>
        <Text style={styles.tipText}>
          • Registre seu palpite do placar final{'\n'}
          • Pague via Pix para confirmar sua participação{'\n'}
          • Quem acertar o placar exato divide o prêmio{'\n'}
          • Se ninguém acertar exato, ganha quem chegou mais perto
        </Text>
      </View>

      <Button
        title="Confirmar meu palpite"
        onPress={handleConfirm}
        style={styles.confirmBtn}
        icon={<Ionicons name="checkmark-circle-outline" size={20} color="#fff" />}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 60 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 8,
  },
  topTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  bolaoName: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  matchCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  teamCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  flagBig: { fontSize: 48 },
  teamNameBig: { color: colors.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  teamCode: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  centerCol: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  vsLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scoresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreDash: {
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: '900',
  },
  scoreSelector: {
    alignItems: 'center',
    gap: 4,
  },
  scoreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreValue: {
    color: colors.secondary,
    fontSize: 32,
    fontWeight: '900',
    minWidth: 48,
    textAlign: 'center',
  },
  resultBadge: {
    backgroundColor: colors.primary + '22',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resultText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { color: colors.textSecondary, fontSize: 13, flex: 1 },
  tipCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipTitle: { color: colors.secondary, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  tipText: { color: colors.textSecondary, fontSize: 13, lineHeight: 22 },
  confirmBtn: {},
});
