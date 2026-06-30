import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  const { t, ...serializableLocalization } = locals.localization;

  return {
    user: locals.user,
    localization: serializableLocalization,
  };
};
