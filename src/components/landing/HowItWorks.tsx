import { UserPlus, Play, Trophy, Upload, Wrench, IndianRupee } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const studentSteps = [
  { icon: UserPlus, title: 'Create Your Account', desc: 'Sign up in 30 seconds. If someone referred you, enter their email during signup.' },
  { icon: Play, title: 'Enroll & Learn', desc: 'Choose the ₹249 Standard Bundle or any creator course. Learn through videos, resources, and guides at your own pace.' },
  { icon: Trophy, title: 'Earn Your Certificate', desc: 'Complete your course and download your verified certificate. Share it on social media and your resume.' },
];

const creatorSteps = [
  { icon: Upload, title: 'Apply to Become a Creator', desc: 'Fill out a quick application. Tell us about your expertise and your first course. We review within 48 hours.' },
  { icon: Wrench, title: 'Build Your Course', desc: 'Upload your videos or add curated resources. Set your own price (₹99 to ₹9,999) and referral commission percentage.' },
  { icon: IndianRupee, title: 'Receive Earnings per Enrollment', desc: 'We handle payments, GST invoices, and delivery. You focus on creating great content.' },
];

const StepCards = ({ steps }: { steps: typeof studentSteps }) => (
  <div className="mt-10 grid gap-8 md:grid-cols-3">
    {steps.map((s, i) => (
      <div key={i} className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <s.icon className="h-7 w-7" />
          </div>
          <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
            {i + 1}
          </span>
        </div>
        <h3 className="font-heading text-lg font-600">{s.title}</h3>
        <p className="max-w-xs text-sm text-muted-foreground">{s.desc}</p>
      </div>
    ))}
  </div>
);

const HowItWorks = () => (
  <section id="how-it-works" className="border-t border-border py-16 md:py-24">
    <div className="container mx-auto px-4 text-center">
      <h2 className="font-heading text-3xl font-700 md:text-4xl">How It Works</h2>
      <p className="mt-2 text-muted-foreground">Simple steps to get started</p>
      <div className="mt-8">
        <Tabs defaultValue="students" className="w-full">
          <TabsList className="mx-auto">
            <TabsTrigger value="students">For Learners</TabsTrigger>
            <TabsTrigger value="creators">For Creators</TabsTrigger>
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
