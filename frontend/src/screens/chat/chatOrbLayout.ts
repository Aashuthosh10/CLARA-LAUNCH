/**
 * Layout constants for ChatScreen conversational bottom chrome
 * (FAQ suggestion pills above the orb + orb dock).
 *
 * Chat-originated About Me must end ABOVE this live chrome — never cover it.
 * Prefer measuring `.full-text-orb-zone` at runtime; these values are fallbacks
 * only until the first ResizeObserver sample.
 */

export const CHAT_FAQ_PILL_MIN_HEIGHT_PX = 54;
/** `.full-text-orb-zone .faq-carousel-shell-full` margin-bottom */
export const CHAT_FAQ_SHELL_MARGIN_BOTTOM_PX = 20;
/** `.full-text-orb-zone` gap + `.chat-orb-stack-below-faq` margin-top */
export const CHAT_FAQ_TO_ORB_GAP_PX = 20;
/** Soft glow / shadow halo extending past the morph box. */
export const CHAT_ORB_GLOW_HALO_PX = 28;

export const CHAT_ORB_MORPH_BOX_PX = 200;
export const CHAT_ORB_STATUS_LABEL_PX = 36;
export const CHAT_ORB_DOCK_PADDING_BOTTOM_PX = 24;
/** Breathing room between About Me content and the FAQ strip. */
export const CHAT_ORB_CONTENT_GAP_PX = 16;

/**
 * Fallback bottom chrome height when `.full-text-orb-zone` is not yet measured.
 * Runtime layout must prefer the live measured height from ChatScreen.
 */
export const CHAT_ABOUT_ME_ORB_SAFE_INSET_PX =
  CHAT_ORB_CONTENT_GAP_PX +
  CHAT_FAQ_PILL_MIN_HEIGHT_PX +
  CHAT_FAQ_SHELL_MARGIN_BOTTOM_PX +
  CHAT_FAQ_TO_ORB_GAP_PX +
  CHAT_ORB_MORPH_BOX_PX +
  CHAT_ORB_GLOW_HALO_PX +
  CHAT_ORB_STATUS_LABEL_PX +
  CHAT_ORB_DOCK_PADDING_BOTTOM_PX;

/** CSS custom property published by ChatScreen from the live orb-zone box. */
export const CHAT_BOTTOM_CHROME_CSS_VAR = '--clara-chat-bottom-chrome';
