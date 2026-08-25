export type Service = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  pricePerHour: number;
};

export type HourSlot = { time: string; free: boolean };

export type DayStatus = "past" | "full" | "available";

export type WizardStep = "service" | "date" | "time" | "contact" | "summary" | "done";

export type ContactInfo = {
  clientName: string;
  telegramUsername: string;
  phone: string;
  instagram: string;
  comment: string;
};

export const EMPTY_CONTACT: ContactInfo = {
  clientName: "",
  telegramUsername: "",
  phone: "",
  instagram: "",
  comment: "",
};
