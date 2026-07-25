// ============================================================================
// RealEquityIQ — worldMapAsset
//
// v2: switched from a base64-embedded data URI to a plain public/ static file
// path. The previous version of this module embedded the old SVG-winding-
// path background directly as base64 in this JS file — that pattern made
// sense for a small painted asset, but this production Promenade image is a
// 1536x1024 photorealistic PNG (~3.4MB source). Base64-embedding it here
// would have inflated it to ~4.5MB of inline JS (parsed/evaluated as code,
// never cached as an image, blocking JS bundle parse) — exactly the problem
// already solved for the completion outcome images (wait-save-complete.webp
// etc.), which live in public/ as plain static files for the same reason.
//
// This change is safe and requires NO changes to journeyWorldKit.jsx or
// JourneyMap.jsx: both only ever use WORLD_MAP_DATA_URI as a string handed
// to an <image href={...}> (see WorldBackdrop in journeyWorldKit.jsx) — a
// root-relative path string works identically to a data URI there.
//
// Production file: drop promenade-background.webp into app/public/ (same
// naming-stability convention as every other environment asset — swap file
// CONTENTS later, never this path, per the Design System Guide 4.1).
//
// FLAG FOR DESIGN: the production Promenade image supplied is 1536x1024px.
// The Design System Guide's established spec for environment backgrounds is
// 2400–3200px wide (section 4.2, "Dimensions & Format"). This file is below
// that minimum — likely fine on standard displays, but worth knowing before
// it's viewed on a larger screen or panned/zoomed, where the shortfall would
// show as softness rather than a crisp render.
// ============================================================================

export const WORLD_MAP_DATA_URI = '/promenade-background.webp';