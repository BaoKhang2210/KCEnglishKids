# Individual achievement badge artwork

All 25 achievements now select an illustration by badge ID. No two badges share
an image, including badges with the same requirement type.

The collection retains 6 original illustrations, each for a single achievement,
and adds 19 original transparent illustrations generated with the built-in imagegen
tool. Subjects and frames vary: duckling footprints, backpack, fox explorer,
studying rabbit, turtle steps, reading owl, globe and butterfly, lion king,
star seedling, star astronaut, sunrise, honeybee, calendar bear, volcano,
kitten target, squirrel puzzle, penguin summit, golden hands, and globe ambassador.
Bronze, silver, gold and iridescent finishes follow the existing tier labels.

- Selection: `client/src/data/badgeArtwork.ts`
- New images: `client/public/images/rewards/koko-badges-v2/*.png`
- Exact successful prompts and original paths: `prompts.json` in that directory
- Preview: `docs/badge-art-v2-preview.png`
- Packaging: `client/scripts/package-custom-rewards.ps1` with `-Manifest` and `-AssetRoot`
- Preview generation: `client/scripts/preview-badge-art.ps1`

Assets are 512px RGBA PNGs with transparent backgrounds. The frontend test checks
coverage, image format and unique image hashes for all achievements. Existing
names, reward IDs, thresholds and unlock logic are preserved.
