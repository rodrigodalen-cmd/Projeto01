import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useBolao } from '../../context/BolaoContext';
import { GameCard } from '../../components/GameCard';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'BolaoDetail'>;

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function BolaoDetailScreen({ route, navigation }: Props) {
  const { bolaoId } = route.params;
  const { user } = useAuth();
  const { getBolaoById, confirmPayment } = useBolao();
  const [copied, setCopied] = useState(false);

  const bolao = getBolaoById(bolaoId);
  if (!bolao) return null;

  const isCreator = bolao.creatorId === user?.id;
  const myParticipant = bolao.participants.find(p => p.userId === user?.id);
  const paidCount = bolao.participants.filter(p => p.hasPaid).length;
  const inviteLink = `bolaocopa://join/${bolao.inviteCode}`;

  const copyInviteLink = async () => {
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareInvite = async () => {
    await Share.share({
      message: `🏆 Entre no meu bolão "${bolao.title}"!\n\nUse o código: *${bolao.inviteCode}*\n\nAposte no jogo ${bolao.game.homeTeam.flag} ${bolao.game.homeTeam.name} x ${bolao.game.awayTeam.name} ${bolao.game.awayTeam.flag}\n\nValor: ${formatCurrency(bolao.betAmount)} por pessoa`,
    });
  };

  const handleSimulatePayment = () => {
    Alert.alert(
      'Pagamento via Pix',
      `Transfira ${formatCurrency(bolao.betAmount)} para a chave Pix do administrador e confirme aqui.\n\nEm produção, o QR Code Pix será gerado automaticamente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar pagamento',
          onPress: () => {
            confirmPayment(bolaoId, user!.id);
            Alert.alert('✅ Pago!', 'Seu pagamento foi confirmado. Boa sorte!');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{bolao.title}</Text>
        {bolao.hasPassword && (
          <Ionicons name="lock-closed" size={18} color={colors.textMuted} />
        )}
      </View>

      {/* Jogo */}
      <GameCard game={bolao.game} compact />

      {/* Prêmio */}
      <View style={styles.prizeCard}>
        <View style={styles.prizeMain}>
          <Text style={styles.prizeLabel}>💰 Prêmio Acumulado</Text>
          <Text style={styles.prizeValue}>{formatCurrency(bolao.prizePool)}</Text>
          <Text style={styles.prizeSub}>
            {paidCount} de {bolao.maxParticipants} pagantes · 10% do app já descontado
          </Text>
        </View>
        <View style={styles.prizeProjection}>
          <Text style={styles.projectionLabel}>Potencial máximo</Text>
          <Text style={styles.projectionValue}>
            {formatCurrency(bolao.betAmount * bolao.maxParticipants * 0.9)}
          </Text>
        </View>
      </View>

      {/* Código de convite */}
      <View style={styles.inviteCard}>
        <Text style={styles.inviteTitle}>🔗 Link de Convite</Text>
        <View style={styles.codeRow}>
          <Text style={styles.codeText}>{bolao.inviteCode}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={copyInviteLink}>
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={18}
              color={copied ? colors.success : colors.primary}
            />
            <Text style={[styles.copyText, copied && { color: colors.success }]}>
              {copied ? 'Copiado!' : 'Copiar'}
            </Text>
          </TouchableOpacity>
        </View>
        <Button
          title="Compartilhar convite"
          onPress={shareInvite}
          variant="outline"
          style={styles.shareBtn}
          icon={<Ionicons name="share-social-outline" size={18} color={colors.primary} />}
        />
      </View>

      {/* Ações do usuário */}
      {myParticipant && (
        <View style={styles.myActions}>
          {!myParticipant.hasPaid && (
            <Button
              title={`Pagar ${formatCurrency(bolao.betAmount)} via Pix`}
              onPress={handleSimulatePayment}
              variant="pix"
              icon={<Ionicons name="qr-code-outline" size={18} color="#fff" />}
              style={styles.pixBtn}
            />
          )}
          {myParticipant.homeScore === 0 && myParticipant.awayScore === 0 ? (
            <Button
              title="Fazer meu palpite"
              onPress={() => navigation.navigate('MakeBet', { bolaoId })}
              variant="secondary"
              icon={<Ionicons name="football-outline" size={18} color="#0D1B2A" />}
            />
          ) : (
            <View style={styles.myBetCard}>
              <Text style={styles.myBetLabel}>Meu palpite</Text>
              <Text style={styles.myBetScore}>
                {bolao.game.homeTeam.flag} {myParticipant.homeScore} × {myParticipant.awayScore} {bolao.game.awayTeam.flag}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('MakeBet', { bolaoId })}>
                <Text style={styles.editBet}>Alterar palpite</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {!myParticipant && !isCreator && (
        <Button
          title="Entrar neste bolão"
          onPress={() => navigation.navigate('MakeBet', { bolaoId })}
        />
      )}

      {/* Participantes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Participantes ({bolao.participants.length}/{bolao.maxParticipants})
        </Text>

        {bolao.participants.length === 0 ? (
          <View style={styles.noPart}>
            <Text style={styles.noPartText}>Nenhum participante ainda. Compartilhe o código!</Text>
          </View>
        ) : (
          bolao.participants.map((p, i) => (
            <View key={p.userId} style={styles.participantRow}>
              <View style={styles.participantAvatar}>
                <Text style={styles.participantInitial}>
                  {p.userName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{p.userName}</Text>
                <Text style={styles.participantBet}>
                  {p.homeScore !== undefined
                    ? `Palpite: ${p.homeScore} × ${p.awayScore}`
                    : 'Sem palpite ainda'}
                </Text>
              </View>
              <View style={[styles.paidBadge, p.hasPaid ? styles.paidBadgeOk : styles.paidBadgePending]}>
                <Ionicons
                  name={p.hasPaid ? 'checkmark-circle' : 'time-outline'}
                  size={14}
                  color={p.hasPaid ? colors.success : colors.warning}
                />
                <Text style={[styles.paidText, { color: p.hasPaid ? colors.success : colors.warning }]}>
                  {p.hasPaid ? 'Pago' : 'Pendente'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 60 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    marginTop: 8,
  },
  topTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  prizeCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.gold + '44',
    gap: 12,
  },
  prizeMain: { alignItems: 'center' },
  prizeLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  prizeValue: { color: colors.gold, fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  prizeSub: { color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' },
  prizeProjection: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectionLabel: { color: colors.textMuted, fontSize: 12 },
  projectionValue: { color: colors.secondary, fontSize: 14, fontWeight: '800' },
  inviteCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  inviteTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    paddingHorizontal: 16,
  },
  codeText: {
    color: colors.secondary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
  },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  shareBtn: { marginTop: 0 },
  myActions: { gap: 10, marginBottom: 16 },
  pixBtn: {},
  myBetCard: {
    backgroundColor: colors.primary + '1A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  myBetLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  myBetScore: { color: colors.text, fontSize: 22, fontWeight: '900' },
  editBet: { color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: 8 },
  section: { marginTop: 8 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  noPart: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  noPartText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantInitial: { color: '#fff', fontSize: 16, fontWeight: '800' },
  participantInfo: { flex: 1 },
  participantName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  participantBet: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paidBadgeOk: { backgroundColor: colors.success + '1A' },
  paidBadgePending: { backgroundColor: colors.warning + '1A' },
  paidText: { fontSize: 11, fontWeight: '700' },
});
