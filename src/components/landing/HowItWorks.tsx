import { UserPlus, Play, Trophy, Upload, Wrench, IndianRupee } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type Step = {
  icon: typeof UserPlus;
  title: string;
  desc: string;
  tint: string;
};

const studentSteps: Step[] = [
  {
    icon: UserPlus,
    title: 'Create Your Account',
    desc: 'Sign up in 30 seconds. No credit card needed to get started.',
    tint: 'bg-primary/10 text-primary',
  },
  {
    icon: Play,
    title: 'Enroll & Learn',
    desc: 'Browse 10+ courses. Pick your skill. Start learning today.',
    tint: 'bg-accent/10 text-accent',
  },
  {
    icon: Trophy,
    title: 'Earn Your Certificate',
    desc: 'Complete your course and download your verified certificate to share.',
    tint: 'bg-info/10 text-info',
  },
];

const creatorSteps: Step[] = [
  {
    icon: Upload,
    title: 'Apply to Become a Creator',
    desc: 'Quick application. Tell us about your expertise. We review within 48 hours.',
    tint: 'bg-primary/10 text-primary',
  },
  {
    icon: Wrench,
    title: 'Build Your Course',
    desc: 'Upload videos or curate resources. Set your own price between ₹99–₹9,999.',
    tint: 'bg-accent/10 text-accent',
  },
  {
    icon: IndianRupee,
    title: 'Earn on Every Enrollment',
    desc: 'We handle payments, GST invoices, and delivery. You focus on great content.',
    tint: 'bg-info/10 text-info',
  },
];

const StepCards = ({ steps }: { steps: Step[] }) => (
  <div className="relative mt-12 grid gap-6 md:grid-cols-3">
    {/* Dashed connector (desktop) */}
    <div
      aria-hidden
      className="pointer-events-none absolute left-[16%] right-[16%] top-[60px] hidden border-t-2 border-dashed border-border md:block"
    />

    {steps.map((s, i) => (
      <div
        key={i}
        className="lift-hover relative rounded-2xl border border-border bg-card p-7 text-left shadow-soft"
      >
        <div className="relative mb-5 inline-flex">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${s.tint}`}>
            <s.icon className="h-6 w-6" />
          </div>
          <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground shadow-sm">
            {i + 1}
          </span>
        </div>
        <h3 className="font-heading text-lg font-bold">{s.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
      </div>
    ))}
  </div>
);

const HowItWorks = () => (
  <section
    id="how-it-works"
    className="bg-stripes-faint border-y border-border py-16 md:py-24"
    style={{ backgroundColor: 'hsl(var(--secondary) / 0.4)' }}
  >
    <div className="container mx-auto px-4">
      <div className="text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight md:text-5xl">
          How It Works
        </h2>
        <div className="mx-auto mt-3 h-[3px] w-12 rounded-full bg-accent" />
        <p className="mt-4 text-muted-foreground">Simple steps to get started</p>
      </div>

      <div className="mt-10">
        <Tabs defaultValue="students" className="w-full">
          <TabsList className="mx-auto h-11 rounded-full bg-card p-1 shadow-soft">
            <TabsTrigger
              value="students"
              className="rounded-full px-6 text-sm font-semibold data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-sm"
            >
              For Learners
            </TabsTrigger>
            <TabsTrigger
              value="creators"
              className="rounded-full px-6 text-sm font-semibold data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-sm"
            >
              For Creators
            </TabsTrigger>
          </TabsList>
          <TabsContent value="students">
            <StepCards steps={studentSteps} />
          </TabsContent>
          <TabsContent value="creators">
            <StepCards steps={creatorSteps} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  </section>
);

export default HowItWorks;
