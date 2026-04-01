import { BookOpen, Award, IndianRupee } from 'lucide-react';

const benefits = [
  { icon: BookOpen, title: 'Learn Practical Skills', desc: 'Video editing, content creation, freelancing, and more from expert creators.' },
  { icon: Award, title: 'Earn Verified Certificate', desc: 'Get a certificate with a unique verification code your network can validate.' },
  { icon: IndianRupee, title: 'Refer & Earn Commission', desc: 'Share with friends and earn commission on every enrollment they make.' },
];

const ForStudents = () => (
  <section className="py-16 md:py-24">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <p className="text-sm font-semibold text-primary mb-1">FOR STUDENTS</p>
        <h2 className="font-heading text-3xl font-700">Learn. Get Certified. Earn.</h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
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
    </div>
  </section>
);

export default ForStudents;
