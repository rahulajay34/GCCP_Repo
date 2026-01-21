import Link from 'next/link';
import { BookOpen, ClipboardCheck, Zap, Sparkles, ArrowRight, Brain, Target, Clock } from 'lucide-react';

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <section className="py-16 text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6 animate-slide-up">
          <Sparkles className="w-4 h-4" />
          <span>AI-Powered Educational Content</span>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          Create Educational Content
          <br />
          <span className="gradient-text">with Multi-Agent AI</span>
        </h1>
        
        <p className="text-xl text-gray-600 dark:text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Orchestrate intelligent agents to generate high-quality lecture notes, 
          assignments, and pre-reading materials in minutes, not hours.
        </p>
        
        <div className="flex justify-center gap-4 mb-16">
          <Link 
            href="/editor"
            className="btn-primary inline-flex items-center gap-2 text-lg animate-pulse-glow"
          >
            Start Creating
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link 
            href="/archives"
            className="btn-secondary inline-flex items-center gap-2"
          >
            View Archives
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mb-16 animate-slide-up" style={{ animationDelay: '200ms' }}>
          {[
            { value: '5+', label: 'AI Agents' },
            { value: '3', label: 'Content Types' },
            { value: '< 60s', label: 'Generation Time' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold gradient-text">{stat.value}</div>
              <div className="text-sm text-gray-500 dark:text-zinc-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12">
        <h2 className="text-2xl font-bold text-center mb-2">What You Can Create</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-10">Three powerful content types for complete course coverage</p>
        
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: BookOpen,
              title: 'Lecture Notes',
              description: 'Comprehensive, structured notes with examples, diagrams, and key takeaways.',
              color: 'orange',
              gradient: 'from-orange-500 to-amber-500'
            },
            {
              icon: ClipboardCheck,
              title: 'Assignments',
              description: 'MCQs, multiple-select, and subjective questions with detailed answer keys.',
              color: 'green',
              gradient: 'from-green-500 to-emerald-500'
            },
            {
              icon: Zap,
              title: 'Pre-Reads',
              description: 'Curiosity-inducing materials that prepare students for upcoming lessons.',
              color: 'purple',
              gradient: 'from-purple-500 to-violet-500'
            }
          ].map((feature, i) => (
            <div 
              key={i}
              className="group p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm card-hover animate-slide-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <h2 className="text-2xl font-bold text-center mb-2">How It Works</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-12">Multi-agent AI orchestration for quality content</p>
        
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { icon: Target, title: 'Define Topic', desc: 'Enter your topic and subtopics' },
            { icon: Brain, title: 'AI Analysis', desc: 'Agents analyze and plan content' },
            { icon: Sparkles, title: 'Generation', desc: 'Content is created and validated' },
            { icon: Clock, title: 'Review & Export', desc: 'Edit and download your content' },
          ].map((step, i) => (
            <div key={i} className="text-center animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="relative mb-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <step.icon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="absolute top-1/2 left-full w-full h-0.5 bg-gradient-to-r from-blue-200 to-transparent dark:from-blue-800 hidden md:block -translate-y-1/2" 
                     style={{ display: i === 3 ? 'none' : undefined }} />
              </div>
              <h4 className="font-semibold mb-1">{step.title}</h4>
              <p className="text-sm text-gray-500 dark:text-zinc-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 text-center">
        <div className="p-10 rounded-3xl gradient-primary animate-gradient">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Content Creation?</h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Start generating professional educational materials with AI in minutes.
          </p>
          <Link 
            href="/editor"
            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-blue-600 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

