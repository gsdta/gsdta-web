// Mapping from our native form fields to Google Form entry IDs.
// Update these values to the actual entry IDs from your Google Form.
// Tips to find entry IDs:
// 1) In Google Forms, use "Get pre-filled link", fill sample values, submit, and
//    copy the generated link – it will include parameters like entry.123456789.
// 2) Or view the page source of the public form and search for "entry."

export const GOOGLE_FORM_ID = process.env.NEXT_PUBLIC_GOOGLE_FORM_ID || "1FAIpQLSdroKw_dnEwZmr3BrUxe-99ywJbScr-QTkhl98HUiAMzDC6Ng";

export const ENTRY_IDS = {
  // Student details
  studentName: "entry.395597549",
  studentDob: {
    year: "entry.1132950128_year",
    month: "entry.1132950128_month",
    day: "entry.1132950128_day",
  },
  studentGender: "entry.1365265699",

  // School info
  currentPublicSchool: "entry.1377185989",
  // In Google Forms this field is a checkbox group; our UI collects a single selection.
  // For "Other", we submit "__other_option__" and include schoolDistrictOther below.
  schoolDistrict: "entry.679475149",
  schoolDistrictOther: "entry.679475149.other_option_response", // free-text when selecting Other
  currentPublicGrade: "entry.1853708091",
  lastTamilGrade: "entry.93236727",
  enrollingTamilGrade: "entry.991283256",

  // Mother info
  motherName: "entry.720700810",
  motherEmail: "entry.760216111",
  motherMobile: "entry.1944742832",
  motherEmployer: "entry.197972862", // optional

  // Father info
  fatherName: "entry.1554073196",
  fatherEmail: "entry.970280295",
  fatherMobile: "entry.385289357",
  fatherEmployer: "entry.933196968", // optional

  // Address
  homeStreet: "entry.359377429",
  homeCity: "entry.1075116796",
  homeZip: "entry.2116505181",
} as const;
