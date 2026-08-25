import type { Metadata } from "next";
import BookingWizard from "@/components/booking/BookingWizard";

export const metadata: Metadata = {
  title: "Бронирование — T&M Sound",
  description: "Запись в студию звукозаписи T&M Sound, Пирогова 17",
};

export default function BookingPage() {
  return (
    <main className="page">
      <div className="wizard">
        <div className="wizard-header">
          <div className="wizard-logo">T&amp;M Sound</div>
          <div className="wizard-title">Записаться в студию</div>
        </div>
        <BookingWizard />
      </div>
    </main>
  );
}
