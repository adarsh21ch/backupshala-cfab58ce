import { Video, PenTool, User, MessageSquare, Briefcase } from 'lucide-react';

const courseData = [
  { icon: Video, title: 'Video Editing for Beginners', desc: 'Edit reels, YouTube videos, and short-form content using CapCut.', modules: 5 },
  { icon: PenTool, title: 'Content Creation & Social Media', desc: 'Write captions, plan content, grow on Instagram and YouTube.', modules: 5 },
  { icon: User, title: 'Personal Branding', desc: 'Build your digital identity and position yourself as an expert.', modules: 4 },
  { icon: MessageSquare, title: 'Sales & Communication', desc: 'Master persuasion, pitching, and confident communication.', modules: 4 },
  { icon: Briefcase, title: 'Freelancing & Earning Online', desc: 'Find clients, price services, earn on Fiverr and Instagram.', modules: 4 },
];

const CoursesSection = () => (
  <section id="courses" className="border-t border-border bg-secondary/30 py-16 md:py-24">
    <div className="container mx-auto px-4">
      <div className="text-center">
        <h2 className="font-heading text-3xl font-700 md:text-4xl">What You'll Learn</h2>
        <p className="mt-2 text-muted-foreground">5 practical courses designed for beginners</p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courseData.map((c, i) => (
          <div key={i} className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <c.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-heading text-lg font-600">{c.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
            <p className="mt-3 text-xs font-medium text-primary">{c.modules} video modules</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-sm font-medium text-muted-foreground">
        All 5 courses included in one <span className="text-foreground font-semibold">₹249</span> enrollment
      </p>
    </div>
  </section>
);

export default CoursesSection;
