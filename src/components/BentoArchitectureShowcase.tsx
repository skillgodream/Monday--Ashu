import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Shield,
  Layers,
  ArrowUpRight,
  Cpu,
  Compass,
  CheckCircle2,
  Terminal,
  Activity,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { BentoGrid, BentoCard } from './ui/bento-grid';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { cn } from '../lib/utils';
import { sounds } from '../utils/audio';

export default function BentoArchitectureShowcase({ onClose }: { onClose?: () => void }) {
  const [activeMetric, setActiveMetric] = useState<number>(0);

  const metrics = [
    { label: 'Latency', value: '18ms', change: '-42%' },
    { label: 'Throughput', value: '4.8k req/s', change: '+128%' },
    { label: 'Uptime', value: '99.99%', change: 'Optimal' },
  ];

  return (
    <div className="relative w-full max-w-6xl mx-auto p-6 sm:p-10 lg:p-12 linear-mesh text-slate-900 dark:text-white transition-colors duration-500">
      {/* Top Architectural Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-6 border-b border-slate-200/60 dark:border-white/10 gap-6"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <Badge variant="purple" className="flex items-center gap-1.5 py-1 px-3.5">
              <Sparkles size={13} className="text-purple-600 dark:text-purple-400" />
              <span>Stripe & Linear Design Grade</span>
            </Badge>
            <Badge variant="outline" className="hidden sm:inline-flex py-1 px-3">
              Framer Motion + Tailwind 4
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 dark:text-white">
            Volumetric Bento Grid
          </h1>
          <p className="text-base sm:text-lg font-medium text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Ultra-modern, glassmorphic layout primitives designed with strict padding scales (p-6 to p-12),
            sub-pixel border luminescence, and fluid spring micro-interactions.
          </p>
        </div>

        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose} className="shrink-0">
            Back to Application
          </Button>
        )}
      </motion.div>

      {/* Main Bento-Box Grid (3-column layout) */}
      <BentoGrid className="mb-12">
        {/* CARD 1: Large Featured Hero Card (Span 2) */}
        <BentoCard
          className="md:col-span-2 relative overflow-hidden"
          badge="Core Architecture"
          title="Autonomous Real-Time Intelligence"
          description="High-frequency operational processing with ambient glow highlights and predictive decision streaming."
          icon={Cpu}
          header={
            <div className="h-44 w-full rounded-2xl bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-blue-500/5 border border-indigo-500/20 p-6 flex flex-col justify-between overflow-hidden relative group-hover:border-indigo-500/35 transition-colors">
              <div className="flex items-center justify-between z-10">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <Activity size={14} className="animate-pulse text-emerald-500" />
                  Live Stream Active
                </span>
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                  Node: US-EAST-01
                </span>
              </div>

              {/* Dynamic Animated Pulse Bars */}
              <div className="flex items-end gap-2.5 h-20 z-10">
                {[40, 75, 55, 90, 65, 100, 80, 45, 95, 70, 85, 60].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [`${h * 0.6}%`, `${h}%`, `${h * 0.7}%`] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.8 + (i % 4) * 0.3,
                      ease: 'easeInOut',
                    }}
                    className="flex-1 bg-gradient-to-t from-indigo-600 to-purple-400 rounded-full opacity-80"
                  />
                ))}
              </div>

              <div className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full bg-indigo-500/20 blur-3xl" />
            </div>
          }
        />

        {/* CARD 2: Volumetric Glassmorphic Metric Card (Span 1) */}
        <BentoCard
          className="md:col-span-1"
          badge="Live Telemetry"
          title="Sub-Millisecond Edge"
          description="Distributed edge computation matching Linear's optimistic state replication."
          icon={Zap}
          header={
            <div className="space-y-3">
              {metrics.map((m, idx) => (
                <div
                  key={m.label}
                  onClick={() => {
                    sounds.playTap();
                    setActiveMetric(idx);
                  }}
                  className={cn(
                    'p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between',
                    activeMetric === idx
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md dark:bg-white dark:text-slate-950 dark:border-white'
                      : 'bg-white/60 dark:bg-white/5 border-slate-200/80 dark:border-white/10 hover:border-slate-400'
                  )}
                >
                  <span className="text-xs font-bold uppercase tracking-wider">{m.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black font-mono">{m.value}</span>
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                        activeMetric === idx
                          ? 'bg-white/20 text-white dark:bg-slate-950/20 dark:text-slate-950'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      )}
                    >
                      {m.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          }
        />

        {/* CARD 3: Interactive Glass Panel with Shimmer Border (Span 1) */}
        <BentoCard
          className="md:col-span-1"
          badge="Zero Friction"
          title="Instant Micro-Feedback"
          description="Haptic audio responses, spring-based state triggers, and tactile visual cues."
          icon={Layers}
          header={
            <div className="h-32 rounded-2xl bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 flex flex-col justify-center items-center text-center space-y-3">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  sounds.playCorrect();
                }}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-500/25 flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={16} /> Test Haptic Trigger
              </motion.button>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Click button to verify audio & spring physics
              </span>
            </div>
          }
        />

        {/* CARD 4: Wide Bento Banner (Span 2) */}
        <BentoCard
          className="md:col-span-2"
          badge="Production Ready"
          title="Strict Whitespace & Typography Hierarchy"
          description="Crafted specifically to eliminate generic AI aesthetic slop with crisp contrasts, precision letter spacing, and semantic depth."
          icon={Compass}
          header={
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                  1. Volumetric Depth
                </span>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Dual layer ambient shadows with sub-pixel borders.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1">
                  2. Spring Motion
                </span>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Framer Motion physics curves: [0.16, 1, 0.3, 1].
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                  3. Dynamic Utilities
                </span>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Tailwind-merge + Clsx cn() configuration.
                </p>
              </div>
            </div>
          }
        />
      </BentoGrid>

      {/* Terminal Code Snippet Verification Card */}
      <Card className="p-8 sm:p-10 border-slate-200/80 dark:border-white/10 bg-slate-900 text-white dark:bg-slate-950">
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <Terminal size={18} className="text-emerald-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              Architecture Verification
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-full">
            Status: 100% Operational
          </span>
        </div>

        <div className="font-mono text-xs text-slate-300 space-y-2 overflow-x-auto">
          <p className="text-slate-500">// Installed dependencies:</p>
          <p className="text-indigo-400">
            $ npm install clsx tailwind-merge framer-motion lucide-react
          </p>
          <p className="text-slate-500 pt-2">// Dynamic class merging verified:</p>
          <p className="text-emerald-400">
            cn("p-6", "bg-white/5", "backdrop-blur-md", "hover:border-white/20")
          </p>
        </div>
      </Card>
    </div>
  );
}
