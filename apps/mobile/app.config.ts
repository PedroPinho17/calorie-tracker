import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Estende o app.json com o que depende do tipo de build.
 *
 * HTTP sem encriptação (cleartext) só é permitido fora de produção, para poderes falar com a
 * API no PC (http://192.168.x.x:3001) durante o desenvolvimento. O build de produção só fala
 * HTTPS — senão o token de sessão e as fotos iriam em claro pela rede.
 * O EAS define EAS_BUILD_PROFILE durante o build (development / preview / production).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const isProduction = process.env.EAS_BUILD_PROFILE === 'production';
  return {
    ...config,
    name: config.name ?? 'Calorie Tracker',
    slug: config.slug ?? 'mobile',
    plugins: [
      ...(config.plugins ?? []),
      ['expo-build-properties', { android: { usesCleartextTraffic: !isProduction } }],
    ],
  };
};
