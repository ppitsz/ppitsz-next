import type { MemberFields, ProfileFields } from "@ppitsz/accounts/fields"

/** A profile as the account app's forms edit it: every field a string. */
export type ProfileValues = ProfileFields & { birthday: string; cohortYear: string }

/** The form values for a stored profile. */
export function profileValues(profile: ProfileFields & MemberFields): ProfileValues {
  return {
    name: profile.name,
    wechatId: profile.wechatId,
    phone: profile.phone,
    birthday: profile.birthday,
    cohortYear: profile.cohortYear === null ? "" : String(profile.cohortYear),
  }
}
