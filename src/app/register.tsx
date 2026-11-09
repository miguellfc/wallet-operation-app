import { Redirect, router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthLayout } from '@/components/ui/auth-layout';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { login, register, registerErrorMessage } from '@/features/auth/auth-api';
import { saveSession, useSession } from '@/features/auth/session';
import type { Currency } from '@/features/currencies/currency-api';
import { CurrencySheet } from '@/features/currencies/currency-sheet';
import { colors, typography } from '@/theme';

const goToLogin = () => (router.canGoBack() ? router.back() : router.replace('/login'));

export default function RegisterScreen() {
  const session = useSession();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState<Currency | null>(null);
  const [pickingCurrency, setPickingCurrency] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) return <Redirect href={'/' as Href} />;

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim() || !nickname.trim() || !password || !currency) {
      setError('Completa todos los campos');
      return;
    }
    if (password.length < 8 || password.length > 72) {
      setError('La contraseña debe tener entre 8 y 72 caracteres');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname.trim(),
        password,
        currency: currency.code,
        type: currency.type,
      });
    } catch (e) {
      setError(registerErrorMessage(e));
      setLoading(false);
      return;
    }
    try {
      await saveSession(await login(nickname.trim(), password));
    } catch {
      router.replace('/login');
    }
  };

  return (
    <AuthLayout
      title={'Crea tu cuenta\nen Cashen'}
      footerPrompt="¿Ya tienes cuenta?"
      footerAction="Inicia sesión"
      onFooterPress={goToLogin}>
      <View style={styles.form}>
        <TextField
          label="Nombre"
          value={firstName}
          onChangeText={setFirstName}
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="next"
        />
        <TextField
          label="Apellidos"
          value={lastName}
          onChangeText={setLastName}
          autoComplete="family-name"
          textContentType="familyName"
          returnKeyType="next"
        />
        <TextField
          label="Nombre de usuario"
          value={nickname}
          onChangeText={setNickname}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username-new"
          textContentType="username"
          returnKeyType="next"
        />
        <TextField
          label="Contraseña"
          secure
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <SelectField
          label="Moneda principal"
          value={currency ? `${currency.code} · ${currency.currency}` : undefined}
          placeholder="Elige una moneda"
          onPress={() => setPickingCurrency(true)}
        />
        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
      </View>
      <Button label="Crear cuenta" onPress={submit} loading={loading} />
      <CurrencySheet
        visible={pickingCurrency}
        selected={currency}
        onSelect={setCurrency}
        onClose={() => setPickingCurrency(false)}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12, marginBottom: 22 },
  error: { ...typography.bodyMedium, color: colors.error },
});
