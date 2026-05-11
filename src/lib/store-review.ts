export async function requestReviewIfAvailable(): Promise<void> {
  try {
    const { isAvailableAsync, requestReview } =
      await import('expo-store-review');
    if (await isAvailableAsync()) {
      await requestReview();
    }
  } catch {
    // Not available in Expo Go or simulator
  }
}
