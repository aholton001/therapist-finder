export type SearchMode = "freeform" | "questionnaire";

export type QuestionnaireData = {
  primaryIssues: string[];
  therapyExperience: "none" | "some" | "extensive";
  preferredModality: string[];
  sessionFormat: "in-person" | "telehealth" | "either";
  insurance: string;
  additionalContext: string;
};

export function questionnaireToQuery(data: QuestionnaireData): string {
  const parts: string[] = [];

  if (data.primaryIssues.length > 0) {
    parts.push(`I'm dealing with ${data.primaryIssues.join(", ")}.`);
  }

  if (data.therapyExperience === "none") {
    parts.push("I have never been to therapy before.");
  } else if (data.therapyExperience === "some") {
    parts.push("I have had some therapy experience in the past.");
  } else {
    parts.push("I have extensive experience with therapy.");
  }

  if (data.preferredModality.length > 0) {
    parts.push(
      `I am interested in ${data.preferredModality.join(" or ")} therapy.`
    );
  }

  if (data.sessionFormat !== "either") {
    parts.push(
      `I prefer ${data.sessionFormat === "in-person" ? "in-person" : "telehealth"} sessions.`
    );
  }

  if (data.insurance) {
    parts.push(`I have ${data.insurance} insurance.`);
  }

  if (data.additionalContext) {
    parts.push(data.additionalContext);
  }

  return parts.join(" ");
}
