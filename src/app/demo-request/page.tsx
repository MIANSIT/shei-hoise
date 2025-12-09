// app/demo-request/page.tsx
import DemoRequestForm from "@/app/components/contactUs/DemoRequestForm";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";

export default function DemoRequestPage() {
  return (
    <div>
      <Header />
      <div className="min-h-screen flex items-center justify-center ">
        <DemoRequestForm />
      </div>
      <Footer />
    </div>
  );
}
