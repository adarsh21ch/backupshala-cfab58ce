import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

export default function ShippingPolicy() {
  return (
    <>
      <Helmet>
        <title>Shipping & Delivery Policy | Backupshala</title>
        <meta name="description" content="Backupshala delivers digital courses online. Learn how and when course access is granted after payment." />
        <link rel="canonical" href="https://backupshala.com/shipping-policy" />
      </Helmet>
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Shipping &amp; Delivery Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>

        <section className="prose prose-slate max-w-none space-y-4">
          <p>
            Backupshala is a 100% digital platform. We do <strong>not</strong> ship any physical
            products. All courses, certificates, and downloadable resources are delivered
            electronically through your Backupshala dashboard.
          </p>

          <h2 className="text-xl font-semibold mt-6">Delivery of Courses</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Course access is granted <strong>instantly</strong> after successful payment.</li>
            <li>
              You can access your course at any time from{" "}
              <Link to="/dashboard" className="text-primary underline">your dashboard</Link>.
            </li>
            <li>
              In the rare case of a payment-confirmation delay, access is enabled
              automatically within <strong>30 minutes</strong> via our secure webhook.
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-6">Delivery of Certificates</h2>
          <p>
            Course-completion certificates are generated automatically and made available
            for download within minutes of finishing the final module. Each certificate
            carries a unique code that can be verified at{" "}
            <Link to="/verify-certificate" className="text-primary underline">/verify-certificate</Link>.
          </p>

          <h2 className="text-xl font-semibold mt-6">Issues with Access</h2>
          <p>
            If you have paid but cannot access your course, please contact us at{" "}
            <a href="mailto:support@backupshala.com" className="text-primary underline">support@backupshala.com</a>{" "}
            with your payment ID. We respond within one business day.
          </p>

          <h2 className="text-xl font-semibold mt-6">Refunds</h2>
          <p>
            Please see our{" "}
            <Link to="/refund-policy" className="text-primary underline">Refund Policy</Link>{" "}
            and{" "}
            <Link to="/cancellation-policy" className="text-primary underline">Cancellation Policy</Link>.
          </p>
        </section>
      </main>
    </>
  );
}
