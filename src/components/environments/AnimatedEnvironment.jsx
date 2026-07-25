import './environmentAnimations.css';

// Steam/curtain/tree overlays removed -- see environmentAnimations.css for
// why. This now just renders the photo with the shared room-pan animation;
// there's no per-scene coordinate data left to pass in at all.
export default function AnimatedEnvironment({ image }) {
  return (
    <div className="env-stage">
      <div
        className="env-photo"
        style={{ backgroundImage: `url(${image})` }}
      />
    </div>
  );
}

// Usage:
//   import { sceneConfig } from './sceneConfig';
//   <AnimatedEnvironment {...sceneConfig['env-hh-close']} />