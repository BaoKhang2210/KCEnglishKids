import type { ReactNode } from 'react';
import '../styles/storybook.css';

export type StorySceneName = 'classroom' | 'family' | 'adventure' | 'rest' | 'celebration' | 'studio';

export function StoryBackdrop({ scene }: { scene: StorySceneName }) {
  return (
    <div
      aria-hidden="true"
      className="story-backdrop"
      data-scene={scene}
      style={{ backgroundImage: `url("/images/storybook/${scene}-v1.webp")` }}
    />
  );
}

export function StoryBanner({
  scene,
  title,
  eyebrow,
  children,
  compact = false
}: {
  scene: StorySceneName;
  title: string;
  eyebrow?: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={`story-surface story-banner ${compact ? 'is-compact' : ''}`}>
      {/* Soft atmospheric ambient background of the scene */}
      <div
        aria-hidden="true"
        className="story-banner-ambient"
        style={{ backgroundImage: `url("/images/storybook/${scene}-v1.webp")` }}
      />
      {/* Content copy */}
      <div className="story-banner-copy">
        {eyebrow && <p className="story-eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {children}
      </div>
      {/* Full illustration showcase: 100% of scene details visible, uncropped */}
      <div className="story-banner-art-wrap">
        <img
          src={`/images/storybook/${scene}-v1.webp`}
          alt={title}
          className="story-banner-art"
          loading="lazy"
        />
      </div>
    </section>
  );
}

export function WorkspaceStoryArt({ scene, admin = false }: { scene: StorySceneName; admin?: boolean }) {
  return (
    <div className="story-surface workspace-story-art no-print">
      <div
        aria-hidden="true"
        className="story-banner-ambient"
        style={{ backgroundImage: `url("/images/storybook/${scene}-v1.webp")` }}
      />
      <div className="workspace-story-copy">
        <strong>{admin ? 'Chuẩn bị một môi trường học tập đầy cảm hứng' : 'Mỗi giờ học, một bước tiến nhỏ'}</strong>
        <p>{admin ? 'Học liệu rõ ràng, hoạt động vừa sức và sự đồng hành của thầy cô.' : 'Cùng chơi, quan sát và khích lệ điều bé đã cố gắng.'}</p>
      </div>
      <div className="story-banner-art-wrap">
        <img
          src={`/images/storybook/${scene}-v1.webp`}
          alt=""
          className="story-banner-art"
          loading="lazy"
        />
      </div>
    </div>
  );
}
