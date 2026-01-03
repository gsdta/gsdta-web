"use client";

import { useState, useEffect } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ENTRY_IDS } from "@/config/googleForm";

// Options derived from Google Form
const GENDERS = ["Girl", "Boy"] as const;
const SCHOOL_DISTRICTS = [
  "Poway Unified School District",
  "San Diego Unified School District",
  "San Marcos Unified School District",
  "San Dieguito Union High School District",
  "Del Mar Union School District",
  "Carlsbad Unified School District",
  "Escondido Union School District",
  "Vista Unified School District",
  "Santee School District",
  "Temecula Valley Unified School District",
  "Murrieta Valley Unified School District",
  "None",
  "Other",
] as const;
const PUBLIC_GRADES = [
  "TK","KG","Grade-1","Grade-2","Grade-3","Grade-4","Grade-5","Grade-6","Grade-7","Grade-8","Grade-9","Grade-10","Grade-11","Grade-12","Not Enrolled in School yet",
] as const;
const TAMIL_GRADES = [
  "PS-1","PS-2","KG","Advanced KG","Grade-1","Grade-2","Grade-3","Grade-4","Grade-5","Grade-6","Grade-7","Grade-8","Grade-9","Grade-10","Grade-11","Grade-12",
] as const;

// Multi-step configuration
const STEPS = ["Student", "School", "Parents", "Address"] as const;
const STORAGE_KEY = "registerForm.v1";
const STORAGE_STEP_KEY = "registerForm.step.v1";

// Validation schema
const phone10 = z
  .string()
  .regex(/^\d{10}$/,{ message: "Enter 10 digits only"});
const zipSchema = z.string().min(3, "Enter a valid zip");
const dateISO = z
  .string()
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), { message: "Select a date" });

const baseSchema = z.object({
  // Student
  studentName: z.string().min(2, "Enter student name"),
  studentDob: dateISO,
  studentGender: z.enum(GENDERS, { error: "Select gender" }),
  currentPublicSchool: z.string().min(1, "Select a school"),
  schoolDistrict: z.enum(SCHOOL_DISTRICTS, { error: "Select a district" }),
  schoolDistrictOther: z.string().optional(),
  currentPublicGrade: z.enum(PUBLIC_GRADES, { error: "Select a grade" }),
  lastTamilGrade: z.enum([...TAMIL_GRADES, "Was not enrolled in Tamil school last year"] as const, { error: "Select a grade" }),
  enrollingTamilGrade: z.enum(TAMIL_GRADES, { error: "Select a grade" }),

  // Parents
  motherName: z.string().min(2, "Enter mother's name"),
  motherEmail: z.string().email("Enter a valid email"),
  motherMobile: phone10,
  motherEmployer: z.string().optional(),

  fatherName: z.string().min(2, "Enter father's name"),
  fatherEmail: z.string().email("Enter a valid email"),
  fatherMobile: phone10,
  fatherEmployer: z.string().optional(),

  // Address
  homeStreet: z.string().min(2, "Enter street and unit"),
  homeCity: z.string().min(2, "Enter city"),
  homeZip: zipSchema,
});

