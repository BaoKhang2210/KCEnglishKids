export interface GameVisual {
  icon: string;
  card: string;
  art: string;
}

export const GAME_VISUALS: Record<string, GameVisual> = {
  LISTEN_CHOOSE: { icon: '👂', card: 'bg-gradient-to-br from-sky-700 to-blue-950', art: 'bg-sky-300/15' },
  COLOR_RECOGNITION: { icon: '🎨', card: 'bg-gradient-to-br from-rose-700 to-fuchsia-950', art: 'bg-pink-300/15' },
  TAP_PICTURE: { icon: '👆', card: 'bg-gradient-to-br from-cyan-700 to-teal-950', art: 'bg-cyan-300/15' },
  BUBBLE_POP: { icon: '🫧', card: 'bg-gradient-to-br from-fuchsia-700 to-purple-950', art: 'bg-fuchsia-300/15' },
  ANIMAL_SOUND: { icon: '🐾', card: 'bg-gradient-to-br from-emerald-700 to-green-950', art: 'bg-emerald-300/15' },
  IMAGE_WORD_MATCH: { icon: '🧩', card: 'bg-gradient-to-br from-indigo-700 to-blue-950', art: 'bg-indigo-300/15' },
  COUNT_OBJECTS: { icon: '🔢', card: 'bg-gradient-to-br from-amber-600 to-orange-950', art: 'bg-amber-200/15' },
  MISSING_OBJECT: { icon: '❔', card: 'bg-gradient-to-br from-violet-700 to-indigo-950', art: 'bg-violet-300/15' },
  MEMORY_CARD: { icon: '🃏', card: 'bg-gradient-to-br from-pink-700 to-rose-950', art: 'bg-pink-300/15' },
  STAR_CATCHER: { icon: '🌠', card: 'bg-gradient-to-br from-blue-700 to-indigo-950', art: 'bg-blue-200/15' },
  FEED_ANIMAL: { icon: '🧸', card: 'bg-gradient-to-br from-lime-700 to-emerald-950', art: 'bg-lime-200/15' },
  TRUE_FALSE: { icon: '⚖️', card: 'bg-gradient-to-br from-orange-700 to-rose-950', art: 'bg-orange-200/15' },
  DRAG_DROP: { icon: '🖐️', card: 'bg-gradient-to-br from-teal-700 to-cyan-950', art: 'bg-teal-200/15' },
  FIND_OBJECT: { icon: '🔎', card: 'bg-gradient-to-br from-green-700 to-teal-950', art: 'bg-green-200/15' },
  CLASSIFICATION: { icon: '🗂️', card: 'bg-gradient-to-br from-purple-700 to-fuchsia-950', art: 'bg-purple-200/15' },
  LISTEN_REPEAT: { icon: '🔊', card: 'bg-gradient-to-br from-blue-700 to-cyan-950', art: 'bg-blue-200/15' },
  MATCHING: { icon: '🧩', card: 'bg-gradient-to-br from-violet-700 to-purple-950', art: 'bg-violet-200/15' },
  MEMORY: { icon: '🧠', card: 'bg-gradient-to-br from-rose-700 to-orange-950', art: 'bg-rose-200/15' },
  DEFAULT: { icon: '🎮', card: 'bg-gradient-to-br from-slate-700 to-slate-950', art: 'bg-slate-300/15' }
};
