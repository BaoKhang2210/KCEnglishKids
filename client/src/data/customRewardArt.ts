import { badgeArtwork } from './badgeArtwork';
/** Original transparent illustrations generated for KCEnglishKids. */
const stickerArt: Record<string, string> = {
  '\u{1F981}': 'lion', '\u{1F42F}': 'tiger', '\u{1F43C}': 'panda',
  '\u{1F680}': 'rocket', '\u{1F3C6}': 'trophy', '\u{1F308}': 'rainbow',
  '\u{2B50}': 'star', '\u{1F984}': 'unicorn', '\u{1F996}': 'dino',
  '\u{1F34E}': 'apple', '\u{1F3A8}': 'artist', '\u{1F42C}': 'dolphin',
  '\u{1F451}': 'crown', '\u{1F388}': 'balloon', '\u{1F353}': 'strawberry',
};
export function customRewardArt(key: string) {
  if (badgeArtwork[key]) return badgeArtwork[key];
  const name = stickerArt[key];
  return name ? `/images/rewards/koko-friends-v1/${name}.png` : undefined;
}
