import { BookOpen, GraduationCap, IndianRupee, Users } from 'lucide-react';

const benefits = [
  { icon: BookOpen, title: 'Curated Digital Skills', desc: 'Video editing, content creation, personal branding, sales, and freelancing — practical skills taught by expert creators.' },
  { icon: GraduationCap, title: 'Verified Certificate', desc: 'Complete your course and earn a certificate with a unique verification code. Share on LinkedIn, WhatsApp, and Instagram.' },
  { icon: IndianRupee, title: 'Referral Program', desc: 'Enjoyed a course? Share it with friends. When they enroll using your referral, you may earn a commission as set by the course creator.' },
  { icon: Users, title: 'Community Access', desc: 'Enrolled students get access to the course community — for tips, networking, and learning discussions.' },
];

const ForStudents = () => (
  <section className="py-16 md:py-24">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <p className="text-sm font-semibold text-primary mb-1">FOR LEARNERS</p>
        <h2 className="font-heading text-3xl font-700">Learn. Get Certified. Grow.</h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((b, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <b.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-heading text-base font-600">{b.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Referral commissions vary by course and are set by each creator. Earnings are not guaranteed and depend on actual enrollments.
      </p>
    </div>
  </section>
);

export default ForStudents;
