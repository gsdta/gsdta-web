export type TextbookResourceKind = "textbook" | "homework" | "mixed";

export type TextbookResource = {
  id: string;
  label: string;
  googleDriveId: string;
  kind?: TextbookResourceKind;
};

export type TextbookGrade = {
  id: string;
  label: string;
  buttonColumns: 1 | 2;
  resources: TextbookResource[];
};

export const TEXTBOOKS: TextbookGrade[] = [
  {
    id: "ps-1",
    label: "PS-1",
    buttonColumns: 1,
    resources: [
      {
        id: "ps-1-mazhalai-sem-1-textbook",
        label: "Mazhalai - Semester 1: Text Book",
        googleDriveId: "1YouxSeNJR5_LSMHF3melf2B8J5d5fEEC",
      },
    ],
  },
  {
    id: "ps-2",
    label: "PS-2",
    buttonColumns: 1,
    resources: [
      {
        id: "ps-2-mazhalai-sem-2-textbook",
        label: "Mazhalai - Semester 2: Text Book",
        googleDriveId: "1_NTwYHn035lKfENsI6flvptyRf3DTmLG",
      },
      {
        id: "ps-2-mazhalai-sem-3-textbook",
        label: "Mazhalai - Semester 3: Text Book",
        googleDriveId: "10P6MYz7viC78dxUrHoE4qHvrrnHg38Uv",
      },
    ],
  },
  {
    id: "kg",
    label: "KG",
    buttonColumns: 2,
    resources: [
      {
        id: "kg-basic-1-sem-1-textbook",
        label: "Basic-1 Semester 1: Text Book",
        googleDriveId: "1ZBMvgrsY4fCPLUe_1eyKbSamhPgT4qXT",
      },
      {
        id: "kg-basic-1-sem-1-homework",
        label: "Basic-1 Semester 1: Home Work",
        googleDriveId: "1l-Al-Cf04qJdxnXkZJ63GmlnDjQxKqjx",
        kind: "homework",
      },
      {
        id: "kg-basic-1-sem-2-textbook",
        label: "Basic-1 Semester 2: Text Book",
        googleDriveId: "1bvS68kyzNxFRTAV97w90n0Db9vAbY1jo",
      },
      {
        id: "kg-basic-1-sem-2-homework",
        label: "Basic-1 Semester 2: Home Work",
        googleDriveId: "16cGgpzc4oI36hV4SkfLU_s7GOpCOCARj",
        kind: "homework",
      },
      {
        id: "kg-basic-1-sem-3-textbook",
        label: "Basic-1 Semester 3: Text Book",
        googleDriveId: "1RtgMHibMrkqcGm96IPzY6v8yxGzTq0Ug",
      },
      {
        id: "kg-basic-1-sem-3-homework",
        label: "Basic-1 Semester 3: Home Work",
        googleDriveId: "1vDGpEf8PeD4j0-HzFbiuhslirrbRJDMl",
        kind: "homework",
      },
    ],
  },
  {
    id: "grade-1",
    label: "Grade-1",
    buttonColumns: 2,
    resources: [
      {
        id: "grade-1-basic-2-sem-1-textbook",
        label: "Basic-2 - Semester 1: Text Book",
        googleDriveId: "1SkkL18KmcpDPlkAjkaXyAdz0DREFnwc1",
      },
      {
        id: "grade-1-basic-2-sem-1-homework",
        label: "Basic-2 - Semester 1: Home Work",
        googleDriveId: "1JVlNIK8tEIM5FGr0TPazvsnalBGNodi6",
        kind: "homework",
      },
      {
        id: "grade-1-basic-2-sem-2-textbook",
        label: "Basic-2 - Semester 2: Text Book",
        googleDriveId: "1xFN4joO6VYzzvvyWzpk88Kr7vkTHHP63",
      },
      {
        id: "grade-1-basic-2-sem-2-homework",
        label: "Basic-2 - Semester 2: Home Work",
        googleDriveId: "1zeZ4Di55GoizmQ7CfKYp76Xml6Oy23nt",
        kind: "homework",
      },
      {
        id: "grade-1-basic-2-sem-3-textbook",
        label: "Basic-2 - Semester 3: Text Book",
        googleDriveId: "18vkM1bS4r2CAhO6HZ638x8i0-pjeEKd6",
      },
      {
        id: "grade-1-basic-2-sem-3-homework",
        label: "Basic-2 - Semester 3: Home Work",
        googleDriveId: "130csynqZwjDWor4w1aKMkefNrIhJW-0g",
        kind: "homework",
      },
    ],
  },
  {
    id: "grade-2",
    label: "Grade-2",
    buttonColumns: 2,
    resources: [
      {
        id: "grade-2-basic-2-sem-3-textbook",
        label: "Basic-2 - Semester 3: Text Book",
        googleDriveId: "18vkM1bS4r2CAhO6HZ638x8i0-pjeEKd6",
      },
      {
        id: "grade-2-basic-2-sem-3-homework",
        label: "Basic-2 - Semester 3: Home Work",
        googleDriveId: "130csynqZwjDWor4w1aKMkefNrIhJW-0g",
        kind: "homework",
      },
      {
        id: "grade-2-basic-3-sem-1-textbook",
        label: "Basic-3 - Semester 1: Text Book",
        googleDriveId: "1b6Ek6f-4U5hDrAxV1nB5PUjz2SPsfQ5U",
      },
      {
        id: "grade-2-basic-3-sem-1-homework",
        label: "Basic-3 - Semester 1: Home Work",
        googleDriveId: "1ZNVezMiMB5fLlyvB0hfqo6Gz-SKTWtHP",
        kind: "homework",
      },
    ],
  },
  {
    id: "grade-3",
    label: "Grade-3",
    buttonColumns: 2,
    resources: [
      {
        id: "grade-3-basic-3-sem-3-textbook",
        label: "Basic-3 - Semester 3: Text Book",
        googleDriveId: "1aIUxVg1fDZCyiRdATL1R4A6eXwoq5-Qf",
      },
      {
        id: "grade-3-basic-3-sem-3-homework",
        label: "Basic-3 - Semester 3: Home Work",
        googleDriveId: "1wHYP5QM5bm662TKlOdK9aeG1af27XVPb",
        kind: "homework",
      },
      {
        id: "grade-3-unit-1-textbook",
        label: "Unit 1: Text Book",
        googleDriveId: "18qW8du9JUPqlWtgL4rb0onSVwWYsazQS",
      },
      {
        id: "grade-3-unit-1-homework",
        label: "Unit 1: Home Work",
        googleDriveId: "1ekl8AeKJ3JlZTo7BiBVbimlyC7zJYmOD",
        kind: "homework",
      },
    ],
  },
  {
    id: "grade-4",
    label: "Grade-4",
    buttonColumns: 2,
    resources: [
      {
        id: "grade-4-unit-3-textbook",
        label: "Unit 3: Text Book",
        googleDriveId: "10NmzsppknS8ycIfq4Vxcgi6f4Hv9xH-J",
      },
      {
        id: "grade-4-unit-3-homework",
        label: "Unit 3: Home Work",
        googleDriveId: "1aStvQzxlQLQhJw0_WcReGsQRdEig46CS",
        kind: "homework",
      },
      {
        id: "grade-4-unit-4-textbook",
        label: "Unit 4: Text Book",
        googleDriveId: "1PV8TYq5q3ozL3A8cOSJQ-UJk0-MoOe1B",
      },
      {
        id: "grade-4-unit-4-homework",
        label: "Unit 4: Home Work",
        googleDriveId: "1gMip2L_ymI6PUBhhJXl5e1mSP63IwnYX",
        kind: "homework",
      },
    ],
  },
  {
    id: "grade-5",
    label: "Grade-5",
    buttonColumns: 2,
    resources: [
      {
        id: "grade-5-unit-6-textbook",
        label: "Unit 6: Text Book",
        googleDriveId: "1c4sDloPXtFzzSr12NepGOYAgHJk7I_vF",
      },
      {
        id: "grade-5-unit-6-homework",
        label: "Unit 6: Home Work",
        googleDriveId: "1hEzMtu6AOJ7FzLjviQUV39tVATTiUPpu",
        kind: "homework",
      },
      {
        id: "grade-5-unit-7-textbook",
        label: "Unit 7: Text Book",
        googleDriveId: "1AZHmKsCldUnG2gMaY9yk3yOg9IoPoSRg",
      },
      {
        id: "grade-5-unit-7-homework",
        label: "Unit 7: Home Work",
        googleDriveId: "1EaOGnAJ90lnmtC4JCkFk2hrBD7_l0Lgy",
        kind: "homework",
      },
    ],
  },
  {
    id: "grade-6",
    label: "Grade-6",
    buttonColumns: 2,
    resources: [
      {
        id: "grade-6-unit-9-textbook",
        label: "Unit 9: Text Book",
        googleDriveId: "1K-WH0itWhqSKw24h5u6ZU96fDcHyV3sM",
      },
      {
        id: "grade-6-unit-9-homework",
        label: "Unit 9: Home Work",
        googleDriveId: "1I9oEEILm0BJY1SNPtCdt2DiD3_zf5767",
        kind: "homework",
      },
      {
        id: "grade-6-unit-10-textbook",
        label: "Unit 10: Text Book",
        googleDriveId: "1a0FALd6ejRMKFvqW-x7cYOMP2w61skUu",
      },
      {
        id: "grade-6-unit-10-homework",
        label: "Unit 10: Home Work",
        googleDriveId: "13Dr8aCAHZJctWK4GfO_DNfvcTm6XTw1s",
        kind: "homework",
      },
    ],
  },
  {
    id: "grade-7",
    label: "Grade-7",
    buttonColumns: 2,
    resources: [
      {
        id: "grade-7-unit-12-textbook",
        label: "Unit 12: Text Book",
        googleDriveId: "1f6EkGFYv3pf2PQpyvn5FbNfOsww-8j5l",
      },
      {
        id: "grade-7-unit-12-homework",
        label: "Unit 12: Home Work",
        googleDriveId: "1XRN3SHjnw0EjM0WwR4YoC65w5WYQD0L4",
        kind: "homework",
      },
      {
        id: "grade-7-unit-13-textbook",
        label: "Unit 13: Text Book",
        googleDriveId: "1pcklUThVAX5pw2iYtgFMNKCDKbhPTiPh",
      },
      {
        id: "grade-7-unit-13-homework",
        label: "Unit 13: Home Work",
        googleDriveId: "1wnwzyNU9quaKtqFJAcmboKn8f19I3-Ya",
        kind: "homework",
      },
    ],
  },
  {
    id: "grade-8",
    label: "Grade-8",
    buttonColumns: 1,
    resources: [
      {
        id: "grade-8-unit-15-textbook",
        label: "Unit 15: Text Book",
        googleDriveId: "1fdM_vYvFNNjoy3D12KZ01lPPVczr3oyC",
      },
      {
        id: "grade-8-unit-15-homework",
        label: "Unit 15: Home Work",
        googleDriveId: "1W7JnjUz3nURseHvM1Cmsux3DugeA1IgB",
        kind: "homework",
      },
      {
        id: "grade-8-unit-16-combined",
        label: "Unit 16: Text & Home Work",
        googleDriveId: "1J6GQTXsWvjJhkRaFL_NZ_6COhSEhBEma",
        kind: "mixed",
      },
    ],
  },
];

export const buildGoogleDrivePreviewUrl = (googleDriveId: string) =>
  `https://drive.google.com/file/d/${googleDriveId}/preview`;
