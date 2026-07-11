import React from 'react'
import { motion } from 'framer-motion'
import { Award, Cpu, ShieldAlert } from 'lucide-react'

export default function HackathonAbout() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
  }

  return (
    <motion.section
      id="about"
      className="about-hackathon-section"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      style={{ marginTop: '4rem', marginBottom: '4rem', textAlign: 'left' }}
    >
      <motion.h3 className="section-title" variants={itemVariants}>
        Project Context & Mission
      </motion.h3>

      <div className="features-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Card 1: The Hackathon */}
        <motion.div className="feature-card" variants={itemVariants} whileHover={{ y: -6 }}>
          <div className="feature-icon" style={{ color: 'var(--accent-color)' }}>
            <Award size={32} />
          </div>
          <h4 style={{ fontFamily: 'var(--mono)', textTransform: 'uppercase', fontSize: '1.1rem', marginBottom: '0.8rem' }}>
            AMD Hackathon 2026
          </h4>
          <p style={{ fontSize: '0.9rem', lineHeight: '1.6', opacity: 0.85 }}>
            Built specifically for <strong>Track 1: Hybrid Token-Efficient Routing Agent</strong>. The challenge targets maximizing task-solving accuracy on complex reasoning tasks while strictly minimizing Fireworks Cloud API token costs.
          </p>
        </motion.div>

        {/* Card 2: What it is */}
        <motion.div className="feature-card" variants={itemVariants} whileHover={{ y: -6 }}>
          <div className="feature-icon" style={{ color: 'var(--accent-color)' }}>
            <Cpu size={32} />
          </div>
          <h4 style={{ fontFamily: 'var(--mono)', textTransform: 'uppercase', fontSize: '1.1rem', marginBottom: '0.8rem' }}>
            HybridRouter Agent
          </h4>
          <p style={{ fontSize: '0.9rem', lineHeight: '1.6', opacity: 0.85 }}>
            An intelligent waterfall routing pipeline that evaluates task categories, executes local rules, and runs confidence-gated self-consistency on local AMD-accelerated hardware before escalating queries to Fireworks Cloud models.
          </p>
        </motion.div>

        {/* Card 3: The Target Goal */}
        <motion.div className="feature-card" variants={itemVariants} whileHover={{ y: -6 }}>
          <div className="feature-icon" style={{ color: 'var(--accent-color)' }}>
            <ShieldAlert size={32} />
          </div>
          <h4 style={{ fontFamily: 'var(--mono)', textTransform: 'uppercase', fontSize: '1.1rem', marginBottom: '0.8rem' }}>
            Cost vs Accuracy
          </h4>
          <p style={{ fontSize: '0.9rem', lineHeight: '1.6', opacity: 0.85 }}>
            Optimizes the competition score formula by routing simpler mathematical or factual queries locally at zero token cost. Paid cloud model APIs are reserved exclusively for highly complex reasoning tasks.
          </p>
        </motion.div>
      </div>
    </motion.section>
  )
}
