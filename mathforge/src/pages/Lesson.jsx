import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getTopic } from '../lib/curriculum/catalog'

export default function Lesson() {
  const { topicId } = useParams()
  const topic = getTopic(topicId)
  const navigate = useNavigate()
  const [stepIdx, setStepIdx] = useState(0)

  const steps = topic?.tutorial?.exampleSteps || []
  const current = steps[stepIdx]

  if (!topic) {
    return (
      <div>
        <p>Topic not found.</p>
        <Link to="/train">Back to train</Link>
      </div>
    )
  }

  return (
    <div>
      <p className="muted">
        <Link to="/train">Train</Link> / {topic.name}
      </p>
      <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
        {topic.icon} {topic.tutorial.title}
      </h1>
      <p className="lead" style={{ maxWidth: '40rem' }}>{topic.tutorial.intro}</p>

      <div className="panel" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <strong>Step-by-step example</strong>
          <span className="muted">
            {stepIdx + 1} / {steps.length}
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={stepIdx}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
            className="step"
            style={{ marginTop: 14 }}
          >
            <h4>{current?.title}</h4>
            <p>{current?.detail}</p>
          </motion.div>
        </AnimatePresence>
        <div className="cta-row" style={{ marginTop: 14 }}>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={stepIdx === 0}
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
          >
            Back
          </button>
          {stepIdx < steps.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={() => setStepIdx((i) => i + 1)}>
              Next step
            </button>
          ) : (
            <button type="button" className="btn btn-accent" onClick={() => navigate(`/practice/${topic.id}`)}>
              Practice this →
            </button>
          )}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Why the shortcuts work</h3>
        <p>{topic.tutorial.whyShortcutsWork}</p>
        <h3 style={{ fontFamily: 'var(--font-display)' }}>Beyond the US classroom</h3>
        <p>{topic.tutorial.international}</p>
      </div>

      <div className="cta-row" style={{ marginTop: 18 }}>
        <button type="button" className="btn btn-primary" onClick={() => navigate(`/practice/${topic.id}`)}>
          Skip to practice
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setStepIdx(0)}>
          Replay example
        </button>
      </div>
    </div>
  )
}