const schema = baseSchema.superRefine((data, ctx) => {
  if (data.schoolDistrict === "Other") {
    const val = (data.schoolDistrictOther || "").trim();
    if (!val) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please specify your district",
        path: ["schoolDistrictOther"],
      });
    }
  }
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    trigger,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    reValidateMode: "onChange",
    shouldUnregister: false,
    defaultValues: undefined,
  });

  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [step, setStep] = useState<number>(0);
  const [maxReached, setMaxReached] = useState<number>(0);
  const [stepValid, setStepValid] = useState<boolean>(false);
  const [showStepErrors, setShowStepErrors] = useState<boolean>(false);

  const TOTAL_STEPS = STEPS.length;

  // Fields per step for validation-on-next
  const STEP_FIELDS: FieldPath<FormValues>[][] = [
    ["studentName", "studentDob", "studentGender"],
    [
      "currentPublicSchool",
      "schoolDistrict",
      "schoolDistrictOther",
      "currentPublicGrade",
      "lastTamilGrade",
      "enrollingTamilGrade",
    ],
    [
      "motherName",
      "motherEmail",
      "motherMobile",
      "motherEmployer",
      "fatherName",
      "fatherEmail",
      "fatherMobile",
      "fatherEmployer",
    ],
    ["homeStreet", "homeCity", "homeZip"],
  ];

  // Load saved values and step on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<FormValues>;
        reset(parsed);
      }
      const sraw = localStorage.getItem(STORAGE_STEP_KEY);
      if (sraw) {
        const s = parseInt(sraw, 10);
        if (!Number.isNaN(s) && s >= 0 && s < TOTAL_STEPS) {
          setStep(s);
          setMaxReached(Math.max(0, s));
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist values and step
  useEffect(() => {
    const subscription = watch((values) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
      } catch {}
    });
    return () => subscription.unsubscribe();
  }, [watch]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_STEP_KEY, String(step));
    } catch {}
  }, [step]);

  const selectedDistrict = watch("schoolDistrict");
  const hasOtherDistrict = selectedDistrict === "Other";

  // Watch current step values and re-trigger validation on change
  const currentStepFields = STEP_FIELDS[step] as FieldPath<FormValues>[];
  const currentStepValues = watch(currentStepFields);
  useEffect(() => {
    // Re-validate current step when its values change
    (async () => {
      const ok = await trigger(currentStepFields);
      setStepValid(ok);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(currentStepValues), step]);

  // Also validate proactively on step change
  useEffect(() => {
    (async () => {
      const fields = STEP_FIELDS[step] as FieldPath<FormValues>[];
      const ok = await trigger(fields);
      setStepValid(ok);
      // reset error reveal when step changes
      setShowStepErrors(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Derived: is current step valid
  const isCurrentStepValid = stepValid;

  const goNext = async () => {
    const fields = STEP_FIELDS[step] as FieldPath<FormValues>[];
    const ok = await trigger(fields);
    setStepValid(ok);
    if (!ok) {
      setShowStepErrors(true);
      return;
    }
    if (step < TOTAL_STEPS - 1) {
      const next = step + 1;
      setStep(next);
      setShowStepErrors(false);
      setMaxReached((m) => Math.max(m, next));
    }
  };
  const goBack = () => {
    setStep((s) => Math.max(0, s - 1));
    setShowStepErrors(false);
  };

  const goToStep = async (target: number) => {
    if (target < 0 || target >= TOTAL_STEPS) return;
    if (target <= maxReached) {
      setStep(target);
      return;
    }
    // Allow moving forward only one step at a time with validation
    if (target === step + 1) {
      await goNext();
    }
    // else ignore jumps > 1 ahead
  };

  const onSubmit = async (data: FormValues) => {
    setStatus("idle");
    setMessage("");

    // Build Google Form payload
    const payload: Record<string, string | string[]> = {
      // Student core
      [ENTRY_IDS.studentName]: data.studentName,
      [ENTRY_IDS.studentGender]: data.studentGender,
      [ENTRY_IDS.currentPublicSchool]: data.currentPublicSchool,
      [ENTRY_IDS.currentPublicGrade]: data.currentPublicGrade,
      [ENTRY_IDS.lastTamilGrade]: data.lastTamilGrade,
      [ENTRY_IDS.enrollingTamilGrade]: data.enrollingTamilGrade,
      // Address
      [ENTRY_IDS.homeStreet]: data.homeStreet,
      [ENTRY_IDS.homeCity]: data.homeCity,
      [ENTRY_IDS.homeZip]: data.homeZip,
      // Parents
      [ENTRY_IDS.motherName]: data.motherName,
      [ENTRY_IDS.motherEmail]: data.motherEmail,
      [ENTRY_IDS.motherMobile]: data.motherMobile,
      [ENTRY_IDS.fatherName]: data.fatherName,
      [ENTRY_IDS.fatherEmail]: data.fatherEmail,
      [ENTRY_IDS.fatherMobile]: data.fatherMobile,
    };

    // Optional employers
    if (data.motherEmployer) payload[ENTRY_IDS.motherEmployer] = data.motherEmployer;
    if (data.fatherEmployer) payload[ENTRY_IDS.fatherEmployer] = data.fatherEmployer;

    // DOB parts (YYYY-MM-DD)
    const [yyyy, mm, dd] = data.studentDob.split("-");
    const month = String(parseInt(mm, 10));
    const day = String(parseInt(dd, 10));
    payload[ENTRY_IDS.studentDob.year] = yyyy;
    payload[ENTRY_IDS.studentDob.month] = month;
    payload[ENTRY_IDS.studentDob.day] = day;

    // School District (single select + optional other)
    if (data.schoolDistrict === "Other") {
      payload[ENTRY_IDS.schoolDistrict] = "__other_option__";
      if (data.schoolDistrictOther) {
        payload[ENTRY_IDS.schoolDistrictOther] = data.schoolDistrictOther;
      }
    } else {
      payload[ENTRY_IDS.schoolDistrict] = data.schoolDistrict;
    }

    try {
      const resp = await fetch("/api/google-form", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: payload }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as { error?: string })?.error || `Submission failed (${resp.status})`);
      }
      setStatus("success");
      setMessage("Registration submitted. We'll be in touch soon.");
      reset();
      setStep(0);
      setMaxReached(0);
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_STEP_KEY);
      } catch {}
    } catch (err: unknown) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again or use the Google Form link below.";
      setMessage(msg);
    }
  };

  // Helper: show error only when field touched or user attempted to proceed
  const showError = (name: FieldPath<FormValues>) => {
    return Boolean((errors as Record<string, unknown>)[name]) && (Boolean((touchedFields as Record<string, boolean | undefined>)[name]) || showStepErrors);
  };

  return (
    <section className="flex flex-col gap-6">
      <h1 data-testid="page-title" className="text-2xl font-semibold text-gray-900">Register</h1>

      <p className="text-gray-700">
        Please complete the registration form below. If you prefer, you can also fill out the Google Form directly using the button.
      </p>

      {(status === "success" || status === "error") && (
        <div
          className={`p-3 rounded border text-sm ${
            status === "success"
              ? "bg-green-50 border-green-200 text-green-800/30/50"
              : "bg-red-50 border-red-200 text-red-800/30/50"
          }`}
        >
          {message}
        </div>
      )}

      {/* Step indicator */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="mb-2 flex items-center justify-between text-sm text-gray-700">
          <span>Step {step + 1} of {TOTAL_STEPS}</span>
          <span className="font-medium">{STEPS[step]}</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded">
          <div
            className="h-2 bg-green-600 rounded"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <ul className="mt-3 flex flex-wrap items-center gap-4">
          {STEPS.map((label, idx) => {
            const active = idx === step;
            const done = idx < step;
            const clickable = idx <= maxReached || idx === step + 1;
            return (
              <li key={label} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => clickable && goToStep(idx)}
                  disabled={!clickable}
                  title={clickable ? `Go to ${label}` : "Complete previous step"}
                  aria-label={clickable ? `Go to ${label}` : `${label} (Locked)`}
                  className={`inline-flex items-center gap-2 group ${clickable ? "cursor-pointer" : "cursor-not-allowed"}`}
                >
                  <span
                    aria-current={active ? "step" : undefined}
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      done ? "bg-green-600 text-white" : active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className={`text-sm ${active ? "text-gray-900 font-medium" : clickable ? "text-gray-700 group-hover:text-gray-900:text-gray-100" : "text-gray-400"}`}>{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <style jsx>{`
          @keyframes fadeStep { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
          .fade-step { animation: fadeStep 200ms ease both; }
        `}</style>
        {/* Student info (Step 0) */}
        {step === 0 && (
          <div className="contents fade-step">
            <div className="col-span-1 md:col-span-2"><h2 className="text-lg font-medium text-gray-900">Student Information</h2></div>

            <div className="col-span-1">
              <label htmlFor="studentName" className="block text-sm font-medium text-gray-800">Student Name (First Last)</label>
              <input
                id="studentName"
                type="text"
                {...register("studentName")}
                aria-invalid={showError("studentName")}
                className="mt-1 w-full rounded-md border border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-600:border-gray-600:text-gray-500"
                placeholder="First Last"
                autoComplete="off"
              />
              {showError("studentName") && (
                <p className="mt-1 text-xs text-red-600">{errors.studentName?.message as string}</p>
              )}
            </div>

            <div className="col-span-1">
              <label htmlFor="studentDob" className="block text-sm font-medium text-gray-800">Student DOB</label>
              <input
                id="studentDob"
                type="date"
                {...register("studentDob")}
                aria-invalid={showError("studentDob")}
                className="mt-1 w-full rounded-md border border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-600:border-gray-600:text-gray-500"
                placeholder="YYYY-MM-DD"
              />
              {showError("studentDob") && (
                <p className="mt-1 text-xs text-red-600">{errors.studentDob?.message as string}</p>
              )}
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-800">Student Gender</label>
              <div className="mt-2 flex gap-6">
                {GENDERS.map((g) => (
                  <label key={g} className="inline-flex items-center gap-2 text-sm">
                    <input className="accent-green-700" type="radio" value={g} {...register("studentGender")} />
                    <span className="text-gray-900">{g}</span>
                  </label>
                ))}
              </div>
              {showError("studentGender") && (
                <p className="mt-1 text-xs text-red-600">{errors.studentGender?.message as string}</p>
              )}
            </div>
          </div>
        )}

        {/* School info (Step 1) */}
        {step === 1 && (
          <div className="contents fade-step">
            <div className="col-span-1 md:col-span-2"><h2 className="text-lg font-medium text-gray-900">School Information</h2></div>

            <div className="col-span-1">
              <label htmlFor="currentPublicSchool" className="block text-sm font-medium text-gray-800">Current Public School Name</label>
              <input
                id="currentPublicSchool"
                type="text"
                {...register("currentPublicSchool")}
                aria-invalid={showError("currentPublicSchool")}
                className="mt-1 w-full rounded-md border border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-600:border-gray-600:text-gray-500"
                placeholder="Type or paste exact school name"
                list="schools-list"
              />
              <datalist id="schools-list">
                <option>Adobe Bluffs Elementary School</option>
                <option>Bernado Heights Middle School</option>
                <option>Bernardo Elementary School</option>
                <option>Breeze Hill Elementary School</option>
                <option>Canyon View Elementary school</option>
                <option>Carlton Oaks School</option>
                <option>Carrillo Elementary School</option>
                <option>Challenger Middle School</option>
                <option>Chaparral elementary school</option>
                <option>Community Montessori Charter School</option>
                <option>Creekside elementary school</option>
                <option>Christ The Cornerstone Academy</option>
                <option>Deer Canyon Elementary School</option>
                <option>Del Sur elementary school</option>
                <option>Design 39</option>
                <option>Dingeman Elementary School</option>
                <option>Discovery Elementary</option>
                <option>Ellen Browning Scripps Elementary school</option>
                <option>Encinitas Country Day School</option>
                <option>Ericson Elementary</option>
                <option>Hage Elementary school</option>
                <option>Highland Ranch Elementary School</option>
                <option>Johnson elementary</option>
                <option>Jonas Salk elementary school</option>
                <option>La Costa Heights Elementary</option>
                <option>Los Penasquitos Elementary School</option>
                <option>Marshall Middle school</option>
                <option>Mason Elementary School</option>
                <option>Mesa Verde Middle school</option>
                <option>Miramar Ranch Elementary</option>
                <option>Monterey Ridge Elementary School</option>
                <option>Morning Creek Elementary School</option>
                <option>Nipaquay Elementary School</option>
                <option>Oak Valley Middle School</option>
                <option>Ocean Air Elementary School</option>
                <option>Ocean knoll elementary</option>
                <option>Pacific Rim Elementary School</option>
                <option>Park Village Elementary School</option>
                <option>Rancho Bernardo High School</option>
                <option>Rolling hills Elementary school</option>
                <option>San Elijo Middle School</option>
                <option>Sandburg Elementary School</option>
                <option>Scripps elementary School</option>
                <option>Shoal Creek Elementary</option>
                <option>Solana Pacific Elementary School</option>
                <option>solana sante fe Elemenrary</option>
                <option>Stone Ranch Elementary School</option>
                <option>Sundance Elementary School</option>
                <option>Temecula Luiseno Elementary</option>
                <option>Thurgood Marshall Middle School</option>
                <option>Turtleback Elementary School</option>
                <option>Twin Peaks Middle School</option>
                <option>Westwood elementary</option>
                <option>Willow Grove Elementary School</option>
                <option>Not in School Yet</option>
                <option>My School is not in the list.</option>
              </datalist>
              {showError("currentPublicSchool") && (
                <p className="mt-1 text-xs text-red-600">{errors.currentPublicSchool?.message as string}</p>
              )}
            </div>

            <div className="col-span-1">
              <label htmlFor="schoolDistrict" className="block text-sm font-medium text-gray-800">Your School District</label>
              <select
                id="schoolDistrict"
                {...register("schoolDistrict")}
                aria-invalid={showError("schoolDistrict")}
                className="mt-1 w-full rounded-md border border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-900 focus:border-green-600 focus:ring-2 focus:ring-green-600:border-gray-600"
                defaultValue={""}
              >
                <option value="" disabled>Select district</option>
                {SCHOOL_DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {hasOtherDistrict && (
                <input
                  id="schoolDistrictOther"
                  type="text"
                  {...register("schoolDistrictOther")}
                  aria-invalid={showError("schoolDistrictOther")}
                  className="mt-2 w-full rounded-md border border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-600:border-gray-600:text-gray-500"
                  placeholder="If Other, please specify"
                />
              )}
              {showError("schoolDistrict") && (
                <p className="mt-1 text-xs text-red-600">{errors.schoolDistrict?.message as string}</p>
              )}
              {showError("schoolDistrictOther") && (
                <p className="mt-1 text-xs text-red-600">{errors.schoolDistrictOther?.message as string}</p>
              )}
            </div>

            <div className="col-span-1">
              <label htmlFor="currentPublicGrade" className="block text-sm font-medium text-gray-800">Current Grade in Public School (2025-26)</label>
              <select
                id="currentPublicGrade"
                {...register("currentPublicGrade")}
                aria-invalid={showError("currentPublicGrade")}
                className="mt-1 w-full rounded-md border border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-900 focus:border-green-600 focus:ring-2 focus:ring-green-600:border-gray-600"
                defaultValue={""}
              >
                <option value="" disabled>Select grade</option>
                {PUBLIC_GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              {showError("currentPublicGrade") && (
                <p className="mt-1 text-xs text-red-600">{errors.currentPublicGrade?.message as string}</p>
              )}
            </div>

            <div className="col-span-1">
              <label htmlFor="lastTamilGrade" className="block text-sm font-medium text-gray-800">Last year grade in Tamil School (2024-25)</label>
              <select
                id="lastTamilGrade"
                {...register("lastTamilGrade")}
                aria-invalid={showError("lastTamilGrade")}
                className="mt-1 w-full rounded-md border border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-900 focus:border-green-600 focus:ring-2 focus:ring-green-600:border-gray-600"
                defaultValue={""}
              >
                <option value="" disabled>Select grade</option>
                {[...TAMIL_GRADES, "Was not enrolled in Tamil school last year"].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              {showError("lastTamilGrade") && (
                <p className="mt-1 text-xs text-red-600">{errors.lastTamilGrade?.message as string}</p>
              )}
            </div>

            <div className="col-span-1">
              <label htmlFor="enrollingTamilGrade" className="block text-sm font-medium text-gray-800">Enrolling Grade in Tamil School (2025-26)</label>
              <select
                id="enrollingTamilGrade"
                {...register("enrollingTamilGrade")}
                aria-invalid={showError("enrollingTamilGrade")}
                className="mt-1 w-full rounded-md border border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-900 focus:border-green-600 focus:ring-2 focus:ring-green-600:border-gray-600"
                defaultValue={""}
              >
                <option value="" disabled>Select grade</option>
                {TAMIL_GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              {showError("enrollingTamilGrade") && (
                <p className="mt-1 text-xs text-red-600">{errors.enrollingTamilGrade?.message as string}</p>
              )}
            </div>
          </div>
        )}

        {/* Parents (Step 2) */}
        {step === 2 && (
          <div className="contents fade-step">
            <div className="col-span-1 md:col-span-2 mt-2"><h2 className="text-lg font-medium text-gray-900">Parent/Guardian Information</h2></div>

            <div className="col-span-1">
              <label htmlFor="motherName" className="block text-sm font-medium text-gray-800">Mother&apos;s Name (First Last)</label>
              <input id="motherName" type="text" {...register("motherName")} aria-invalid={showError("motherName")} className="mt-1 w-full rounded-md border border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-600:border-gray-600:text-gray-500" />
              {showError("motherName") && <p className="mt-1 text-xs text-red-600">{errors.motherName?.message as string}</p>}
            </div>
            <div className="col-span-1">
              <label htmlFor="motherEmail" className="block text-sm font-medium text-gray-800">Mother&apos;s email</label>
              <input id="motherEmail" type="email" {...register("motherEmail")} aria-invalid={showError("motherEmail")} className="mt-1 w-full rounded-md border border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-600:border-gray-600:text-gray-500" />
              {showError("motherEmail") && <p className="mt-1 text-xs text-red-600">{errors.motherEmail?.message as string}</p>}
            </div>
            <div className="col-span-1">
              <label htmlFor="motherMobile" className="block text-sm font-medium text-gray-800">Mother&apos;s Mobile (10 digits)</label>
              <input id="motherMobile" type="tel" inputMode="numeric" {...register("motherMobile")} aria-invalid={showError("motherMobile")} className="mt-1 w-full rounded-md border border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-600:border-gray-600:text-gray-500" placeholder="1234567890" />
              {showError("motherMobile") && <p className="mt-1 text-xs text-red-600">{errors.motherMobile?.message as string}</p>}
            </div>
            <div className="col-span-1">
              <label htmlFor="motherEmployer" className="block text-sm font-medium text-gray-800">Mother&apos;s Employer (optional)</label>
              <input id="motherEmployer" type="text" {...register("motherEmployer")} className="mt-1 w-full rounded-md border border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-600:border-gray-600:text-gray-500" />
            </div>

            <div className="col-span-1">
              <label htmlFor="fatherName" className="block text-sm font-medium text-gray-800">Father&apos;s Name (First Last)</label>
              <input id="fatherName" type="text" {...register("fatherName")} aria-invalid={showError("fatherName")} className="mt-1 w-full rounded-md border border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-600:border-gray-600:text-gray-500" />
              {showError("fatherName") && <p className="mt-1 text-xs text-red-600">{errors.fatherName?.message as string}</p>}
            </div>
            <div className="col-span-1">
              <label htmlFor="fatherEmail" className="block text-sm font-medium text-gray-800">Father&apos;s email</label>
              <input id="fatherEmail" type="email" {...register("fatherEmail")} aria-invalid={showError("fatherEmail")} className="mt-1 w-full rounded-md border border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-600:border-gray-600:text-gray-500" />
              {showError("fatherEmail") && <p className="mt-1 text-xs text-red-600">{errors.fatherEmail?.message as string}</p>}
            </div>
            <div className="col-span-1">
              <label htmlFor="fatherMobile" className="block text-sm font-medium text-gray-800">Father&apos;s Mobile (10 digits)</label>
              <input id="fatherMobile" type="tel" inputMode="numeric" {...register("fatherMobile")} aria-invalid={showError("fatherMobile")} className="mt-1 w-full rounded-md border border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-600:border-gray-600:text-gray-500" placeholder="1234567890" />
              {showError("fatherMobile") && <p className="mt-1 text-xs text-red-600">{errors.fatherMobile?.message as string}</p>}
            </div>
            <div className="col-span-1">
              <label htmlFor="fatherEmployer" className="block text-sm font-medium text-gray-800">Father&apos;s Employer (optional)</label>
              <input id="fatherEmployer" type="text" {...register("fatherEmployer")} className="mt-1 w-full rounded-md border border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-600:border-gray-600:text-gray-500" />
            </div>
          </div>
        )}

        {/* Address (Step 3) */}
        {step === 3 && (
          <div className="contents fade-step">
            <div className="col-span-1 md:col-span-2 mt-2"><h2 className="text-lg font-medium text-gray-900">Home Address</h2></div>

            <div className="col-span-1 md:col-span-2">
              <label htmlFor="homeStreet" className="block text-sm font-medium text-gray-800">Street name and Unit</label>
              <input id="homeStreet" type="text" {...register("homeStreet")} aria-invalid={showError("homeStreet")} className="mt-1 w-full rounded-md border border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-600:border-gray-600:text-gray-500" />
              {showError("homeStreet") && <p className="mt-1 text-xs text-red-600">{errors.homeStreet?.message as string}</p>}
            </div>
            <div className="col-span-1">
              <label htmlFor="homeCity" className="block text-sm font-medium text-gray-800">City</label>
              <input id="homeCity" type="text" {...register("homeCity")} aria-invalid={showError("homeCity")} className="mt-1 w-full rounded-md border border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-600:border-gray-600:text-gray-500" />
              {showError("homeCity") && <p className="mt-1 text-xs text-red-600">{errors.homeCity?.message as string}</p>}
            </div>
            <div className="col-span-1">
              <label htmlFor="homeZip" className="block text-sm font-medium text-gray-800">Zip</label>
              <input id="homeZip" type="text" inputMode="numeric" {...register("homeZip")} aria-invalid={showError("homeZip")} className="mt-1 w-full rounded-md border border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-600:border-gray-600:text-gray-500" />
              {showError("homeZip") && <p className="mt-1 text-xs text-red-600">{errors.homeZip?.message as string}</p>}
            </div>
          </div>
        )}

        {/* Navigation and actions */}
        <div className="col-span-1 md:col-span-2 flex items-center justify-between gap-3 mt-2">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50:bg-gray-800 text-sm"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step < TOTAL_STEPS - 1 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!isCurrentStepValid}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800 transition-colors text-sm font-medium shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800 transition-colors text-sm font-medium shadow-sm disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit Registration"}
              </button>
            )}
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdroKw_dnEwZmr3BrUxe-99ywJbScr-QTkhl98HUiAMzDC6Ng/viewform"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-700 hover:text-green-800:text-green-300 underline"
            >
              Prefer Google Form? Open in new tab
            </a>
          </div>
        </div>
      </form>
    </section>
  );
}
