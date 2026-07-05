import { useFonts } from 'expo-font';
import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';

/**
 * Rally's webfonts are Google Fonts stand-ins (see tokens/fonts.css in the
 * design system export — no licensed brand font files were provided):
 * Bricolage Grotesque (display), Figtree (body), Space Mono (coordinates/time).
 */
export function useRallyFonts() {
  return useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });
}
