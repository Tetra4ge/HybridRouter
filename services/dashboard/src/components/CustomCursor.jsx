import React, { useEffect } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export default function CustomCursor() {
  const mouseX = useMotionValue(-100)
  const mouseY = useMotionValue(-100)

  const springConfig = { damping: 30, stiffness: 300, mass: 0.6 }
  const cursorX = useSpring(mouseX, springConfig)
  const cursorY = useSpring(mouseY, springConfig)

  useEffect(() => {
    const moveCursor = (e) => {
      mouseX.set(e.clientX - 16)
      mouseY.set(e.clientY - 16)
    }

    window.addEventListener('mousemove', moveCursor)

    return () => {
      window.removeEventListener('mousemove', moveCursor)
    }
  }, [mouseX, mouseY])

  return (
    <>
      <motion.div
        className="custom-cursor-ring"
        style={{
          translateX: cursorX,
          translateY: cursorY,
        }}
      />
      <motion.div
        className="custom-cursor-dot"
        style={{
          translateX: useSpring(mouseX, { damping: 18, stiffness: 450 }),
          translateY: useSpring(mouseY, { damping: 18, stiffness: 450 }),
          x: 12,
          y: 12,
        }}
      />
    </>
  )
}
