import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { StudentsList } from "@/components/StudentsList";

jest.mock("@/lib/student-api", () => ({
  listStudents: async () => [
    {
      id: "s1",
      firstName: "Anya",
      lastName: "R.",
      dob: "2014-05-12",
      priorLevel: "Beginner",
      medicalNotes: null,
      photoConsent: true,
    },
    {
      id: "s2",
      firstName: "Vikram",
      lastName: "R.",
      dob: "2012-09-03",
      priorLevel: "Intermediate",
      medicalNotes: "Peanut allergy",
      photoConsent: false,
    },
  ],
}));

describe("StudentsList", () => {
  it("renders seeded students", async () => {
    render(<StudentsList />);

    await waitFor(() => expect(screen.queryByText(/loading students/i)).not.toBeInTheDocument());

    expect(screen.getByText(/anya r\./i)).toBeInTheDocument();
    expect(screen.getByText(/vikram r\./i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /add student/i })).toBeInTheDocument();
  });
});
