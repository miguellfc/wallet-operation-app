import { Redirect, router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthLayout } from '@/components/ui/auth-layout';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { login, loginErrorMessage } from '@/features/auth/auth-api';
import { saveSession, useSession } from '@/features/auth/session';
import { colors, typography } from '@/theme';

export default function LoginScreen() {
  const session = useSession();
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) return <Redirect href={'/' as Href} />;

  const submit = async () => {
    if (!nickname.trim() || !password) {
      setError('Escribe tu nombre de usuario y tu contraseña');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await saveSession(await login(nickname.trim(), password));
    } catch (e) {
      setError(loginErrorMessage(e));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={'Bienvenido\na Cashen'}
      footerPrompt="¿No tienes cuenta?"
      footerAction="Regístrate"
      onFooterPress={() => router.push('/register')}>
      <View style={styles.form}>
        <TextField
          label="Nombre de usuario"
          value={nickname}
          onChangeText={setNickname}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
        />
        <TextField
          label="Contraseña"
          secure
          value={password}
          onChangeText={setPassword}
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
      </View>
      <Button label="Iniciar sesión" onPress={submit} loading={loading} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10, marginBottom: 31 },
  error: { ...typography.bodyMedium, color: colors.error },
});
