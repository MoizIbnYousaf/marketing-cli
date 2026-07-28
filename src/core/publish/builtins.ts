// mktg — Built-in publish adapter name list (no adapter implementations).
// Shared by registry + catalogs so collision detection stays cycle-free.

export const BUILTIN_PUBLISH_ADAPTERS = ["mktg-native", "typefully", "resend", "file"] as const;
