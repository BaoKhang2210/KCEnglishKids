# Koko Friends reward illustrations

Original artwork created for KCEnglishKids with the built-in imagegen tool.
The application uses actual transparent PNG illustrations, not operating-system emoji.

- 15 sticker illustrations: lion, tiger, panda, rocket, trophy, rainbow, star,
  unicorn, dinosaur, apple, artist palette, dolphin, crown, balloons, strawberry.
- The initial 6 achievement medal illustrations are now assigned to individual badges.
  The v2 collection adds 19 distinct illustrations, so all 25 achievements have their
  own artwork. See `reward-art-v2.md` and `client/src/data/badgeArtwork.ts`.
- Production images: `client/public/images/rewards/koko-friends-v1/*.png`.
- Exact successful prompts and original image paths: `prompts.json` in that directory.
- Artwork is packaged at 512 × 512 with RGBA transparency. Original generated files
  remain at the paths reported by imagegen. Packaging script:
  `client/scripts/package-custom-rewards.ps1`.

Art direction: original friendly characters and enamel achievement medals, soft
sculpted clay-toy / plush-like 3D forms, warm lighting, amber, cream, sage, teal,
peach and lavender colors, clear silhouettes, no text or logos.

Microsoft Fluent Emoji remains the fallback source for other reward symbols.
Its existing MIT license is retained in `public/images/rewards/fluent-3d/LICENSE.txt`.
