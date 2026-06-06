import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, BetAmount, Game } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useBolao } from '../../context/BolaoContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { GameCard } from '../../components/GameCard';
import { colors } from '../../theme/colors';
import { mockGames } from '../../data/games';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateBolao'>;

const BET_AMOUNTS: BetAmount[] = [20, 50, 100, 200, 500, 1000];

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR')}`;
}

export function CreateBolaoScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { createBolao } = useBolao();

  const [title, setTitle] = useState('');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [betAmount, setBetAmount] = useState<BetAmount>(50);
  const [maxParticipants, setMaxParticipants] = useState('20');
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const handleCreate = () => {
    if (!title.trim()) {
      Alert.alert('Atenção', 'Dê um nome ao seu bolão.');
      return;
    }
    if (!selectedGame) {
      Alert.alert('Atenção', 'Escolha um jogo para o bolão.');
      return;
    }
    const max = parseInt(maxParticipants);
    if (!max || max < 2 || max > 50) {
      Alert.alert('Atenção', 'O limite deve ser entre 2 e 50 participantes.');
      return;
    }
    if (hasPassword && !password.trim()) {
      Alert.alert('Atenção', 'Digite uma senha para o bolão ou desative essa opção.');
      return;
    }

    const bolao = createBolao({
      title: title.trim(),
      game: selectedGame,
      betAmount,
      maxParticipants: max,
      hasPassword,
      password: hasPassword ? password : undefined,
      creatorId: user!.id,
      creatorName: user!.name,
    });

    navigation.replace('BolaoDetail', { bolaoId: bolao.id });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Criar Bolão</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progresso */}
      <View style={styles.steps}>
        {[1, 2, 3].map(s => (
          <View key={s} style={styles.stepRow}>
            <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
              {step > s ? (
                <Ionicons name="checkmark" size={12} color="#fff" />
              ) : (
                <Text style={styles.stepNum}>{s}</Text>
              )}
            </View>
            {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
          </View>
        ))}
      </View>

      {/* Step 1: Nome e Jogo */}
      {step === 1 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Nome do Bolão</Text>
          <Input
            placeholder='Ex: "Bolão dos Amigos da Firma"'
            value={title}
            onChangeText={setTitle}
            icon="trophy-outline"
          />

          <Text style={[styles.stepTitle, { marginTop: 24 }]}>Escolha o Jogo</Text>
          <Text style={styles.stepSub}>Selecione qual jogo da Copa será o bolão</Text>

          {mockGames.filter(g => g.status === 'upcoming').map(game => (
            <GameCard
              key={game.id}
              game={game}
              selected={selectedGame?.id === game.id}
              onPress={() => setSelectedGame(game)}
            />
          ))}

          <Button
            title="Próximo"
            onPress={() => {
              if (!title.trim() || !selectedGame) {
                Alert.alert('Atenção', 'Preencha o nome e escolha um jogo.');
                return;
              }
              setStep(2);
            }}
            style={styles.nextBtn}
          />
        </View>
      )}

      {/* Step 2: Valor e Participantes */}
      {step === 2 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Valor da Aposta</Text>
          <Text style={styles.stepSub}>Cada participante paga esse valor via Pix</Text>

          <View style={styles.amountsGrid}>
            {BET_AMOUNTS.map(amount => (
              <TouchableOpacity
                key={amount}
                style={[styles.amountBtn, betAmount === amount && styles.amountBtnSelected]}
                onPress={() => setBetAmount(amount)}
                activeOpacity={0.8}
              >
                <Text style={[styles.amountText, betAmount === amount && styles.amountTextSelected]}>
                  {formatCurrency(amount)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.prizePreview}>
            <Ionicons name="trophy" size={20} color={colors.gold} />
            <Text style={styles.prizePreviewText}>
              Com 10 participantes → prêmio de{' '}
              <Text style={styles.prizeValue}>
                {formatCurrency(betAmount * 10 * 0.9)}
              </Text>{' '}
              (após 10% do app)
            </Text>
          </View>

          <Text style={[styles.stepTitle, { marginTop: 24 }]}>Limite de Participantes</Text>
          <Text style={styles.stepSub}>Máximo 50 para manter privacidade</Text>
          <Input
            placeholder="Ex: 15"
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            keyboardType="numeric"
            icon="people-outline"
          />

          <View style={styles.passwordRow}>
            <View style={styles.passwordInfo}>
              <Text style={styles.passwordLabel}>Proteger com senha</Text>
              <Text style={styles.passwordSub}>Só entra quem souber a senha</Text>
            </View>
            <Switch
              value={hasPassword}
              onValueChange={setHasPassword}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={hasPassword ? colors.secondary : '#888'}
            />
          </View>

          {hasPassword && (
            <Input
              placeholder="Senha do bolão"
              value={password}
              onChangeText={setPassword}
              isPassword
              icon="lock-closed-outline"
            />
          )}

          <View style={styles.btnRow}>
            <Button title="Voltar" onPress={() => setStep(1)} variant="outline" style={styles.halfBtn} />
            <Button title="Próximo" onPress={() => setStep(3)} style={styles.halfBtn} />
          </View>
        </View>
      )}

      {/* Step 3: Confirmação */}
      {step === 3 && selectedGame && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Confirmar Bolão</Text>
          <Text style={styles.stepSub}>Revise os detalhes antes de criar</Text>

          <View style={styles.summaryCard}>
            <SummaryRow icon="trophy-outline" label="Nome" value={title} />
            <SummaryRow
              icon="football-outline"
              label="Jogo"
              value={`${selectedGame.homeTeam.flag} ${selectedGame.homeTeam.code} x ${selectedGame.awayTeam.code} ${selectedGame.awayTeam.flag}`}
            />
            <SummaryRow icon="cash-outline" label="Valor da aposta" value={formatCurrency(betAmount)} />
            <SummaryRow icon="people-outline" label="Máx. participantes" value={`${maxParticipants} pessoas`} />
            <SummaryRow icon="lock-closed-outline" label="Senha" value={hasPassword ? '✅ Sim' : '🔓 Sem senha'} />
            <SummaryRow icon="pie-chart-outline" label="Taxa do app" value="10% do prêmio total" />
          </View>

          <View style={styles.btnRow}>
            <Button title="Voltar" onPress={() => setStep(2)} variant="outline" style={styles.halfBtn} />
            <Button title="Criar Bolão 🚀" onPress={handleCreate} style={styles.halfBtn} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function SummaryRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryIconWrapper}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.summaryText}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 60 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    marginTop: 8,
  },
  topTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepNum: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  stepLine: { width: 40, height: 2, backgroundColor: colors.border },
  stepLineActive: { backgroundColor: colors.primary },
  stepContent: { gap: 0 },
  stepTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  stepSub: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 16,
  },
  amountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  amountBtn: {
    width: '30%',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amountBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  amountText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  amountTextSelected: { color: '#fff' },
  prizePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 8,
  },
  prizePreviewText: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  prizeValue: {
    color: colors.gold,
    fontWeight: '800',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordInfo: { flex: 1 },
  passwordLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  passwordSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  nextBtn: { marginTop: 24 },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  halfBtn: { flex: 1 },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: { flex: 1 },
  summaryLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  summaryValue: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 1 },
});
