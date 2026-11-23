import { Redirect, type Href } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AuthLayout } from '@/components/ui/auth-layout';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { saveLocalProfile, useLocalProfile } from '@/features/auth/local-profile';
import type { Currency } from '@/features/currencies/currency-api';
import { CurrencySheet } from '@/features/currencies/currency-sheet';
import { isLocal } from '@/lib/data-source';
import { colors, themedStyles, typography } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';

export default function WelcomeScreen() {
  useThemeName();
  const profile = useLocalProfile();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [currency, setCurrency] = useState<Currency | null>(null);
  const [pickingCurrency, setPickingCurrency] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isLocal) return <Redirect href="/login" />;
  if (profile) return <Redirect href={'/' as Href} />;

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim() || !currency) {
      setError('Completa todos los campos');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await saveLocalProfile({ firstName: firstName.trim(), lastName: lastName.trim(), currency });
    } catch {
      setError('No se pudo guardar tu perfil. Inténtalo de nuevo');
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={'Te damos la\nbienvenida a Cashen'}>
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
      <Button label="Empezar" onPress={submit} loading={loading} />
      <CurrencySheet
        visible={pickingCurrency}
        selected={currency}
        onSelect={setCurrency}
        onClose={() => setPickingCurrency(false)}
      />
    </AuthLayout>
  );
}

const styles = themedStyles(() => ({
  form: { gap: 12, marginBottom: 22 },
  error: { ...typography.bodyMedium, color: colors.error },
}));
