from pydantic import BaseModel, HttpUrl, field_validator
from typing import Optional
import re


class TherapistProfile(BaseModel):
    pt_profile_url: str
    name: str
    credentials: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    specialties: list[str] = []
    issues: list[str] = []
    therapy_types: list[str] = []
    insurance: list[str] = []
    telehealth: bool = False
    in_person: bool = True

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be empty")
        return v.strip()

    @field_validator("bio", mode="before")
    @classmethod
    def clean_bio(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        # Collapse whitespace
        return re.sub(r"\s+", " ", v).strip()

    def embedding_text(self) -> str:
        """Build the text to embed for this therapist."""
        parts = []
        header = f"{self.name}"
        if self.credentials:
            header += f", {self.credentials}"
        if self.city and self.state:
            header += f" in {self.city}, {self.state}"
        parts.append(header + ".")

        if self.bio:
            parts.append(self.bio)

        if self.specialties:
            parts.append(f"Specialties: {', '.join(self.specialties)}.")
        if self.issues:
            parts.append(f"Issues treated: {', '.join(self.issues)}.")
        if self.therapy_types:
            parts.append(f"Therapy approaches: {', '.join(self.therapy_types)}.")

        return "\n\n".join(parts)
