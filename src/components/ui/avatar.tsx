import type { ReactElement } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text } from 'react-native';

// Muted, premium gradient pairs — never bright or neon
const GRADIENTS: [string, string][] = [
  ['#2A5C55', '#1B3D39'], // deep teal
  ['#2C4A6B', '#1A2E45'], // steel navy
  ['#5C3D2E', '#3A2219'], // warm walnut
  ['#3A5C35', '#243B21'], // forest
  ['#4A3572', '#2E2148'], // plum
  ['#6B5B2A', '#443918'], // amber
  ['#4A2A3A', '#2E1A24'], // burgundy
  ['#2A4A6B', '#192E43'], // slate
];

const gradientFor = (seed: string): [string, string] => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
};

const initials = (name: string): string =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

type AvatarProps = {
  name: string;
  imageUrl?: string | null;
  size?: number;
};

export function Avatar({
  name,
  imageUrl,
  size = 44,
}: AvatarProps): ReactElement {
  const radius = size / 2;
  const fontSize = size * 0.36;
  const [colorA, colorB] = gradientFor(name);

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[
          styles.img,
          { width: size, height: size, borderRadius: radius },
        ]}
      />
    );
  }

  return (
    <LinearGradient
      colors={[colorA, colorB]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[
        styles.gradient,
        { width: size, height: size, borderRadius: radius },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials(name)}</Text>
    </LinearGradient>
  );
}

// Larger variant for sheets and profile header
export function AvatarLarge({
  name,
  imageUrl,
  size = 72,
}: AvatarProps): ReactElement {
  return <Avatar name={name} imageUrl={imageUrl} size={size} />;
}

const styles = StyleSheet.create({
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  img: {
    resizeMode: 'cover',
  },
});
